// What the server prints when it starts, and what it says when it can't.

// Under `npm run dev`, Vite serves the app on this port (strictPort in vite.config.js).
export const VITE_PORT = 5173;

const LOOPBACK_OR_ANY = ['127.0.0.1', '::1', '0.0.0.0', '::'];

/** The address to open in a browser for a server on host:port. */
export function appUrl(host, port) {
  return `http://${LOOPBACK_OR_ANY.includes(host) ? 'localhost' : host}:${port}`;
}

/**
 * The line printed once the server listens. dev: started by `npm run dev`, so
 * Vite serves the app; built: this server serves dist/.
 */
export function readyMessage({ url, dev, built }) {
  if (dev) return `Atlas Pulse API is up on ${url}. Open the app at http://localhost:${VITE_PORT}`;
  if (built) return `Atlas Pulse is running. Open ${url}`;
  return `Atlas Pulse API is up on ${url}, but there is no built app to serve. Use npm start (builds it) or npm run dev.`;
}

/** Why the server couldn't listen on `port`, and what to do about it. */
export function listenFailure(err, port) {
  if (err.code === 'EADDRINUSE') {
    return `Port ${port} is already in use, so Atlas Pulse can't start.\n`
      + `Quit whatever is using it (lsof -i :${port} shows what), or use another port, for example: PORT=${port + 1} npm run dev`;
  }
  if (err.code === 'EACCES') return `Atlas Pulse isn't allowed to use port ${port}. Use another port, for example: PORT=3002 npm run dev`;
  return `Atlas Pulse couldn't start: ${err.message}`;
}
