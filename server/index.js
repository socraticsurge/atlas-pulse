import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import feedsRouter from './routes/feeds.js';
import discoverRouter from './routes/discover.js';
import articlesRouter from './routes/articles.js';
import aiRouter from './routes/ai.js';
import summariesRouter from './routes/summaries.js';
import highlightsRouter from './routes/highlights.js';
import studioRouter from './routes/studio.js';
import { isLocalHostname } from './utils/loopback.js';
import ollamaRouter from './routes/ollama.js';
import readerRouter from './routes/reader.js';
import settingsRouter from './routes/settings.js';
import faviconRouter from './routes/favicon.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;
// Bind to loopback by default so the no-auth API is not exposed to the LAN.
// Override with HOST=0.0.0.0 only if you deliberately want network access.
const HOST = process.env.HOST || '127.0.0.1';

// This API has no auth by design (local, single-user). A wildcard CORS policy
// would let any website the user visits read/delete their data cross-origin,
// so only same-machine origins are allowed.
app.use(cors({
  origin(origin, callback) {
    // Allow non-browser clients (curl, same-origin server calls) with no Origin.
    if (!origin) return callback(null, true);
    try {
      if (isLocalHostname(new URL(origin).hostname)) return callback(null, true);
    } catch { /* fall through to rejection */ }
    return callback(new Error('Not allowed by CORS'));
  },
}));
// Feed refreshes post whole articles; the client sends them in ~1 MB chunks,
// and this route allows more so a single very long article still fits.
app.use('/api/reader/articles/bulk-insert', express.json({ limit: '8mb' }));
app.use(express.json({ limit: '2mb' }));
// Express 5 leaves req.body undefined when a request has no JSON body; routes
// destructure it, so give them an empty object instead of a TypeError.
app.use((req, res, next) => { req.body ??= {}; next(); });

// Routes
app.use('/api/feeds', feedsRouter);
app.use('/api/discover', discoverRouter);
app.use('/api/articles', articlesRouter);
app.use('/api/ai', aiRouter);
app.use('/api/summaries', summariesRouter);
app.use('/api/highlights', highlightsRouter);
app.use('/api/studio', studioRouter);
app.use('/api/ollama', ollamaRouter);
app.use('/api/reader', readerRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/favicon', faviconRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve the built frontend (npm run build) so one process hosts the whole app.
const DIST_DIR = join(dirname(fileURLToPath(import.meta.url)), '../dist');
if (existsSync(join(DIST_DIR, 'index.html'))) {
  // Generous cap — a single user loading the app never comes close — that
  // stops a runaway client from hammering the filesystem.
  const staticLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 600,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(staticLimiter, express.static(DIST_DIR));
  app.get(/^(?!\/api\/).*/, staticLimiter, (req, res) => res.sendFile(join(DIST_DIR, 'index.html')));
}

// Errors that escape a route (bad JSON, a body over the limit, anything
// thrown) come back as JSON with the right status, never an HTML stack trace.
// eslint-disable-next-line no-unused-vars -- Express needs all four arguments
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: status === 500 ? 'Internal server error' : err.message });
});

// Workaround for Node event loop exit issue
setInterval(() => {}, 1000000);

app.listen(PORT, HOST, () => {
  console.log(`🚀 RSS Feed Reader API running on http://${HOST}:${PORT}`);
});
