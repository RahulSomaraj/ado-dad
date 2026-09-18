import * as dns from 'node:dns';

/**
 * Local-only DNS workaround, shared by `main.ts` and every maintenance script.
 *
 * On some Windows setups Node's bundled c-ares cannot read the system DNS
 * config and falls back to 127.0.0.1, so the `mongodb+srv` lookup dies with
 * `querySrv ECONNREFUSED`. Forcing IPv4 also avoids long stalls on networks
 * that advertise IPv6 but cannot route it.
 *
 * This lived at module scope in `main.ts`, which meant it applied only when
 * `main.ts` was the entry point. Anything bootstrapping `AppModule` directly —
 * every seed, backfill and migration script — got no DNS fix and could not
 * resolve the Atlas SRV record at all. Hence the extraction: one copy, called
 * from both places, so the two can never drift.
 *
 * NEVER runs when NODE_ENV=production. `setServers` is process-wide, so public
 * resolvers would break private names (VPC endpoints, peered Atlas, internal
 * Redis) and would route the SSRF guard's lookups off-network too.
 *
 * Call it before creating the Nest application, not after — the Mongoose
 * connection is opened during module initialisation.
 */
export function applyLocalDnsWorkaround(): void {
  if (process.env.NODE_ENV === 'production') return;

  dns.setDefaultResultOrder('ipv4first');

  // Override the dev defaults with e.g. DNS_SERVERS=1.1.1.1,9.9.9.9
  const dnsServers = (process.env.DNS_SERVERS || '8.8.8.8,1.1.1.1')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (dnsServers.length) {
    dns.setServers(dnsServers);
  }
}
