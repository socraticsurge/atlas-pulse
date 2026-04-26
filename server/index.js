import express from 'express';
import cors from 'cors';
import feedsRouter from './routes/feeds.js';
import discoverRouter from './routes/discover.js';
import articlesRouter from './routes/articles.js';
import aiRouter from './routes/ai.js';
import summariesRouter from './routes/summaries.js';
import ollamaRouter from './routes/ollama.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Routes
app.use('/api/feeds', feedsRouter);
app.use('/api/discover', discoverRouter);
app.use('/api/articles', articlesRouter);
app.use('/api/ai', aiRouter);
app.use('/api/summaries', summariesRouter);
app.use('/api/ollama', ollamaRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Workaround for Node event loop exit issue
setInterval(() => {}, 1000000);

app.listen(PORT, () => {
  console.log(`🚀 RSS Feed Reader API running on http://localhost:${PORT}`);
});
