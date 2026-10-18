import { getNanoModel, isNanoModel, streamNanoChat } from './chromeAI.js';

const API_BASE = '/api';

// Sends a request; on failure throws the server's error message, or `fallback`.
async function send(path, fallback, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || fallback);
  }
  return res;
}

// Like send(), resolving to the parsed JSON body.
async function request(path, fallback, opts) {
  return (await send(path, fallback, opts)).json();
}

function json(body, method = 'POST') {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

// ── Ollama management ────────────────────────────────────────────────────────

export async function fetchOllamaStatus() {
  return request('/ollama/status', 'Could not reach server'); // { installed, running, models[] }
}

export async function startOllama() {
  return request('/ollama/start', 'Failed to start Ollama', { method: 'POST' });
}

/**
 * Streams ollama pull progress. Calls onProgress({ status, completed, total }) for each chunk.
 * @param {string} model
 * @param {(progress: object) => void} onProgress
 */
export async function streamModelPull(model, onProgress) {
  const res = await send('/ollama/pull', 'Pull request failed', json({ model }));
  for await (const chunk of readNdjson(res.body)) {
    if (chunk.error) throw new Error(chunk.error);
    onProgress(chunk);
    if (chunk.status === 'success') return;
  }
}

// ── Feeds and articles from the web ──────────────────────────────────────────

export async function parseFeed(url) {
  return request('/feeds/parse', 'Failed to parse feed', json({ url }));
}

export async function discoverFeeds(url) {
  return request('/discover', 'Failed to discover feeds', json({ url }));
}

export async function extractArticle(url, signal) {
  return request('/articles/extract', 'Failed to extract article', { ...json({ url }), signal });
}

// ── Summaries ────────────────────────────────────────────────────────────────

export async function saveSummary(data) {
  return request('/summaries', 'Failed to save summary', json(data));
}

export async function fetchSummaries() {
  return request('/summaries', 'Failed to fetch summaries');
}

export async function deleteSummary(id) {
  return request(`/summaries/${id}`, 'Failed to delete summary', { method: 'DELETE' });
}

export function getSummariesExportURL() {
  return `${API_BASE}/summaries/export`;
}

export async function fetchDBPath() {
  return request('/summaries/db-path', 'Failed to get DB path');
}

// ── Highlights ───────────────────────────────────────────────────────────────

export async function saveHighlight(data) {
  return request('/highlights', 'Failed to save highlight', json(data));
}

export async function fetchHighlights() {
  return request('/highlights', 'Failed to fetch highlights');
}

export async function fetchHighlightsByArticle(articleUrl) {
  return request(`/highlights/by-article?url=${encodeURIComponent(articleUrl)}`, 'Failed to fetch article highlights');
}

export async function fetchHighlightsCount() {
  return request('/highlights/count', 'Failed to fetch highlights count');
}

export async function deleteHighlight(id) {
  return request(`/highlights/${id}`, 'Failed to delete highlight', { method: 'DELETE' });
}

export function getHighlightsExportURL() {
  return `${API_BASE}/highlights/export`;
}

export async function fetchHighlightsDBPath() {
  return request('/highlights/db-path', 'Failed to get highlights DB path');
}

// ── Reader storage (folders, feeds, articles) ─────────────────────────────────

function readerFetch(path, opts) {
  return request(`/reader${path}`, 'Request failed', opts);
}

// Folders
export async function fetchFolders() { return readerFetch('/folders'); }
export async function createFolder(data) { return readerFetch('/folders', json(data)); }
export async function findOrCreateFolder(name) { return readerFetch('/folders/find-or-create', json({ name })); }
export async function updateFolder(id, data) { return readerFetch(`/folders/${id}`, json(data, 'PUT')); }
export async function deleteFolder(id, withFeeds = false) {
  return readerFetch(`/folders/${id}${withFeeds ? '?withFeeds=true' : ''}`, { method: 'DELETE' });
}

// Feeds
export async function fetchFeeds() { return readerFetch('/feeds'); }
export async function fetchFeed(id) { return readerFetch(`/feeds/${id}`); }
export async function storeFeed(data) { return readerFetch('/feeds', json(data)); }
export async function patchFeed(id, data) { return readerFetch(`/feeds/${id}`, json(data, 'PUT')); }
export async function removeFeed(id) { return readerFetch(`/feeds/${id}`, { method: 'DELETE' }); }

// Articles
export async function fetchArticles(view = 'all', id) {
  const params = new URLSearchParams({ view });
  if (id !== undefined) params.set('id', id);
  return readerFetch(`/articles?${params}`);
}
export async function fetchArticle(id) { return readerFetch(`/articles/${id}`); }
export async function searchArticleBodies(query) {
  return readerFetch(`/articles/search?q=${encodeURIComponent(query)}`);
}

// List items omit article bodies; load full articles for any that lack one.
export async function withFullContent(articles) {
  return Promise.all(articles.map((a) => ('content' in a ? a : fetchArticle(a.id).catch(() => a))));
}
export async function fetchArticleByLink(url) {
  return readerFetch(`/articles/by-link?url=${encodeURIComponent(url)}`);
}
export async function patchArticle(id, data) {
  return readerFetch(`/articles/${id}`, json(data, 'PUT'));
}
export async function bulkUpdateArticles(ids, data) {
  return readerFetch('/articles/bulk-update', json({ ids, ...data }, 'PUT'));
}
export async function bulkInsertArticles(feedId, articles) {
  return readerFetch('/articles/bulk-insert', json({ feedId, articles }));
}
export async function fetchArticlesByAiStatus(status) {
  const s = Array.isArray(status) ? status.join(',') : status;
  return readerFetch(`/articles/by-ai-status?status=${encodeURIComponent(s)}`);
}
export async function fetchUnprocessedForFeed(feedId, limit) {
  return readerFetch(`/articles/unprocessed?feedId=${feedId}&limit=${limit}`);
}
export async function fetchQueueCount() {
  const { count } = await readerFetch('/articles/queue-count');
  return count;
}
export async function resetProcessingArticles() {
  return readerFetch('/articles/reset-processing', { method: 'POST' });
}
export async function fetchCounts() { return readerFetch('/articles/counts'); }
export async function clearAllData() { return readerFetch('/all', { method: 'DELETE' }); }

// Installed Ollama models, or null when the server is unreachable.
// (Ollama itself being absent is a normal empty list.)
async function fetchOllamaModels() {
  try {
    const res = await fetch(`${API_BASE}/ai/models`);
    return res.ok ? (await res.json()).models || [] : null;
  } catch {
    return null;
  }
}

export async function fetchAIModels() {
  const [ollamaModels, nano] = await Promise.all([fetchOllamaModels(), getNanoModel()]);
  if (!ollamaModels && !nano) throw new Error('Could not reach the server');
  // Gemini Nano first: it's the default engine; Ollama models are optional extras.
  const models = nano ? [nano, ...(ollamaModels || [])] : ollamaModels;
  return { models }; // { models: [{name, family, parameterSize, size}] }
}

/**
 * Streams a chat completion from Gemini Nano in the browser when that model
 * is selected, otherwise from Ollama via the local proxy.
 * Yields string tokens as they arrive.
 * @param {string} model
 * @param {{role:string, content:string}[]} messages
 * @returns {AsyncGenerator<string>}
 */
export function streamChat(model, messages, signal) {
  return isNanoModel(model) ? streamNanoChat(messages, signal) : streamOllamaChat(model, messages, signal);
}

async function* streamOllamaChat(model, messages, signal) {
  const res = await send('/ai/chat', 'AI request failed', { ...json({ model, messages, stream: true }), signal });
  for await (const chunk of readNdjson(res.body)) {
    if (chunk.message?.content) yield chunk.message.content;
    if (chunk.done) return;
  }
}

// Parses a newline-delimited JSON stream, skipping blank or malformed lines.
// Stopping early (break, return, an error) cancels the body, which closes the
// connection so the server stops generating.
async function* readNdjson(body) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep any incomplete trailing line
      yield* parseLines(lines);
    }
  } finally {
    reader.cancel().catch(() => {});
  }
}

function* parseLines(lines) {
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      yield JSON.parse(line);
    } catch {
      // ignore malformed chunks
    }
  }
}
