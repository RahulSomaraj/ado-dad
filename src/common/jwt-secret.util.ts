/**
 * Central JWT secret resolver.
 * Returns TOKEN_KEY when set. In production a missing TOKEN_KEY is fatal
 * (fail-closed) so the app never signs/verifies tokens with a known fallback.
 * In non-production it returns a clearly-insecure dev value.
 */
export function getJwtSecret(): string {
  const secret = process.env.TOKEN_KEY;
  if (secret && secret.trim().length > 0) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'TOKEN_KEY environment variable is required in production (refusing insecure fallback secret).',
    );
  }
  return 'dev-only-insecure-jwt-secret-do-not-use-in-prod';
}
