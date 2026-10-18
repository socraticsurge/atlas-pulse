import dns from 'node:dns/promises';
import dnsCallback from 'node:dns';
import net from 'node:net';
import { Agent } from 'undici';

/**
 * SSRF guard. Feed/discovery/extraction endpoints fetch user-supplied URLs
 * server-side, so we must refuse to reach loopback, private, link-local, or
 * cloud-metadata addresses — otherwise a crafted URL turns the server into a
 * proxy into the host's own network.
 *
 * Three checks, all in safeFetch:
 * 1. Before the request: only http(s), and every address the host resolves
 *    to must be public (clear errors for the common cases).
 * 2. At connect time: the request's own DNS lookup goes through
 *    guardedLookup, which refuses private addresses. Without this, a hostile
 *    DNS server could answer "public" for check 1 and "127.0.0.1" a moment
 *    later for the real connection (DNS rebinding).
 * 3. Every redirect hop is followed manually and re-checked.
 * Parsing libraries (rss-parser, @extractus) only receive text fetched here.
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
  ['224.0.0.0', 4],     // multicast
  ['240.0.0.0', 4],     // reserved, incl. 255.255.255.255 broadcast
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
  if (addr.startsWith('ff')) return true;            // multicast
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

function parseHttpUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('Invalid URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Blocked URL scheme: ${url.protocol}`);
  }
  return url;
}

// Addresses the host resolves to; a literal IP resolves to itself (no DNS).
async function resolveHost(rawHost) {
  const host = rawHost.replace(/^\[(.*)\]$/, '$1'); // URL keeps IPv6 literals in brackets
  if (net.isIP(host)) return [host];
  let records;
  try {
    records = await dns.lookup(host, { all: true });
  } catch {
    throw new Error(`Could not resolve host: ${host}`);
  }
  if (records.length === 0) throw new Error(`Could not resolve host: ${host}`);
  return records.map((r) => r.address);
}

/**
 * Throw if the URL is not a safe, public http(s) target.
 * Returns the parsed URL on success.
 */
export async function assertPublicHttpUrl(rawUrl) {
  const url = parseHttpUrl(rawUrl);
  const addresses = await resolveHost(url.hostname);
  if (addresses.some(isBlockedIp)) throw new Error(BLOCKED_MESSAGE);
  return url;
}

const BLOCKED_MESSAGE = 'Blocked private or loopback address';

/**
 * dns.lookup for outgoing connections that refuses private addresses, so the
 * address actually connected to is the one that was checked (no rebinding
 * between the check and the connection).
 */
export function guardedLookup(hostname, options, callback) {
  dnsCallback.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err);
    if (addresses.length === 0) return callback(new Error(`Could not resolve host: ${hostname}`));
    if (addresses.some((a) => isBlockedIp(a.address))) return callback(Object.assign(new Error(BLOCKED_MESSAGE), { code: 'EBLOCKED' }));
    if (options.all) return callback(null, addresses);
    return callback(null, addresses[0].address, addresses[0].family);
  });
}

// The connection pool for guarded fetches: every connect resolves through guardedLookup.
const guardedAgent = new Agent({ connect: { lookup: guardedLookup } });

const MAX_REDIRECTS = 5;

/**
 * SSRF-safe fetch. Validates the initial URL, connects only through
 * guardedLookup (no DNS rebinding), and re-validates the target of every
 * redirect hop, so a public URL cannot 3xx-redirect the server into a
 * loopback/private/metadata address. Redirects are followed manually
 * (redirect: 'manual') precisely so each Location can be checked first.
 */
export async function safeFetch(rawUrl, options = {}) {
  let current = (await assertPublicHttpUrl(rawUrl)).href;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(current, { ...options, redirect: 'manual', dispatcher: guardedAgent });
    const isRedirect = res.status >= 300 && res.status < 400 && res.headers.has('location');
    if (!isRedirect) return res;
    const next = new URL(res.headers.get('location'), current).href;
    await assertPublicHttpUrl(next); // re-validate before following
    current = next;
  }
  throw new Error('Too many redirects');
}
