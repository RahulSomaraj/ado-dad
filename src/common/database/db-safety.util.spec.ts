import {
  DbSafetyError,
  describeTarget,
  guardWrites,
  parseFlags,
  parseMongoUri,
  redactUri,
} from './db-safety.util';

describe('db-safety', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    for (const key of [
      'MONGO_URI',
      'DB_ENVIRONMENT',
      'ALLOW_PROD_WRITE',
      'PROD_DB_HOSTS',
      'PROD_DB_NAMES',
      'NONPROD_DB_HOSTS',
      'NONPROD_DB_NAMES',
    ]) {
      delete process.env[key];
    }
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('redactUri', () => {
    it('removes credentials', () => {
      expect(redactUri('mongodb://admin:hunter2@db.example.com:27017/adodad')).toBe(
        'mongodb://***:***@db.example.com:27017/adodad',
      );
      expect(redactUri('mongodb+srv://u:p@cluster0.abc.mongodb.net/adodad')).toBe(
        'mongodb+srv://***:***@cluster0.abc.mongodb.net/adodad',
      );
    });

    it('leaves a credential-free uri alone', () => {
      expect(redactUri('mongodb://localhost:27017/ado-dad')).toBe(
        'mongodb://localhost:27017/ado-dad',
      );
    });

    it('never leaks a password even for odd input', () => {
      const out = redactUri('mongodb://user:p@ss/word@host:27017/db?x=1');
      expect(out).not.toContain('word');
    });
  });

  describe('parseMongoUri', () => {
    it.each([
      ['mongodb://localhost:27017/ado-dad', 'localhost:27017', 'ado-dad'],
      ['mongodb://u:p@db.internal:27017/adodad_prod', 'db.internal:27017', 'adodad_prod'],
      ['mongodb+srv://u:p@cluster0.abc.mongodb.net/adodad?retryWrites=true', 'cluster0.abc.mongodb.net', 'adodad'],
      ['mongodb://a:27017,b:27017,c:27017/adodad?replicaSet=rs0', 'a:27017', 'adodad'],
      ['mongodb://localhost:27017', 'localhost:27017', ''],
    ])('parses %s', (uri, host, database) => {
      expect(parseMongoUri(uri)).toEqual({ host, database });
    });
  });

  describe('describeTarget', () => {
    it('treats a missing MONGO_URI as production', () => {
      const t = describeTarget();
      expect(t.isProduction).toBe(true);
      expect(t.reason).toMatch(/not set/);
    });

    it('treats an unrecognised host as production (fails safe)', () => {
      const t = describeTarget('mongodb://u:p@10.2.3.4:27017/adodad');
      expect(t.isProduction).toBe(true);
      expect(t.reason).toMatch(/could not be identified/);
    });

    it('honours an explicit DB_ENVIRONMENT above every heuristic', () => {
      process.env.DB_ENVIRONMENT = 'uat';
      // Name says prod; the explicit declaration still wins.
      const t = describeTarget('mongodb://u:p@prod-db.internal:27017/adodad_prod');
      expect(t.environment).toBe('uat');
      expect(t.isProduction).toBe(false);
    });

    it('treats a malformed DB_ENVIRONMENT as production', () => {
      process.env.DB_ENVIRONMENT = 'probably-fine';
      const t = describeTarget('mongodb://localhost:27017/ado-dad');
      expect(t.isProduction).toBe(true);
    });

    it('detects prod markers in the host or database name', () => {
      expect(describeTarget('mongodb://u:p@prod-db:27017/adodad').isProduction).toBe(true);
      expect(describeTarget('mongodb://u:p@db:27017/adodad_production').isProduction).toBe(true);
      expect(describeTarget('mongodb://u:p@live-db:27017/adodad').isProduction).toBe(true);
    });

    it('classifies the real AdoDad Atlas cluster as production', () => {
      // Regression: this is the host the checkout actually points at. It must be
      // caught by the "production" marker even with DB_ENVIRONMENT unset,
      // because "production-cluster" is followed by "." not a word boundary.
      const t = describeTarget(
        'mongodb+srv://u:p@production-cluster.xhgfz.mongodb.net/ado-dad?retryWrites=true&w=majority',
      );
      expect(t.isProduction).toBe(true);
      expect(t.reason).toMatch(/contains "prod"/);
      expect(t.database).toBe('ado-dad');
      expect(t.host).toBe('production-cluster.xhgfz.mongodb.net');
    });

    it('treats a remote database named "test" as production, not as a test database', () => {
      // Regression: AdoDad's production ads live in a database called `test`,
      // because the URI omits a database and Mongoose defaults to that name.
      // A neutral host must NOT make that look safe.
      const t = describeTarget('mongodb+srv://u:p@cluster0.abc.mongodb.net/test');
      expect(t.isProduction).toBe(true);
      expect(t.reason).toMatch(/Mongoose/);
    });

    it('still allows a local database named "test"', () => {
      // The localhost check runs first, so ordinary local development is
      // unaffected by the rule above.
      const t = describeTarget('mongodb://localhost:27017/test');
      expect(t.environment).toBe('local');
      expect(t.isProduction).toBe(false);
    });

    it('recognises non-production markers', () => {
      expect(describeTarget('mongodb://u:p@uat-db:27017/adodad').environment).toBe('uat');
      expect(describeTarget('mongodb://u:p@db:27017/adodad_staging').environment).toBe('uat');
    });

    it('recognises localhost as local', () => {
      expect(describeTarget('mongodb://localhost:27017/ado-dad').environment).toBe('local');
      expect(describeTarget('mongodb://127.0.0.1:27017/ado-dad').environment).toBe('local');
    });

    it('honours the operator allow-lists', () => {
      process.env.PROD_DB_HOSTS = 'db.internal:27017';
      expect(describeTarget('mongodb://u:p@db.internal:27017/adodad').isProduction).toBe(true);

      delete process.env.PROD_DB_HOSTS;
      process.env.NONPROD_DB_NAMES = 'adodad_scratch';
      expect(describeTarget('mongodb://u:p@10.0.0.9:27017/adodad_scratch').isProduction).toBe(false);
    });
  });

  describe('guardWrites', () => {
    const prod = () => describeTarget('mongodb://u:p@prod-db:27017/adodad_prod');
    const uat = () => describeTarget('mongodb://u:p@uat-db:27017/adodad_uat');

    it('defaults to a dry run even on a safe target', () => {
      const r = guardWrites({ script: 'x', apply: false, target: uat() });
      expect(r.writesEnabled).toBe(false);
    });

    it('allows --apply on a non-production target with no ceremony', () => {
      const r = guardWrites({ script: 'x', apply: true, target: uat() });
      expect(r.writesEnabled).toBe(true);
    });

    it('never writes to prod without all three keys', () => {
      // none
      expect(() => guardWrites({ script: 'x', apply: true, target: prod() })).toThrow(DbSafetyError);

      // env var only
      process.env.ALLOW_PROD_WRITE = 'yes';
      expect(() => guardWrites({ script: 'x', apply: true, target: prod() })).toThrow(DbSafetyError);

      // env var + flag, wrong confirm
      expect(() =>
        guardWrites({
          script: 'x',
          apply: true,
          prodFlag: true,
          confirm: 'adodad',
          target: prod(),
        }),
      ).toThrow(DbSafetyError);

      // all three correct
      const r = guardWrites({
        script: 'x',
        apply: true,
        prodFlag: true,
        confirm: 'adodad_prod',
        target: prod(),
      });
      expect(r.writesEnabled).toBe(true);
    });

    it('names exactly what is missing', () => {
      try {
        guardWrites({ script: 'seed', apply: true, target: prod() });
        fail('should have thrown');
      } catch (err) {
        const msg = (err as Error).message;
        expect(msg).toContain('ALLOW_PROD_WRITE=yes');
        expect(msg).toContain('--prod');
        expect(msg).toContain('--confirm adodad_prod');
      }
    });

    it('blocks a prod-forbidden script whatever the flags', () => {
      process.env.ALLOW_PROD_WRITE = 'yes';
      expect(() =>
        guardWrites({
          script: 'fixture-loader',
          apply: true,
          prodFlag: true,
          confirm: 'adodad_prod',
          allowProduction: false,
          target: prod(),
        }),
      ).toThrow(/must never run against production/);
    });

    it('blocks a prod-forbidden script even in dry-run mode', () => {
      expect(() =>
        guardWrites({
          script: 'fixture-loader',
          apply: false,
          allowProduction: false,
          target: prod(),
        }),
      ).toThrow(/must never run against production/);
    });

    it('does not leak credentials in the error message', () => {
      const target = describeTarget('mongodb://admin:hunter2@prod-db:27017/adodad_prod');
      try {
        guardWrites({ script: 'x', apply: true, target });
        fail('should have thrown');
      } catch (err) {
        expect((err as Error).message).not.toContain('hunter2');
      }
    });
  });

  describe('parseFlags', () => {
    it('parses flags, key/value pairs and = form', () => {
      const f = parseFlags(['--apply', '--confirm', 'adodad_prod', '--batch=500', 'extra']);
      expect(f.apply).toBe(true);
      expect(f.confirm).toBe('adodad_prod');
      expect(f.values.batch).toBe('500');
      expect(f.positional).toEqual(['extra']);
    });

    it('tolerates the bare -- that npm run inserts', () => {
      const f = parseFlags(['--', '--apply', '--prod']);
      expect(f.apply).toBe(true);
      expect(f.prodFlag).toBe(true);
    });

    it('defaults to a dry run when no flags are given', () => {
      const f = parseFlags([]);
      expect(f.apply).toBe(false);
      expect(f.prodFlag).toBe(false);
      expect(f.confirm).toBeUndefined();
    });

    it('does not treat a following flag as a value', () => {
      const f = parseFlags(['--confirm', '--apply']);
      expect(f.confirm).toBeUndefined();
      expect(f.apply).toBe(true);
    });
  });
});
