// "This machine only" checks, for an API with no auth by design.

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
