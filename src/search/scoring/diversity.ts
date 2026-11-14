/**
 * Page-1 seller diversity: a seller who posted twelve Cretas should not own the
 * whole first page. Rows arrive in score order; at most `perSeller` rows per
 * seller are kept in place, the rest are appended after every other seller's
 * rows, and the page is cut to `limit`.
 *
 * Only page 1 is treated (the adapters fetch `limit + spare` rows for it), so
 * later pages keep a stable offset order.
 */
export function applySellerDiversity<T>(
  rows: T[],
  limit: number,
  perSeller: number,
  sellerOf: (row: T) => string | undefined,
): T[] {
  if (perSeller <= 0 || rows.length <= 1) return rows.slice(0, limit);
  const counts = new Map<string, number>();
  const kept: T[] = [];
  const overflow: T[] = [];
  for (const row of rows) {
    const seller = sellerOf(row);
    if (!seller) {
      kept.push(row);
      continue;
    }
    const n = counts.get(seller) ?? 0;
    if (n < perSeller) {
      counts.set(seller, n + 1);
      kept.push(row);
    } else {
      overflow.push(row);
    }
  }
  return [...kept, ...overflow].slice(0, limit);
}
