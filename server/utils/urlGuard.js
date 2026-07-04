import dns from 'node:dns/promises';
import net from 'node:net';

/**
 * SSRF guard. Feed/discovery/extraction endpoints fetch user-supplied URLs
 * server-side, so we must refuse to reach loopback, private, link-local, or
 * cloud-metadata addresses — otherwise a crafted URL turns the server into a
 * proxy into the host's own network.
 *
 * Validation happens before the fetch: only http(s) is allowed, the hostname
 * is DNS-resolved, and every resolved IP is checked against the blocked ranges
 * (so DNS-rebinding to a public name that resolves to 127.0.0.1 is caught).
 *
 * Caveat: rss-parser and @extractus perform their own fetches, so a redirect
 * to a private host after this initial check is not re-validated for those two
 * paths. This blocks the primary direct-URL vector; a fully redirect-safe
 * fetch would require replacing those libraries' internal fetching.
 */

function ipv4ToInt(ip) {
  return ip.split('.').reduce((acc, oct) => (acc << 8) + Number(oct), 0) >>> 0;
}

function inCidr(ipInt, base, maskBits) {
  const mask = maskBits === 0 ? 0 : (0xffffffff << (32 - maskBits)) >>> 0;
  return (ipInt & mask) === (ipv4ToInt(base) & mask);
}

const BLOCKED_V4 = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],   // CGNAT
  ['127.0.0.0', 8],     // loopback
  ['169.254.0.0', 16],  // link-local (incl. 169.254.169.254 metadata)
  ['172.16.0.0', 12],   // private
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],  // private
  ['198.18.0.0', 15],   // benchmarking
];

function isBlockedIpv4(ip) {
  const int = ipv4ToInt(ip);
  return BLOCKED_V4.some(([base, bits]) => inCidr(int, base, bits));
}

function isBlockedIpv6(ip) {
  const addr = ip.toLowerCase().split('%')[0]; // strip zone id
  if (addr === '::1' || addr === '::') return true;
  if (addr.startsWith('fe80')) return true;          // link-local
  if (addr.startsWith('fc') || addr.startsWith('fd')) return true; // unique-local fc00::/7
  // IPv4-mapped (::ffff:a.b.c.d) — check the embedded v4 address
  const mapped = addr.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedIpv4(mapped[1]);
  return false;
}

function isBlockedIp(ip) {
  const kind = net.isIP(ip);
  if (kind === 4) return isBlockedIpv4(ip);
  if (kind === 6) return isBlockedIpv6(ip);
  return true; // not a recognizable IP — refuse
}

/**
 * Throw if the URL is not a safe, public http(s) target.
 * Returns the parsed URL on success.
 */
export async function assertPublicHttpUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('Invalid URL');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Blocked URL scheme: ${url.protocol}`);
  }

  const host = url.hostname;

  // Literal IP in the URL — check directly, no DNS.
  if (net.isIP(host)) {
    if (isBlockedIp(host)) throw new Error('Blocked private or loopback address');
    return url;
  }

  // Hostname — resolve and check every returned address.
  let records;
  try {
    records = await dns.lookup(host, { all: true });
  } catch {
    throw new Error(`Could not resolve host: ${host}`);
  }
  if (records.length === 0) throw new Error(`Could not resolve host: ${host}`);
  for (const { address } of records) {
    if (isBlockedIp(address)) {
      throw new Error('Blocked private or loopback address');
    }
  }

  return url;
}

const MAX_REDIRECTS = 5;

/**
 * SSRF-safe fetch. Validates the initial URL and re-validates the target of
 * every redirect hop, so a public URL cannot 3xx-redirect the server into a
 * loopback/private/metadata address. Redirects are followed manually
 * (redirect: 'manual') precisely so each Location can be checked first.
 */
export async function safeFetch(rawUrl, options = {}) {
  let current = (await assertPublicHttpUrl(rawUrl)).href;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(current, { ...options, redirect: 'manual' });
    const isRedirect = res.status >= 300 && res.status < 400 && res.headers.has('location');
    if (!isRedirect) return res;
    const next = new URL(res.headers.get('location'), current).href;
    await assertPublicHttpUrl(next); // re-validate before following
    current = next;
  }
  throw new Error('Too many redirects');
}
