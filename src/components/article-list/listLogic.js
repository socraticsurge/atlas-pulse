import { csvCell } from '../../../shared/csv.js';

// Pure helpers for the article list: AI filters, empty-state copy, CSV.

export const FILTER_DIMS = [
  { key: 'sentiment', label: 'Sentiment', values: { positive: '😊 Positive', neutral: '😐 Neutral', negative: '😟 Negative' } },
  { key: 'urgency',   label: 'Urgency',   values: { breaking: '🔴 Breaking', developing: '🟡 Developing', evergreen: '🟢 Evergreen' } },
  { key: 'frame',     label: 'Frame',     values: { conflict: '⚔️ Conflict', human_interest: '👤 Human', economic: '📊 Economic', analytical: '🔬 Analytical' } },
  { key: 'tone',      label: 'Tone',      values: { alarming: '🚨 Alarming', analytical: '💡 Analytical', optimistic: '✨ Optimistic', opinion: '💭 Opinion' } },
  { key: 'depth',     label: 'Depth',     values: { brief: '⚡ Brief', standard: '📄 Standard', deep_dive: '📚 Deep Dive' } },
];

function analysisOf(article) {
  if (!article.aiAnalysis) return null;
  try {
    return JSON.parse(article.aiAnalysis);
  } catch {
    return null; // malformed aiAnalysis — skip
  }
}

/** Values present per filter dimension, e.g. { sentiment: Set{'positive'} }. */
export function availableFilters(articles) {
  const analyses = articles.map(analysisOf).filter(Boolean);
  return Object.fromEntries(FILTER_DIMS.map((dim) => [
    dim.key,
    new Set(analyses.map((a) => a[dim.key]).filter(Boolean)),
  ]));
}

/** Applies the AI-only toggle and the active dimension filters. */
export function applyFilters(articles, { activeFilters = {}, aiOnly = false } = {}) {
  const base = aiOnly ? articles.filter((a) => a.aiStatus === 'done') : articles;
  const keys = Object.keys(activeFilters).filter((k) => activeFilters[k]);
  if (keys.length === 0) return base;
  return base.filter((article) => {
    const analysis = analysisOf(article);
    return Boolean(analysis) && keys.every((k) => analysis[k] === activeFilters[k]);
  });
}

const VIEW_TITLES = { all: 'All Articles', today: 'Today', saved: 'Saved' };

export function viewTitle(view) {
  if (VIEW_TITLES[view.type]) return VIEW_TITLES[view.type];
  if (view.type === 'feed') return view.name || 'Feed';
  if (view.type === 'folder') return view.name || 'Folder';
  return 'Articles';
}

const EMPTY_BY_VIEW = {
  saved: { title: 'Nothing saved yet', body: 'Bookmark articles to find them here' },
  today: { title: 'All caught up', body: 'No new articles published today' },
};

/** Title and body for the empty list, depending on why it is empty. */
export function emptyStateText({ hasActiveFilters, searchQuery, viewType }) {
  if (hasActiveFilters) return { title: 'No matching articles', body: 'No articles match the active filters' };
  if (searchQuery) return { title: 'No matching articles', body: `No articles match "${searchQuery}"` };
  return EMPTY_BY_VIEW[viewType] || { title: 'Your feed is empty', body: 'Add feeds from the sidebar to start reading' };
}


/** CSV of articles: Title, Source, Published, URL, Read, Bookmarked. */
export function articlesToCSV(articles, sourceOf) {
  const header = 'Title,Source,Published,URL,Read,Bookmarked';
  const rows = articles.map((a) => [
    csvCell(a.title),
    csvCell(sourceOf(a)),
    a.publishedAt ? new Date(a.publishedAt).toISOString() : '',
    csvCell(a.link),
    a.isRead ? 'yes' : 'no',
    a.isBookmarked ? 'yes' : 'no',
  ].join(','));
  return [header, ...rows].join('\n');
}

export function downloadCSV(csv, filename) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const el = document.createElement('a');
  el.href = url;
  el.download = filename;
  document.body.appendChild(el);
  el.click();
  document.body.removeChild(el);
  URL.revokeObjectURL(url);
}

/** Groups articles into rows of `columns` (the last row may be shorter). */
export function chunkRows(articles, columns) {
  const rows = [];
  for (let i = 0; i < articles.length; i += columns) rows.push(articles.slice(i, i + columns));
  return rows;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/** Day heading for an article: Today, Yesterday, Earlier this week (last 7 days) or Older. */
export function dayGroup(dateStr, now = new Date()) {
  const time = Date.parse(dateStr);
  if (!Number.isFinite(time)) return 'Older';
  const days = Math.floor((startOfDay(now) - startOfDay(new Date(time))) / DAY_MS);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return 'Earlier this week';
  return 'Older';
}

/**
 * The list as rows for the Rows view: a heading before each run of articles
 * from the same day group. Assumes newest-first order; a group that recurs
 * later (unusual sort) simply gets another heading.
 */
export function withDayHeaders(articles, now = new Date()) {
  const items = [];
  let current = null;
  for (const article of articles) {
    const label = dayGroup(article.publishedAt, now);
    if (label !== current) {
      items.push({ type: 'header', key: `h-${items.length}-${label}`, label });
      current = label;
    }
    items.push({ type: 'article', key: article.id, article });
  }
  return items;
}

/** Compact time for a row: "19:12" today, a weekday this week, else "Oct 3" (or "Oct 3, 2025"). */
export function shortTime(dateStr, now = new Date()) {
  const time = Date.parse(dateStr);
  if (!Number.isFinite(time)) return '';
  const date = new Date(time);
  const group = dayGroup(dateStr, now);
  if (group === 'Today') return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  if (group !== 'Older') return date.toLocaleDateString(undefined, { weekday: 'short' });
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString(undefined, sameYear ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' });
}

/** The highest article id in a list (ids increase as articles are added), or 0. */
export function maxArticleId(articles) {
  return articles.reduce((max, a) => (a.id > max ? a.id : max), 0);
}

/** A list with newly fetched articles merged in: no duplicates, newest first. */
export function mergeNewArticles(articles, added) {
  if (added.length === 0) return articles;
  const known = new Set(articles.map((a) => a.id));
  const fresh = added.filter((a) => !known.has(a.id));
  if (fresh.length === 0) return articles;
  return [...fresh, ...articles].sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));
}
