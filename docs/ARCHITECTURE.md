# Architecture

This document maps Atlas Pulse's components: what each one owns, where it lives, and how they talk to each other. Read it before adding a feature, so the feature lands in the right component instead of growing an existing file.

For the history and remaining debt, see [TECH-DEBT.md](TECH-DEBT.md).

## Overview

Atlas Pulse has three runtime parts:

1. **A React single-page app** in the browser.
2. **An Express server** on `127.0.0.1`. It fetches feeds and articles for the browser and owns the SQLite databases.
3. **An AI engine.** By default this is Gemini Nano, which runs inside Chrome through the Prompt API. Ollama is an optional alternative, reached through the server.

```
Browser ─────────────────────────────────────────────────────────────
  Shell & Settings   src/app, Sidebar, SettingsPanel
  Feeds              AddFeedModal, useFeeds, useFolders, OPML
  Reading            ArticleList, ArticleReader, highlights
  AI tasks           src/ai  ──►  AI engines: streamChat()
                                   ├─ Gemini Nano (in browser)
                                   └─ Ollama ───────────────┐
  Library            LibraryView, HighlightsLibrary         │
        │ /api/*                                            │
Server ─┼───────────────────────────────────────────────────┼────────
  Ingestion          routes/{feeds,discover,articles}, utils│
  Storage            db/*  (SQLite + migrations + FTS5)     │
  AI bridge          routes/{ai,ollama} ◄───────────────────┘
```

## Components

| Layer | Component | Paths | Owns |
|---|---|---|---|
| Server | **Ingestion** | `server/routes/{feeds,discover,articles}.js`, `server/utils/{feedParser,feedDiscovery,articleExtractor,urlGuard}.js` | Fetching, parsing and extracting feeds and articles. Every outbound URL passes `assertPublicHttpUrl` / `safeFetch` (SSRF guard). |
| | **Storage** | `server/db/`, `server/routes/{reader,summaries,highlights}.js` | SQLite access, migrations, list views, full-text search. |
| | **AI bridge** | `server/routes/{ai,ollama}.js`, `server/utils/stream.js` | Optional proxy to a local Ollama, plus its install and start helpers. |
| Shared | **Search query** | `shared/searchQuery.js` | Query tokenizing, used by both the server's FTS search and the client's ranking. |
| Client | **Shell** | `src/App.jsx`, `src/app/` | Layout, view selection, and the app-wide contexts (Appearance, Toast, Library). |
| | **Feeds** | `src/components/AddFeedModal.jsx`, `src/components/add-feed/`, `src/hooks/useFeeds.js`, `src/utils/feedSync.js`, `src/hooks/useFolders.js`, `src/utils/opml.js` | Subscriptions, folders, refresh, OPML import and export. `feedSync.js` holds the operations; `useFeeds` wraps them in React state. |
| | **Reading** | `src/components/{ArticleList,ArticleReader,HighlightToolbar}.jsx`, `src/components/{article-list,reader,highlights}/` | The list, the reader, highlights and search. |
| | **AI engines** | `src/utils/chromeAI.js`, `streamChat()` in `src/utils/api.js` | One streaming interface over Gemini Nano and Ollama. |
| | **AI tasks** | `src/ai/` | Prompts, article context, output parsing and the batch helpers. One module per concern; no React. |
| | **AI surfaces** | `src/components/{AIDrawer,MultiArticlePanel}.jsx`, `src/components/{ai-drawer,multi-article}/`, `src/hooks/useAIBatchProcessor.js` | The per-article drawer, the multi-article panel and background batch processing. |
| | **Library** | `src/components/{LibraryView,HighlightsLibrary}.jsx`, `src/components/library/` | Saved summaries and highlights. |
| | **Settings** | `src/components/SettingsPanel.jsx`, `src/components/settings/`, `src/components/ReaderSettings.jsx` | Preferences, one component per section. |
| | **Styles** | `src/index.css`, `src/styles/` | Vanilla CSS, one file per feature area. `index.css` imports them in cascade order. |

## Dependency rules

- **Components never call `fetch`.** They go through `src/utils/api.js`, or through a hook that does.
- **`src/ai/` has no React and no network.** It builds messages and parses output. `tasks.js` is the only module that calls an engine, through `streamChat`.
- **AI features must work with both engines.** Call `streamChat(model, messages)`. Never call Gemini Nano or Ollama directly.
- **Feature folders own their pieces.** A top-level component such as `ArticleList.jsx` composes the hooks and subcomponents in its folder (`article-list/`). Pure logic lives in a `*Model.js` or `listLogic.js` file and has tests.
- **App-wide state lives in a context.** Use `src/app/`. Don't thread props through `App.jsx`.
- **The server owns persistent data.** Browser `localStorage` holds preferences only.

## Data

There are three SQLite databases in `data/` (or in `ATLAS_DATA_DIR` if set):

| File | Tables | Schema version |
|---|---|---|
| `reader.db` | feeds, folders, articles, `articles_fts` | 4 |
| `summaries.db` | summaries | 1 |
| `highlights.db` | highlights | 1 |

Each schema change is a numbered migration in `server/db/migrations/<db>.js`. `server/db/migrate.js` applies pending migrations in order and records progress in `PRAGMA user_version`. Databases from before the migration runner are adopted as version 1. Never edit a released migration; add a new one.

List endpoints return `LIST_COLUMNS`, which leaves out the article body. The reader fetches a single article in full. Article bodies are indexed in the FTS5 table `articles_fts` (contentless, porter tokenizer), and `searchArticleBodies` serves body search.

## Request flows

**Refreshing a feed.** `useFeeds.refreshFeed` → `refreshOne` (`src/utils/feedSync.js`) → `POST /api/feeds/parse` (Ingestion fetches and normalizes the feed) → `bulkInsertArticles` (Storage skips known GUIDs and canonical links, writes rows, excerpts and FTS entries) → new articles in scope are queued for batch AI.

**Summarizing an article.** `useArticleSummary` → `summaryMessages()` (`src/ai/tasks.js`) → `streamChat` → Gemini Nano or Ollama → tokens are batched to the UI with `useTokenBuffer` → the user saves → `POST /api/summaries`.

**Batch processing.** `useAIBatchProcessor` polls the queue count. While articles are queued, it takes the newest one, runs `batchMessages`, parses the result with `parseBatchResult`, and stores it with `batchUpdates` (`src/ai/batch.js`).

## Where new features go

- **A new AI output** (for example newsletters): add the prompt and parser to `src/ai/`, add the UI under its own feature folder, and store results through a Storage route backed by a migration.
- **A new feed source:** add it to Ingestion behind the URL guard, and return the same normalized item shape as `normalizeItem`.
- **A new settings section:** add a component under `src/components/settings/`.
- **New styles:** add a file in `src/styles/` and import it from `index.css`, after anything it overrides.

## Guardrails

- `npm run lint` enforces complexity limits as warnings: complexity 9, 70 lines per function, nesting depth 3, 4 parameters, 3 nested callbacks. The `--max-warnings` cap is **0**, so any new finding fails CI.
- `npm test` runs every `*.test.js` with Node's test runner. Pure logic (models, parsers, prompts, migrations) is tested. Prompt tests pin each prompt byte for byte, so a prompt change is always deliberate.
- CodeScene reviews every pull request. Its gate requires new and changed code to be at full Code Health.
