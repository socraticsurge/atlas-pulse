# Technical Debt & Maintainability Assessment

_Assessed: 15 October 2026, at v1.4.0. Owner: maintainers. Review this document at each minor release._

This document records where Atlas Pulse's maintainability stands, why, and the planned work to improve it. It draws on three independent sources:

1. **CodeScene** file-level Code Health for all 46 files (analysis of `master` before v1.4.0).
2. **A function-level complexity scan** with ESLint: cyclomatic complexity > 9, functions > 70 lines, nesting depth > 3, more than 4 parameters.
3. **Code review** of issues that neither tool measures: correctness, performance, data model, and test coverage.

## Summary

| Metric | Value |
|---|---|
| Average Code Health (CodeScene) | **8.2** / 10 |
| Hotspot Code Health | **7.0** / 10 |
| Code files below 10.0 | 27 of 43 |
| Code files below 9.0 | 15 of 43 |
| Files with complexity findings (ESLint scan) | 22 of 48 |
| Development effort spent in hotspots | 45.5% of effort in 13% of the code |

No file is in CodeScene's red ("risky") band. The debt is broad rather than deep. It sits mainly in large React components that combine several features, plus a few structural gaps: no AI layer, no data-access paging, no schema migrations.

## Status after the refactoring round (v1.5 foundations)

Packages 1–6 below were carried out as a series of behavior-preserving pull requests between v1.4.0 and v1.5. The tables in sections 1 and 2 are the **baseline** and are kept for comparison.

| Package | Outcome |
|---|---|
| 1 Data access | Done, except paging. Migration runner (`PRAGMA user_version`), list views without content, excerpt column, FTS5 body search. The article list payload fell from **78 MB to 7.8 MB**. It is still unpaginated, so the under-1 MB target is not met (see below). |
| 2 AI tasks layer | Done. `src/ai/` holds the prompts, context building, one parser, the task runner and the batch helpers. Prompts are pinned byte for byte by tests. |
| 3 Component decomposition | Done. `AIDrawer`, `ArticleReader`, `ArticleList`, `AddFeedModal`, `Sidebar`, `SettingsPanel`, `MultiArticlePanel`, the libraries, `HighlightToolbar`, `ReaderSettings` and `OllamaSetup` are split into feature folders. |
| 4 State contexts | Done. Appearance, Toast and Library contexts replace prop drilling from `App.jsx`. |
| 5 Ingestion and server cleanup | Done. Parsers, discovery, the URL guard, OPML, the AI and Ollama routes, `saveSummary` and `bulkInsertArticles`. Batch processor and feed hooks too. |
| 6 Guardrails | CSS split into `src/styles/` (24 files, built output unchanged). The ESLint complexity ratchet went from 58 warnings to **0**. CodeScene components and PR integration still need configuring by a maintainer. |

The test suite grew from 20 to 79 tests. The architecture is documented in [ARCHITECTURE.md](ARCHITECTURE.md).

**Fixed along the way:**
- "Mark all read" now asks for confirmation.
- The batch processor stops polling when its queue is empty. It used to re-query every 50 ms.
- ReDoS-safe tag stripping.
- Rate limiting on static files.
- Text color presets now work in the light theme, with light shades of their own.
- The saved theme and colors are applied before first paint, so a light theme no longer flashes dark on load.
- Removed unused assets (`hero.png`, `vite.svg`, `icons.svg`).
- Fonts are self-hosted with Fontsource instead of loaded from Google Fonts, and the app and reader share one font list (`src/app/fonts.js`).

### Still open

- **Article list paging.** The list still loads every article (7.8 MB on a 9,500-article library). This needs a paginated endpoint and incremental loading in `ArticleList`.
- **Large feeds fail to refresh.** `express.json` is limited to 2 MB, and `bulkInsertArticles` receives every item with its full content. A feed whose items exceed 2 MB fails to refresh, and the only sign is a `PayloadTooLargeError` in the server log. Fix it by raising the limit for that route or sending items in chunks. In a test on a copy of the maintainer's library, at least one feed hit this on each full refresh.
- **Imported feeds get no articles until the next refresh.** After an OPML import, the settings panel calls "refresh all" from a closure that still holds the pre-import feed list, so the new feeds are skipped, even though the toast says their articles are downloading. This dates from v1.4.0. Fix it by refreshing the imported feeds by ID, or by refreshing after the feed list updates.
- **Highlights spanning element boundaries.** `applyHighlights` matches text inside a single text node. A highlight that crosses a link or other inline element is saved but not redrawn when the article is reopened.
- **Scroll restore.** The reader restores scroll position before full-text extraction finishes. When the extracted text is longer than the feed's version, the restored position can land in the wrong place. Positions are remembered only for the current session.
- **Three databases.** Cross-entity queries remain impossible. This matters for the artifact model in section 4.
- **Favicons load from Google.** `getFaviconUrl` in `src/utils/helpers.js` points every feed icon at `www.google.com/s2/favicons`, so Google sees the domain of every subscribed feed on each load. Fetch and cache favicons on the server instead.
- **Reader toolbar overflows.** With the AI panel open, the last toolbar button is cut off ("Ope…" in `docs/screenshots/03-ai-dark.png`).
- **CodeScene configuration.** Define the components from [ARCHITECTURE.md](ARCHITECTURE.md) in the `atlas-pulse` project and enable its own PR integration.

## 1. File-level Code Health (CodeScene)

| Band | Files |
|---|---|
| **Below 7** | `AIDrawer.jsx` 6.0 · `AddFeedModal.jsx` 6.7 · `ArticleList.jsx` 6.75 · `ArticleReader.jsx` 6.91 |
| **7 – 8** | `Sidebar.jsx` 7.45 · `App.jsx` 7.79 · `SettingsPanel.jsx` 7.82 |
| **8 – 9** | `useAIBatchProcessor.js` 8.16 · `useFeeds.js` 8.23 · `feedDiscovery.js` 8.41 · `api.js` 8.52 · `MultiArticlePanel.jsx` 8.75 · `feedParser.js` 8.83 · `LibraryView.jsx` 8.93 · `HighlightsLibrary.jsx` 8.98 |
| **9 – 10** | `opml.js` 9.01 · `urlGuard.js` 9.02 · `routes/ai.js` 9.24 · `HighlightToolbar.jsx` 9.39 · `db/reader.js` 9.53 · `articleExtractor.js` 9.61 · `db/summaries.js` 9.64 · `server/index.js` 9.69 · `routes/feeds.js` 9.69 · `docx.js` 9.69 · `OllamaSetup.jsx` 9.69 |

**Hotspots**, the files that are both unhealthy and changed most often, are `AIDrawer`, `ArticleList`, `ArticleReader`, `Sidebar`, `App` and `SettingsPanel`. `AddFeedModal` is the second-least-healthy file but rarely changes. It will become a hotspot as soon as feed features grow.

v1.4.0 improved `api.js` and `MultiArticlePanel.jsx` (CodeScene: "3 files improve in Code Health") and added new modules at full health (`chromeAI.js`, `AIEngines.jsx`).

## 2. Function-level complexity (ESLint scan)

| Function | Cyclomatic complexity | Cause |
|---|---|---|
| `AIDrawer` component | **79** | Summary, Analysis, Chat and Highlights tabs, plus saving and sharing, in one function |
| `ArticleReader` component | **57** | Toolbar, share menu, extraction, progress bar and content in one function |
| `AddFeedModal` component | 40 | URL discovery, Google News search and popular feeds in one function |
| `Sidebar` component | 40 | Navigation and folder tree, with drag/rename/delete, inline |
| `ArticleList` component and row renderer | 37 + 35 | Rendering, filtering, search ranking and multi-select together |
| `useAIBatchProcessor` → `processOne` | 30 | Queue handling, prompt construction and output parsing interleaved |
| `MultiArticlePanel` component | 26 | Three operations, streaming and export |
| `AIDrawer` save handler | 21 | Builds the saved-summary record inline |
| `parseAnalysisJSON` / `parseAnalysis` | 18 / 19 | Near-duplicate parsers in `AIDrawer` and `useAIBatchProcessor` |
| `feedParser` callbacks / `extractImageUrl` | 18 / 15 | Many image-source fallbacks in one function |

Clean (no findings): every server route except `ai.js` and `ollama.js`, the database modules, `useFolders`, `chromeAI.js`, `AIEngines.jsx`, and most utilities.

## 3. Findings that metrics do not capture

Ranked by impact.

### 3.1 Correctness: AI received only 160 characters per article (fixed in v1.4.0)
`stripHtml()` truncates to 160 characters by default, and every AI caller used it without a length. All AI features worked from the headline plus one sentence. v1.4.0 adds `htmlToText()` (full text) for AI context and keeps `stripHtml()` for previews. Search still uses the 160-character excerpt; see 3.2.

### 3.2 Performance: the article list loads the entire library
`GET /api/reader/articles` returns every article **with full content**, with no pagination. On the maintainer's library (9,447 articles, an 81 MB database) that is **78 MB of JSON**. It is re-fetched on every view switch, every feed refresh (automatic every 30 minutes by default), and every feed add or remove. Filtering and search then run in the browser over all of it, which is why search uses a 160-character excerpt: full-text search in the browser would be too slow. The cost grows with every article fetched.

### 3.3 Data layer
- **No migrations.** Schemas use `CREATE TABLE IF NOT EXISTS` only. Existing databases cannot be changed safely.
- **Three database files** (`reader.db`, `summaries.db`, `highlights.db`) with separate connections. Cross-entity queries, such as "the summaries for this article", are impossible in SQL.
- **The summaries table is single-article.** It has no `kind` and no link table, so newsletters, comparisons and briefings cannot be stored.
- **Unbounded list queries** for summaries and highlights. These will hit the same wall as 3.2.

### 3.4 Architecture
- **No AI layer.** Prompts are inline constants in `AIDrawer`, `MultiArticlePanel` and `useAIBatchProcessor`. The analysis prompt exists twice. Article-text preparation exists in four variants with different limits. The batch processor bypasses the persona and tone settings (`buildSystemPrompt`).
- **Prop drilling.** `App.jsx` owns 22 `useState` values and passes them down: `Sidebar` receives 22 props, `SettingsPanel` 19, `ArticleList` and `ArticleReader` 13 each. There is no context or store.
- **Duplicated logic:**
  - NDJSON parsing in `streamModelPull` versus `readNdjson`
  - The two model-output JSON parsers
  - `buildArticleContext` defined twice
  - Share URLs built in both `ArticleReader` and `AIDrawer`
  - Streaming-with-`requestAnimationFrame` buffering in both `AIDrawer` and `MultiArticlePanel`

### 3.5 Tests
Only utilities are tested: the SSRF guard, OPML URLs, the Gemini Nano adapter, the API client, and text helpers. That is 20 tests. Database modules, routes, hooks and components have none.

### 3.6 Styling
At baseline, `src/index.css` was a single 5,067-line file, organized by comment banners. It is now split by feature into `src/styles/`.

### 3.7 Tooling
- CodeScene PR checks currently run through a different CodeScene project's PR integration. The `atlas-pulse` project has PR integration unset and **no architectural components defined**.
- Local lint does not enforce complexity limits, so new debt is caught only when CodeScene reviews a pull request.

## 4. Target architecture

Components to define, both in code and as CodeScene architectural components:

| Layer | Component | Paths | Responsibility |
|---|---|---|---|
| Backend | **Ingestion** | `server/routes/{feeds,discover,articles}.js`, `server/utils/*` | Fetch, parse and extract feeds and articles (SSRF-guarded) |
| | **Storage** | `server/db/*` | SQLite access, migrations, paging, full-text search |
| | **AI bridge** | `server/routes/{ai,ollama}.js` | Optional Ollama proxy |
| Frontend | **AI engines** | `src/utils/chromeAI.js`, `streamChat` | Gemini Nano and Ollama behind one streaming interface |
| | **AI tasks** _(new)_ | `src/ai/` | Prompts, context building, structured output, parsing: one module per task |
| | **Reading** | `ArticleList`, `ArticleReader`, highlights | Reading experience |
| | **Feeds** | `AddFeedModal`, `useFeeds`, `useFolders`, OPML | Subscriptions |
| | **Studio** _(new)_ | `LibraryView`, `HighlightsLibrary` → Studio | Every saved AI output: browse, search, edit, regenerate |
| | **Publishing** _(new)_ | — | Templates, image and PDF rendering, captions |
| | **Shell & Settings** | `App`, `Sidebar`, `SettingsPanel` | Layout and preferences |

**Artifact model.** Every AI output becomes a saved artifact linked to its source articles:

```
artifacts(id, kind, title, body_md, structured_json, model, ai_settings_json, created_at, updated_at)
  kind ∈ summary | analysis | newsletter | compare | briefing | chat_export
artifact_sources(artifact_id, article_id, article_url, article_title, source)
```

Existing saved summaries migrate to `kind = 'summary'`. Templates consume `structured_json` through declared slots (title, subtitle, bullets, quote, attribution, brand), never free text.

## 5. Work packages

Each package ships as small, behavior-preserving pull requests that keep CodeScene's quality gates green and add tests for what they touch.

| # | Package | Improves | Rationale |
|---|---|---|---|
| ~~0~~ | ~~AI context truncation (3.1)~~ | — | **Done in v1.4.0** |
| **1** | **Data access:** paginated article endpoint, list views without content, SQLite FTS5 full-text search, migration runner (`PRAGMA user_version`) | `db/reader.js`, `routes/reader.js`, `ArticleList`, `useFeeds` | Removes the 78 MB load. Moving search server-side removes `ArticleList`'s heaviest logic. Migrations are a prerequisite for artifacts. |
| **2** | **AI tasks layer (`src/ai/`):** prompts, context building, one output parser, a task runner | `AIDrawer`, `useAIBatchProcessor`, `MultiArticlePanel`, `api.js` | Removes duplication. Foundation for saving every AI output and for templates. |
| **3** | **Component decomposition:** `AIDrawer` into per-tab components plus a `useAIStream` hook; `ArticleReader` into toolbar, share menu and body; `AddFeedModal` into one component per mode; `Sidebar` into nav plus folder tree; `SettingsPanel` into sections | the files below 7.9 | Targets the lowest Code Health scores |
| **4** | **State contexts:** settings, library and selection | `App`, `Sidebar`, `SettingsPanel` | Ends prop drilling |
| **5** | **Ingestion cleanup:** `feedParser`, `feedDiscovery`, `articleExtractor`, `opml` | server utilities | Small, isolated and testable |
| **6** | **Guardrails:** split CSS by feature (still vanilla CSS); add ESLint complexity rules as warnings; configure CodeScene components and PR integration on the `atlas-pulse` project | repo-wide | Stops new debt from re-accumulating |

## 6. Sequencing with the roadmap

| Release | Scope |
|---|---|
| **v1.4.0** | On-device AI (Gemini Nano), optional Ollama, background service, AI context fix |
| **v1.5 — Foundations** | Packages 1 and 2, artifact model and migrations, `ARCHITECTURE.md`. No new UI. |
| **v1.6 — Save everything** | Studio: every AI output saved with its sources; search, edit, regenerate. Package 3 alongside. |
| **v1.7 — Templates** | Client-side template rendering to PNG and PDF (LinkedIn carousel, quote card, newsletter cover, X and Instagram formats), brand kit, AI-written captions. Package 4 alongside. |
| **v1.8 — Automatic output** | Scheduled digests, newsletter RSS feed, HTML email export |

Packages 1 and 2 come first because both new feature areas depend on them. The Studio needs migrations and paging. Templates need structured AI output from the tasks layer.

## 7. How to re-measure

- **CodeScene:** project `atlas-pulse` → Technical Debt → Code Health. Compare against the tables above.
- **Local complexity scan:** these rules (`complexity: 9`, `max-lines-per-function: 70`, `max-depth: 3`, `max-params: 4`, `max-nested-callbacks: 3`) are part of `npm run lint` as warnings. The lint script's `--max-warnings` cap is the ratchet: it started at **58**, was lowered as each package landed, and is now **0**, so any new finding fails CI.
- **Article list payload:** `curl -so /dev/null -w '%{size_download}\n' http://localhost:3001/api/reader/articles`. The Package 1 target is a page under 1 MB.
