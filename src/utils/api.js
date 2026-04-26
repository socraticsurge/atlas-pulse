const API_BASE = '/api';

// ── Ollama management ────────────────────────────────────────────────────────

export async function fetchOllamaStatus() {
  const res = await fetch(`${API_BASE}/ollama/status`);
  if (!res.ok) throw new Error('Could not reach server');
  return res.json(); // { installed, running, models[] }
}

export async function startOllama() {
  const res = await fetch(`${API_BASE}/ollama/start`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to start Ollama');
  return res.json();
}

/**
 * Streams ollama pull progress. Calls onProgress({ status, completed, total }) for each chunk.
 * @param {string} model
 * @param {(progress: object) => void} onProgress
 */
export async function streamModelPull(model, onProgress) {
  const res = await fetch(`${API_BASE}/ollama/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model }),
  });
  if (!res.ok) throw new Error('Pull request failed');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const chunk = JSON.parse(line);
        onProgress(chunk);
        if (chunk.status === 'success') return;
      } catch { /* ignore malformed lines */ }
    }
  }
}

export async function parseFeed(url) {
  const res = await fetch(`${API_BASE}/feeds/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }));
    throw new Error(err.error || 'Failed to parse feed');
  }
  return res.json();
}

export async function refreshFeeds(urls) {
  const res = await fetch(`${API_BASE}/feeds/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }));
    throw new Error(err.error || 'Failed to refresh feeds');
  }
  return res.json();
}

export async function discoverFeeds(url) {
  const res = await fetch(`${API_BASE}/discover`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }));
    throw new Error(err.error || 'Failed to discover feeds');
  }
  return res.json();
}

export async function extractArticle(url, signal) {
  const res = await fetch(`${API_BASE}/articles/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
    signal,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }));
    throw new Error(err.error || 'Failed to extract article');
  }
  return res.json();
}

export async function saveSummary(data) {
  const res = await fetch(`${API_BASE}/summaries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to save' }));
    throw new Error(err.error || 'Failed to save summary');
  }
  return res.json();
}

export async function fetchSummaries() {
  const res = await fetch(`${API_BASE}/summaries`);
  if (!res.ok) throw new Error('Failed to fetch summaries');
  return res.json();
}

export async function deleteSummary(id) {
  const res = await fetch(`${API_BASE}/summaries/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete summary');
  return res.json();
}

export function getSummariesExportURL() {
  return `${API_BASE}/summaries/export`;
}

export async function fetchDBPath() {
  const res = await fetch(`${API_BASE}/summaries/db-path`);
  if (!res.ok) throw new Error('Failed to get DB path');
  return res.json();
}

export async function fetchAIModels() {
  const res = await fetch(`${API_BASE}/ai/models`);
  if (!res.ok) throw new Error('Could not reach Ollama');
  return res.json(); // { models: [{name, family, parameterSize, size}] }
}

/**
 * Streams a chat completion from Ollama via the local proxy.
 * Yields string tokens as they arrive.
 * @param {string} model
 * @param {{role:string, content:string}[]} messages
 * @returns {AsyncGenerator<string>}
 */
export async function* streamChat(model, messages) {
  const res = await fetch(`${API_BASE}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'AI request failed' }));
    throw new Error(err.error || 'AI request failed');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep any incomplete trailing line

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const chunk = JSON.parse(line);
        if (chunk.message?.content) yield chunk.message.content;
        if (chunk.done) return;
      } catch {
        // ignore malformed chunks
      }
    }
  }
}
