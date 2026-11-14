import { BadRequestException } from '@nestjs/common';
import { lookup } from 'dns';
import { isIP } from 'net';
import { promisify } from 'util';

const dnsLookup = promisify(lookup);

function isPrivateIp(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const o = ip.split('.').map(Number);
    if (o[0] === 0 || o[0] === 10 || o[0] === 127) return true;
    if (o[0] === 169 && o[1] === 254) return true; // link-local + cloud metadata
    if (o[0] === 172 && o[1] >= 16 && o[1] <= 31) return true;
    if (o[0] === 192 && o[1] === 168) return true;
    if (o[0] === 100 && o[1] >= 64 && o[1] <= 127) return true; // CGNAT
    return false;
  }
  const lower = ip.toLowerCase();
  if (lower.startsWith('::ffff:')) return isPrivateIp(lower.slice(7));
  return (
    lower === '::1' ||
    lower === '::' ||
    lower.startsWith('fc') ||
    lower.startsWith('fd') ||
    lower.startsWith('fe80')
  );
}

/**
 * Validate a user-supplied URL before the server fetches it (SSRF guard).
 * - http/https only
 * - optional host allow-list via MEDIA_URL_ALLOWED_HOSTS (comma list of suffixes)
 * - resolves DNS and rejects private / loopback / link-local / metadata ranges
 */
export async function assertSafePublicUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new BadRequestException('Invalid URL');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new BadRequestException('Only http(s) URLs are allowed');
  }
  const host = url.hostname.toLowerCase();

  const allow = (process.env.MEDIA_URL_ALLOWED_HOSTS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (allow.length && !allow.some((a) => host === a || host.endsWith('.' + a))) {
    throw new BadRequestException('URL host is not allowed');
  }

  if (isIP(host)) {
    if (isPrivateIp(host)) {
      throw new BadRequestException('URL resolves to a private address');
    }
    return url;
  }
  let addrs: { address: string }[];
  try {
    addrs = await dnsLookup(host, { all: true });
  } catch {
    throw new BadRequestException('URL host cannot be resolved');
  }
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) {
    throw new BadRequestException('URL resolves to a private address');
  }
  return url;
}
