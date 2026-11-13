/**
 * Environment validation, run once at bootstrap via ConfigModule's `validate`.
 * Fails fast on a broken deploy instead of failing at first request.
 *
 * Deliberately conservative: hard-requires only what production already
 * cannot run without (MONGO_URI, TOKEN_KEY — the refresh strategy already
 * throws without the latter), and checks that numeric knobs parse. CORS_ORIGINS
 * enforcement for production lives in main.ts and is not duplicated here.
 */
export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const errors: string[] = [];
  const isProd = config.NODE_ENV === 'production';

  if (isProd) {
    for (const key of ['MONGO_URI', 'TOKEN_KEY']) {
      if (!config[key]) {
        errors.push(`${key} is required in production`);
      }
    }
  }

  for (const key of ['PORT', 'REDIS_PORT', 'REDIS_DB', 'TRUST_PROXY_HOPS']) {
    const value = config[key];
    if (value !== undefined && value !== '' && Number.isNaN(Number(value))) {
      errors.push(`${key} must be a number, got "${value}"`);
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed:\n- ${errors.join('\n- ')}`,
    );
  }
  return config;
}
