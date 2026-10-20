// "This machine only" checks, for an API with no auth by design.
import net from 'node:net';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/** True for loopback names; *.localhost names always resolve to loopback (RFC 6761). */
export function isLocalHostname(hostname) {
  return LOOPBACK_HOSTS.has(hostname) || hostname.endsWith('.localhost');
}

/** The origin ("http://localhost:5173") when it is http(s) on this machine, else null. */
export function localOrigin(value) {
  try {
    const url = new URL(value);
    const ok = ['http:', 'https:'].includes(url.protocol) && isLocalHostname(url.hostname);
    return ok ? url.origin : null;
  } catch {
    return null;
  }
}

// What a Host header may hold: a name or an IP (IPv6 in brackets), and a port.
const HOST_HEADER = /^[a-z0-9._\-[\]:]+$/i;

/** The hostname in a Host header ("localhost:3001" → "localhost", "[::1]:3001" → "[::1]"), or null. */
export function hostHeaderName(value) {
  if (typeof value !== 'string' || !HOST_HEADER.test(value)) return null;
  try {
    return new URL(`http://${value}`).hostname;
  } catch {
    return null;
  }
}

const isIpLiteral = (hostname) => net.isIP(hostname.replace(/^\[(.*)\]$/, '$1')) !== 0;

/**
 * Whether to serve a request with this Host header. A page on another site
 * can point its own name at 127.0.0.1 (DNS rebinding) and then call the API
 * as "same-origin", with no Origin header; its Host still names that site.
 * So only local names, IP addresses (no DNS involved) and `boundHost`, the
 * HOST the server was started with, are accepted.
 */
export function hostAllowed(hostHeader, boundHost) {
  const name = hostHeaderName(hostHeader);
  if (!name) return false;
  return isLocalHostname(name) || isIpLiteral(name) || name === hostHeaderName(boundHost);
}

/** Whether a request's Origin may use the API: none (not a cross-site browser request), or a page on this machine. */
export const originAllowed = (origin) => !origin || localOrigin(origin) !== null;

/** Express middleware: 403 unless the request is addressed to this machine from this machine (hostAllowed, originAllowed). */
export function localOnly(boundHost) {
  return (req, res, next) => {
    if (!hostAllowed(req.headers.host, boundHost)) return res.status(403).json({ error: 'Host not allowed' });
    if (!originAllowed(req.headers.origin)) return res.status(403).json({ error: 'Origin not allowed' });
    return next();
  };
}
