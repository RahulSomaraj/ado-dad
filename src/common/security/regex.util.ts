/** Escape a user-supplied string so it is treated as a literal inside a RegExp / $regex. */
export function escapeRegExp(input: unknown): string {
  return String(input ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
