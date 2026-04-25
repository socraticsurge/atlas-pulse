const API_BASE = '/api';

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

export async function extractArticle(url) {
  const res = await fetch(`${API_BASE}/articles/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }));
    throw new Error(err.error || 'Failed to extract article');
  }
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
