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
