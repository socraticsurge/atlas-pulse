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

const csvQuote = (value) => `"${String(value || '').replace(/"/g, '""')}"`;

/** CSV of articles: Title, Source, Published, URL, Read, Bookmarked. */
export function articlesToCSV(articles, sourceOf) {
  const header = 'Title,Source,Published,URL,Read,Bookmarked';
  const rows = articles.map((a) => [
    csvQuote(a.title),
    csvQuote(sourceOf(a)),
    a.publishedAt ? new Date(a.publishedAt).toISOString() : '',
    `"${a.link || ''}"`,
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
