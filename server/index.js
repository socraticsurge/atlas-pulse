import express from 'express';
import cors from 'cors';
import feedsRouter from './routes/feeds.js';
import discoverRouter from './routes/discover.js';
import articlesRouter from './routes/articles.js';
import aiRouter from './routes/ai.js';
import summariesRouter from './routes/summaries.js';
import highlightsRouter from './routes/highlights.js';
import ollamaRouter from './routes/ollama.js';
import readerRouter from './routes/reader.js';

const app = express();
const PORT = 3001;
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
      const { hostname } = new URL(origin);
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
        return callback(null, true);
      }
    } catch { /* fall through to rejection */ }
    return callback(new Error('Not allowed by CORS'));
  },
}));
app.use(express.json({ limit: '2mb' }));

// Routes
app.use('/api/feeds', feedsRouter);
app.use('/api/discover', discoverRouter);
app.use('/api/articles', articlesRouter);
app.use('/api/ai', aiRouter);
app.use('/api/summaries', summariesRouter);
app.use('/api/highlights', highlightsRouter);
app.use('/api/ollama', ollamaRouter);
app.use('/api/reader', readerRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Workaround for Node event loop exit issue
setInterval(() => {}, 1000000);

app.listen(PORT, HOST, () => {
  console.log(`🚀 RSS Feed Reader API running on http://${HOST}:${PORT}`);
});
