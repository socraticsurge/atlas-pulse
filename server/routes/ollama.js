import { Router } from 'express';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const OLLAMA_BASE = 'http://localhost:11434';
const router = Router();

async function isOllamaInstalled() {
  try {
    await execAsync('which ollama');
    return true;
  } catch {
    // Try common install paths on macOS
    try {
      await execAsync('test -f /usr/local/bin/ollama || test -f /opt/homebrew/bin/ollama || test -f /usr/bin/ollama');
      return true;
    } catch {
      return false;
    }
  }
}

async function getOllamaStatus() {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return { running: false, models: [] };
    const data = await res.json();
    const models = (data.models || []).map((m) => ({
      name: m.name,
      family: m.details?.family || '',
      parameterSize: m.details?.parameter_size || '',
      size: m.size,
    }));
    return { running: true, models };
  } catch {
    return { running: false, models: [] };
  }
}

/**
 * GET /api/ollama/status
 * Returns { installed, running, models[] }
 */
router.get('/status', async (req, res) => {
  const installed = await isOllamaInstalled();
  if (!installed) {
    return res.json({ installed: false, running: false, models: [] });
  }
  const { running, models } = await getOllamaStatus();
  res.json({ installed: true, running, models });
});

/**
 * POST /api/ollama/start
 * Spawns `ollama serve` as a detached background process.
 */
router.post('/start', (req, res) => {
  try {
    const child = spawn('ollama', ['serve'], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    res.json({ started: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/ollama/pull
 * Streams `ollama pull <model>` progress as newline-delimited JSON.
 * Body: { model: string }
 */
router.post('/pull', async (req, res) => {
  const { model } = req.body;
  if (!model) return res.status(400).json({ error: 'model is required' });

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  try {
    const ollamaRes = await fetch(`${OLLAMA_BASE}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: model, stream: true }),
    });

    if (!ollamaRes.ok) {
      res.write(JSON.stringify({ error: 'Pull request failed' }) + '\n');
      res.end();
      return;
    }

    const reader = ollamaRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    req.on('close', () => reader.cancel());

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (line.trim()) res.write(line + '\n');
      }
    }
    if (buffer.trim()) res.write(buffer + '\n');
  } catch (err) {
    if (!res.writableEnded) {
      res.write(JSON.stringify({ error: err.message }) + '\n');
    }
  } finally {
    res.end();
  }
});

export default router;
