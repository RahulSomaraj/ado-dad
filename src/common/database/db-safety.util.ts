/**
 * Database write fuse for maintenance scripts.
 *
 * Context: the same checkout is routinely pointed at production (`.env`,
 * `.env.prod`, `.env.uat` all live side by side), so "which database am I about
 * to write to" is decided by whichever file was last copied over `.env`. That is
 * far too easy to get wrong, and a seed or backfill script does not announce its
 * target before it starts writing.
 *
 * Design rules, in order of importance:
 *
 *  1. **Unknown means production.** If the environment cannot be positively
 *     identified as local or UAT, it is treated as production. A guard that
 *     fails open is not a guard.
 *  2. **Dry run is the default.** Writing requires `--apply` every time.
 *  3. **Production needs three independent keys**, so no single slip is enough:
 *     the `ALLOW_PROD_WRITE=yes` environment variable, a `--prod` flag, and
 *     `--confirm <database-name>` typed to match the actual target database.
 *  4. **Nothing is inferred from the script's own opinion of itself.** A script
 *     that must never touch production declares that, and the fuse enforces it.
 *
 * No credentials are ever logged: the URI is redacted before it leaves here.
 */

export type DbEnvironment = 'local' | 'uat' | 'staging' | 'production';

export interface ConnectionTarget {
  /** Credential-free URI, safe to print. */
  redactedUri: string;
  host: string;
  database: string;
  environment: DbEnvironment;
  /** Why the environment was classified this way — printed in the banner. */
  reason: string;
  isProduction: boolean;
}

export class DbSafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DbSafetyError';
  }
}

const LOCAL_HOST_PATTERN = /^(localhost|127\.0\.0\.1|::1|host\.docker\.internal|mongo|mongodb)(:|$)/i;

/**
 * Split a URI into the part that may contain credentials and the query string.
 *
 * Credentials are supposed to be percent-encoded, but a password that smuggles
 * in a literal `@` or `/` must not defeat redaction, so matching is greedy up to
 * the LAST `@` before the query string. Over-redacting is acceptable here;
 * under-redacting prints a production password into a terminal and a log file.
 */
function splitUri(uri: string): { base: string; query: string } {
  const raw = String(uri ?? '');
  const q = raw.indexOf('?');
  return q < 0 ? { base: raw, query: '' } : { base: raw.slice(0, q), query: raw.slice(q) };
}

/** Strip credentials from a Mongo URI so it can be printed. */
export function redactUri(uri: string): string {
  const { base, query } = splitUri(uri);
  return base.replace(/(\/\/).*@/, '$1***:***@') + query;
}

/**
 * Pull host and database out of a Mongo URI without requiring a driver.
 * Handles mongodb:// and mongodb+srv://, comma-separated replica set hosts,
 * an optional auth database in the query string, and a missing path.
 */
export function parseMongoUri(uri: string): { host: string; database: string } {
  const { base } = splitUri(String(uri ?? '').trim());
  const withoutScheme = base.replace(/^mongodb(\+srv)?:\/\//i, '');
  // Greedy to the last `@`, for the same reason redactUri is greedy.
  const withoutCreds = withoutScheme.replace(/^.*@/, '');

  const [hostPart, ...rest] = withoutCreds.split('/');
  const database = rest.join('/').trim();

  // A replica set lists several hosts; the first identifies the cluster well
  // enough for classification and for the banner.
  const host = (hostPart.split(',')[0] ?? '').trim();

  return { host, database };
}

function csvEnv(name: string): string[] {
  return (process.env[name] ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Classify the connection. Explicit configuration always beats guessing, and
 * guessing always lands on 'production' when it is not sure.
 */
export function describeTarget(rawUri?: string): ConnectionTarget {
  const uri = rawUri ?? process.env.MONGO_URI ?? '';
  const { host, database } = parseMongoUri(uri);
  const redactedUri = redactUri(uri);
  const hostLower = host.toLowerCase();
  const dbLower = database.toLowerCase();

  const build = (environment: DbEnvironment, reason: string): ConnectionTarget => ({
    redactedUri,
    host,
    database,
    environment,
    reason,
    isProduction: environment === 'production',
  });

  if (!uri) {
    return build('production', 'MONGO_URI is not set — refusing to assume a safe target');
  }

  // 1. Explicit declaration wins. Set DB_ENVIRONMENT in each .env file.
  const declared = (process.env.DB_ENVIRONMENT ?? '').trim().toLowerCase();
  if (declared) {
    if (['local', 'uat', 'staging', 'production'].includes(declared)) {
      return build(declared as DbEnvironment, `DB_ENVIRONMENT=${declared}`);
    }
    return build(
      'production',
      `DB_ENVIRONMENT="${declared}" is not a recognised value — treating as production`,
    );
  }

  // 2. Operator-supplied allow-lists, for hosts that carry no obvious marker.
  if (csvEnv('PROD_DB_HOSTS').includes(hostLower) || csvEnv('PROD_DB_NAMES').includes(dbLower)) {
    return build('production', 'matched PROD_DB_HOSTS / PROD_DB_NAMES');
  }
  if (csvEnv('NONPROD_DB_HOSTS').includes(hostLower) || csvEnv('NONPROD_DB_NAMES').includes(dbLower)) {
    return build('uat', 'matched NONPROD_DB_HOSTS / NONPROD_DB_NAMES');
  }

  // 3. Obvious name markers.
  //
  // `\b` is wrong here: `_` is a word character, so `\bstaging\b` does not match
  // inside "adodad_staging" — which silently broke non-production detection and
  // sent every underscore-named UAT database down the production path. Treat any
  // non-alphanumeric character (or a string edge) as the boundary instead.
  const marker = (words: string) =>
    new RegExp(`(?:^|[^a-z0-9])(?:${words})(?:[^a-z0-9]|$)`);
  const haystack = `${hostLower} ${dbLower}`;

  if (marker('prod|production|live').test(haystack)) {
    return build('production', 'host or database name contains "prod"/"live"');
  }

  // 4. A local host is genuinely local whatever the database is called. This is
  //    checked BEFORE the remaining name markers so a local database named
  //    "test" is not caught by rule 6 below.
  if (LOCAL_HOST_PATTERN.test(hostLower)) {
    return build('local', 'host is localhost/docker-internal');
  }

  // 5. Non-production markers.
  //
  //    "test" is deliberately NOT in this list. Mongoose connects to a database
  //    called `test` whenever the URI omits one, so the name means "nobody
  //    specified a database" far more often than it means "this is a test
  //    database" — and on this very cluster it is where production lives. A
  //    marker that fires on an accident is worse than no marker.
  if (marker('uat|staging|stage|qa|dev|sandbox|scratch').test(haystack)) {
    return build('uat', 'host or database name contains a non-production marker');
  }

  // 6. A remote database literally named "test" is an unspecified database, not
  //    a safe one.
  if (dbLower === 'test') {
    return build(
      'production',
      'database is "test" — Mongoose\'s default when the URI omits a database name, ' +
        'so the target is unknown; set DB_ENVIRONMENT or name the database in MONGO_URI',
    );
  }

  // 7. Fail safe.
  return build(
    'production',
    'environment could not be identified — defaulting to production (set DB_ENVIRONMENT to fix)',
  );
}

/**
 * Patch in the database name taken from the live connection.
 *
 * A `mongodb+srv://.../?retryWrites=true` URI carries no database in its path —
 * the driver resolves it from the connection's default. The URI parse therefore
 * yields an empty name, which would make `--confirm <database>` impossible to
 * satisfy and leaves the banner ambiguous about what is about to be written.
 *
 * Classification is NOT recomputed: a target already judged production stays
 * production. This only fills in the label.
 */
export function withResolvedDatabase(
  target: ConnectionTarget,
  databaseName: string | undefined | null,
): ConnectionTarget {
  const name = (databaseName ?? '').trim();
  if (!name || target.database) return target;
  return {
    ...target,
    database: name,
    reason: `${target.reason}; database "${name}" resolved from the live connection`,
  };
}

export interface GuardOptions {
  /** Script name, for the banner and error messages. */
  script: string;
  /** True when the operator passed --apply. Without it nothing may be written. */
  apply: boolean;
  /** Value of --confirm, which must equal the target database name on prod. */
  confirm?: string;
  /** True when the operator passed --prod. */
  prodFlag?: boolean;
  /**
   * Set false on scripts that must NEVER run against production, whatever flags
   * are passed (destructive rebuilds, fixture loaders).
   */
  allowProduction?: boolean;
  /** Inject a target in tests. */
  target?: ConnectionTarget;
}

export interface GuardResult {
  target: ConnectionTarget;
  /** True when writes are permitted. False means dry run. */
  writesEnabled: boolean;
}

/**
 * Decide whether this invocation may write. Throws rather than returning false
 * when the operator clearly *intended* to write but has not cleared the bar —
 * silently downgrading to a dry run would be its own kind of surprise.
 */
export function guardWrites(options: GuardOptions): GuardResult {
  const target = options.target ?? describeTarget();
  const { script, apply, confirm, prodFlag, allowProduction = true } = options;

  if (target.isProduction && allowProduction === false) {
    throw new DbSafetyError(
      `${script} must never run against production.\n` +
        `  target      : ${target.host}/${target.database}\n` +
        `  classified  : ${target.reason}\n` +
        `Point MONGO_URI at UAT or a local restore and try again.`,
    );
  }

  if (!apply) {
    return { target, writesEnabled: false };
  }

  if (!target.isProduction) {
    return { target, writesEnabled: true };
  }

  const missing: string[] = [];
  if ((process.env.ALLOW_PROD_WRITE ?? '').toLowerCase() !== 'yes') {
    missing.push('ALLOW_PROD_WRITE=yes in the environment');
  }
  if (!prodFlag) {
    missing.push('the --prod flag');
  }
  if (!confirm || confirm !== target.database) {
    missing.push(`--confirm ${target.database || '<database-name>'} (exact database name)`);
  }

  if (missing.length > 0) {
    throw new DbSafetyError(
      `${script} refused to write to PRODUCTION.\n` +
        `  target      : ${target.host}/${target.database}\n` +
        `  classified  : ${target.reason}\n` +
        `  missing     : ${missing.join('\n                ')}\n` +
        `\nIf this is genuinely intended, take a backup first, then re-run with all three.`,
    );
  }

  return { target, writesEnabled: true };
}

/** Human-readable banner. Print it before doing anything, every time. */
export function formatBanner(script: string, result: GuardResult): string {
  const { target, writesEnabled } = result;
  const mode = writesEnabled ? 'APPLY (writes enabled)' : 'DRY RUN (no writes)';
  const marker = target.isProduction ? '  *** PRODUCTION ***' : '';
  return [
    '',
    '='.repeat(72),
    `  script      : ${script}`,
    `  target      : ${target.host}/${target.database}${marker}`,
    `  environment : ${target.environment}  (${target.reason})`,
    `  mode        : ${mode}`,
    '='.repeat(72),
    '',
  ].join('\n');
}

export interface ParsedFlags {
  apply: boolean;
  prodFlag: boolean;
  confirm?: string;
  values: Record<string, string | boolean>;
  positional: string[];
}

/**
 * Minimal flag parsing shared by the maintenance scripts. Supports
 * `--flag`, `--key value` and `--key=value`. Deliberately not a dependency.
 */
export function parseFlags(argv: string[] = process.argv.slice(2)): ParsedFlags {
  const values: Record<string, string | boolean> = {};
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    // `npm run x -- --flag` can leave a bare `--` in argv.
    if (arg === '--') continue;
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    const body = arg.slice(2);
    const eq = body.indexOf('=');
    if (eq >= 0) {
      values[body.slice(0, eq)] = body.slice(eq + 1);
      continue;
    }
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      values[body] = next;
      i++;
    } else {
      values[body] = true;
    }
  }

  return {
    apply: values.apply === true || values.apply === 'true',
    prodFlag: values.prod === true || values.prod === 'true',
    confirm: typeof values.confirm === 'string' ? values.confirm : undefined,
    values,
    positional,
  };
}
