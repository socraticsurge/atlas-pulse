# Atlas Pulse — Implementation History

All items below have been implemented and shipped. This document records what was built across v1.0–v1.2.

---

## v1.0.0 — Core RSS Reader

| Feature | Status |
|---|---|
| Express.js backend with CORS proxy for RSS fetching | ✅ Done |
| RSS/Atom parsing via `rss-parser` | ✅ Done |
| Feed auto-discovery from URL (link tags + common paths) | ✅ Done |
| Full-text article extraction (`@extractus/article-extractor`) | ✅ Done |
| Dexie.js IndexedDB schema (feeds, articles, folders) | ✅ Done |
| Three-panel layout (Sidebar / ArticleList / ArticleReader) | ✅ Done |
| Folder management (create, rename, delete, move feeds) | ✅ Done |
| Read/unread tracking with unread badges | ✅ Done |
| Bookmarks ("Saved" collection) | ✅ Done |
| Auto-refresh (configurable: off / 15 min / 30 min / 1 hr / 2 hr) | ✅ Done |
| Dark/Light theme with localStorage persistence | ✅ Done |
| OPML import/export | ✅ Done |
| Popular feeds catalog (Technology, AI, Business, Science, …) | ✅ Done |
| Google News keyword search → RSS subscribe | ✅ Done |
| Local article search (title + content + source) | ✅ Done |
| DOMPurify safe HTML rendering | ✅ Done |
| Reading time estimate | ✅ Done |
| Settings panel (theme, clear data) | ✅ Done |

---

## v1.1.0 — UI Polish & Power Features

| Feature | Status |
|---|---|
| Three article list views: Grid / List / Compact | ✅ Done |
| Reading progress bar (accent-colored, scroll-tracked) | ✅ Done |
| Zen / focus mode (`f` key expands reader full-width) | ✅ Done |
| Keyboard shortcuts: j/k, b, o, f, Esc | ✅ Done |
| Collapsible sidebar (expanded → icon-only → hidden) | ✅ Done |
| Resizable article list / reader panels (drag handle) | ✅ Done |
| Font picker (Inter, Poppins, Lato, Nunito, Merriweather, Garamond, Times, Mono, System UI) | ✅ Done |
| Accent color presets + custom color picker | ✅ Done |
| Text color presets + custom color picker | ✅ Done |
| Reader typography settings (font size, line width, line height) | ✅ Done |
| Share popover (LinkedIn, X/Twitter, Email, Web Share API, Copy Link) | ✅ Done |
| AI Assistant — Summary + Chat via local Ollama (streaming) | ✅ Done |
| AI model picker (dropdown from installed Ollama models) | ✅ Done |

---

## v1.2.0 — AI Batch Processing & Content Analysis

| Feature | Status |
|---|---|
| Content Analysis tab in AI drawer (5 dimensions: Sentiment, Urgency, Frame, Tone, Depth + topic tags) | ✅ Done |
| Background AI batch processor (`useAIBatchProcessor` hook, queue watcher, processOne loop) | ✅ Done |
| Batch processing order: newest articles first | ✅ Done |
| On-demand batch trigger (`✨` button in article list header) | ✅ Done |
| Live batch progress indicator (spinner + remaining count in header) | ✅ Done |
| AI processed badge on articles (sparkle icon in all three views) | ✅ Done |
| AI Only filter toggle (show only AI-analyzed articles) | ✅ Done |
| Per-dimension content filter pills (dropdown per dimension, only shows values present in current set) | ✅ Done |
| AI Summaries Library (SQLite-backed; save, search, browse, export CSV) | ✅ Done |
| Library summary count badge in sidebar | ✅ Done |
| Guided Ollama setup wizard (detect / start / pull — no terminal needed) | ✅ Done |
| Ollama status indicator in Settings ("Running · N models available") | ✅ Done |
| `batchSettings.js` (localStorage config: model, features, maxPerCycle, enabled) | ✅ Done |
| `aiSettings.js` (AI persona + tone configuration) | ✅ Done |
| SQLite backend route for summaries CRUD + CSV export | ✅ Done |

---

## v1.3.0 — Multi-Article AI Actions, Search & Feed Quality

| Feature | Status |
|---|---|
| Multi-select article checkboxes (position:absolute, all three views) | ✅ Done |
| Floating action bar — Mark Read, Bookmark, CSV, AI Actions (slides up from bottom) | ✅ Done |
| `MultiArticlePanel` — Compare Sources (2–5), Newsletter (3–15), AI Briefing (2–15) | ✅ Done |
| Streaming output in MultiArticlePanel (RAF-batched, same pattern as AIDrawer) | ✅ Done |
| Newsletter templates: Daily Digest, Weekly Roundup, Executive Brief | ✅ Done |
| AI persona + tone + custom instructions applied in MultiArticlePanel (`buildSystemPrompt`) | ✅ Done |
| Active AI config strip in MultiArticlePanel (persona/tone/custom badges) | ✅ Done |
| Multi-article export: Copy · Markdown (`.md`) · Word (`.docx`) · Email | ✅ Done |
| `docx.js` — client-side Markdown → `.docx` via `docx` npm package | ✅ Done |
| AND-logic tokenized search — multi-word queries require all terms to match | ✅ Done |
| Quoted phrase support in search — `"exact phrase"` matches literally | ✅ Done |
| Relevance ranking — title (10pts) › source (5pts) › AI topics (3pts) › body (1pt) | ✅ Done |
| AI topics searched — `aiAnalysis.topics[]` included in search scoring | ✅ Done |
| Cross-feed URL deduplication — `canonicalLink` field + IndexedDB index (DB v6) | ✅ Done |
| `canonicalizeUrl` — strips `utm_*`/`fbclid`/tracking params, `www.`, fragment; sorts params | ✅ Done |
| Dedup at insert time in `addFeed` and `refreshFeed` via `anyOf(canonicals)` query | ✅ Done |
| DB v6 migration — backfills `canonicalLink` for all existing articles | ✅ Done |
| `/` keyboard shortcut — focuses search box | ✅ Done |
| `Escape` priority order — clears selection → clears search → exits zen → closes reader | ✅ Done |

---

## Architecture Decisions

**Why IndexedDB for articles, SQLite for summaries?**
Articles are browser-local and tied to the session — IndexedDB keeps them fast and zero-setup. Saved AI summaries are a curated, long-term library that benefits from SQL query/search/export; server-side SQLite fits naturally since the Express server is already running.

**Why a local Express backend?**
Browsers block direct cross-origin requests (CORS). The Express server proxies RSS fetches, article extraction, and Ollama API calls. Everything stays local — no cloud middleman.

**Why Ollama?**
Free, local LLM inference with no API keys or usage costs. Works with any GGUF-compatible model. The app ships with a guided setup wizard so users don't need to touch the terminal.
