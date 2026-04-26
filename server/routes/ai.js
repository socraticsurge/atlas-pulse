import { Router } from 'express';

const OLLAMA_BASE = 'http://localhost:11434';
const router = Router();

/**
 * GET /api/ai/models
 * Returns list of locally available Ollama models.
 */
router.get('/models', async (req, res) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) throw new Error(`Ollama responded with ${response.status}`);
    const data = await response.json();
    const models = (data.models || []).map((m) => ({
      name: m.name,
      family: m.details?.family || '',
      parameterSize: m.details?.parameter_size || '',
      size: m.size,
    }));
    res.json({ models });
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Ollama did not respond in time' });
    }
    res.status(503).json({ error: 'Ollama is not reachable', detail: err.message });
  }
});

/**
 * POST /api/ai/chat
 * Proxies a chat request to Ollama and streams the NDJSON response back.
 * Body: { model: string, messages: [{role, content}], stream?: boolean }
 */
router.post('/chat', async (req, res) => {
  const { model, messages, stream = true } = req.body;

  if (!model || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'model and messages[] are required' });
  }

  const connectController = new AbortController();
  const connectTimeout = setTimeout(() => connectController.abort(), 15000);

  try {
    const ollamaRes = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream }),
      signal: connectController.signal,
    });
    clearTimeout(connectTimeout);

    if (!ollamaRes.ok) {
      const text = await ollamaRes.text();
      return res.status(ollamaRes.status).json({ error: text });
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      const reader = ollamaRes.body.getReader();
      const decoder = new TextDecoder();

      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(decoder.decode(value, { stream: true }));
          }
        } finally {
          res.end();
        }
      };

      // If the client disconnects, cancel the Ollama stream
      req.on('close', () => reader.cancel());
      pump();
    } else {
      const data = await ollamaRes.json();
      res.json(data);
    }
  } catch (err) {
    clearTimeout(connectTimeout);
    if (!res.headersSent) {
      if (err.name === 'AbortError') {
        return res.status(504).json({ error: 'Ollama did not respond in time. Is the model loaded?' });
      }
      res.status(503).json({ error: 'Ollama is not reachable', detail: err.message });
    }
  }
});

export default router;
