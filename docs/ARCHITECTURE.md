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
  Shell              src/app, shell/ (app rail, ⌘K), sidebar/
  Settings           settings/ screen, registry, settings.json sync
  Feeds              add-feed/, useFeeds, useFolders, OPML
  Reading            article-list/, reader/, highlights/
  AI surfaces        ai-drawer/ (AI rail), multi-article/, batch
  AI tasks           src/ai  ──►  AI engines: streamChat()
                                   ├─ Gemini Nano (in browser)
                                   └─ Ollama ───────────────┐
  Library            library/ (Summaries, Highlights)       │
        │ /api/*                                            │
Server ─┼───────────────────────────────────────────────────┼────────
  Ingestion          routes/{feeds,discover,articles}, utils│
  Storage            db/*  (SQLite + migrations + FTS5)     │
  AI bridge          routes/{ai,ollama} ◄───────────────────┘
```

## Target shape

Atlas Pulse is a **modular monolith**: one app, one repo, one server process, with firm boundaries inside it. The one real split is between runtimes. Gemini Nano exists only inside Chrome, and storage and ingestion live in Node. Don't add others: there are no separate teams and nothing to scale independently, so services would only add network calls and versioning.

The app grows toward four layers:

```
Features      vertical slices: Reading, Feeds, Library, Studio, AI surfaces, Settings
   │          each owns its components, hooks and tests
   ▼
Registries    settings · prompts · engines · templates
   │          the app is composed from these instead of being wired in App.jsx
   ▼
Core          pure logic: src/ai, *Model.js, parsers, shared/  (no React, no I/O)
   │
Ports         Engine · Store · Fetcher · Platform
   ▼
Adapters      Nano | Ollama · HTTP + SQLite · launchd | installer
```

Each future goal should land as a new feature or a new adapter, not as a rewrite:

| Goal | Lands as |
|---|---|
| Newsletters and social templates | A Studio feature, plus templates in a template registry |
| A new AI model or provider | An Engine adapter |
| More settings, prompts or profiles | Entries in the settings and prompt registries |
| A one-click installer for non-coders | A Platform adapter: bundled server, login service, Chrome app window |
| Turning Ollama off | Not registering the Ollama engine |

Gemini Nano only exists in Google Chrome, so any packaging keeps the UI in Chrome. Electron and Tauri would lose the default engine.

### Where we are

| Layer | Today | Built when |
|---|---|---|
| Features | Feature folders under `src/components/` | Done; keep the rule |
| Core | `src/ai/`, models and parsers, all tested | Done; keep the rule |
| Settings and prompt registries | `src/components/settings/registry.js`, `src/ai/promptRegistry.js`, Simple/Power switch | Done (#90) |
| Engine port | `streamChat()` switches on the model name; `isNanoModel` is still checked in callers | With the newsletter work |
| Template registry and Studio | None | With the newsletter templates |
| Store and Fetcher ports | `api.js` is the single seam, but it is the HTTP implementation | Only when a second backend is real |
| Platform port | `scripts/service.sh` (macOS launchd) | With the installer |

### Define now, build just in time

The boundaries and rules in this document are decided up front. The abstractions that fill them are built inside the first feature that needs them, in that feature's pull request, so their interface is shaped by a real caller instead of a guess. The settings registry was built this way, inside the settings screen.

- **A port needs a second implementation, or a seam that already exists.** The Engine port qualifies (Nano and Ollama). Store and Fetcher wait for a second backend.
- **A registry needs real entries.** Build the template registry with the first templates.
- **Every adapter of a port passes the same contract tests.**
- **No speculative layers.** If a goal is parked, its abstraction stays a row in the table above.

## Components

These are also the architectural components in CodeScene (project 86144), so its hotspot, change-coupling and Code Health views can be read per component. Every tracked file belongs to exactly one component; the patterns don't overlap. When you add a file outside these patterns, or move one, update this table and CodeScene together.

| Layer | Component | Paths | Owns |
|---|---|---|---|
| Server | **Ingestion** | `server/routes/{feeds,discover,articles,favicon}.js`, `server/utils/{articleExtractor,articleFields,favicon,feedDiscovery,feedParser,feedText,fetchText,text,urlGuard}.js` | Fetching, parsing and extracting feeds and articles, and favicons. Every outbound URL passes `assertPublicHttpUrl` / `safeFetch` (SSRF guard). |
| | **Storage** | `server/db/**`, `server/routes/{reader,summaries,highlights}.js` | SQLite access, migrations, list views, full-text search. New stored data (such as newsletters) gets its route here. |
| | **AI bridge** | `server/routes/{ai,ollama}.js`, `server/utils/stream.js` | Optional proxy to a local Ollama, plus its install and start helpers. |
| | **Platform** | `server/index.js`, `scripts/**`, `.github/**`, `vite.config.js`, `eslint.config.js`, `jsconfig.json`, `package.json`, `index.html`, `.gitignore` | Server wiring, the background service, build and CI. The installer goes here. |
| Shared | **Shared** | `shared/{searchQuery,csv}.js` | Query tokenizing (server FTS and client ranking) and CSV export. |
| Client | **API client** | `src/utils/api.js` | The only place the client talks to the server. Every feature touches it, so it is a hotspot by design. |
| | **Shell** | `src/App.jsx`, `src/main.jsx`, `src/app/**`, `src/lib/appEvents.js`, `src/components/Sidebar.jsx`, `src/components/{shell,sidebar}/**`, `src/utils/{helpers,constants}.js` | Layout, panes, the app rail, the ⌘K palette, navigation, and the app-wide contexts (Appearance, Toast, Library). |
| | **Design system** | `src/components/ui/**`, `src/lib/utils.js`, `components.json`, `src/index.css`, `src/styles/{tokens,base,fonts,tailwind}.css`, `src/hooks/{useClickOutside,useConfirmAction,useOnKeyChange,usePolling,keys}.js`, `public/**` | Tailwind v4 and shadcn/ui primitives, tokens, fonts, the page frame, and generic hooks. |
| | **Settings** | `src/components/settings/**`, `src/settings/**`, `src/utils/{aiSettings,batchSettings,readerSettings,storage}.js`, `shared/settingsKeys.js`, `server/settings.js`, `server/routes/settings.js` | The settings registry and screen (Simple/Power), the `data/settings.json` sync, and safe `localStorage`. |
| | **Feeds** | `src/components/FeedFavicon.jsx`, `src/components/add-feed/**`, `src/hooks/{useFeeds,useFolders}.js`, `src/utils/{feedSync,opml}.js` | Subscriptions, folders, refresh, OPML import and export. `feedSync.js` holds the operations; `useFeeds` wraps them in React state. |
| | **Reading** | `src/components/{ArticleList,ArticleReader}.jsx`, `src/components/{article-list,reader,highlights}/**`, `shared/{search,aiFilters}.js`, `server/db/articlePages.js`, `src/styles/{article-list,reader}.css` | The list, the reader, highlights and search. |
| | **AI engines** | `src/utils/chromeAI.js`, `src/components/ollama/**` | Gemini Nano and the Ollama setup. `streamChat()` is still in `api.js`; it moves here with the Engine port. |
| | **AI tasks** | `src/ai/**` | Prompts, the prompt registry, article context, output parsing and the batch helpers. One module per concern; no React. |
| | **AI surfaces** | `src/components/{ai-drawer,multi-article}/**`, `src/hooks/{useAIBatchProcessor,useStreamRun,useTokenBuffer}.js` | The AI rail, the multi-article panel and background batch processing. |
| | **Library** | `src/components/library/**` | The Summaries and Highlights screens. |
| | **Export** | `src/utils/{docx,share}.js` | Word export and sharing. Newsletter PNG, PDF and HTML export goes here. |
| | **Studio** | `src/components/studio/**` | Saved, editable AI outputs such as newsletters, and their templates. Empty until the newsletter work starts. |

Tests (`*.test.js`) belong to the component of the file they test. CodeScene excludes `docs/**`, `package-lock.json`, `dist/**` and `data/**`.

## Dependency rules

- **Components never call `fetch`.** They go through `src/utils/api.js`, or through a hook that does.
- **`src/ai/` has no React and no network.** It builds messages and parses output. `tasks.js` is the only module that calls an engine, through `streamChat`.
- **AI features must work with both engines.** Call `streamChat(model, messages)`. Never call Gemini Nano or Ollama directly. New engine-specific behavior goes into the engine, not into its callers.
- **Features don't import each other's internals.** A feature uses another one through its top-level component, a context in `src/app/`, `appEvents`, or a registry.
- **Feature folders own their pieces.** A top-level component such as `ArticleList.jsx` composes the hooks and subcomponents in its folder (`article-list/`). Pure logic lives in a `*Model.js` or `listLogic.js` file and has tests.
- **App-wide state lives in a context.** Use `src/app/`. Don't thread props through `App.jsx`.
- **The server owns persistent data.** Settings live in `data/settings.json`; browser `localStorage` is their working copy plus per-device layout state.

## Data

All data is in one SQLite database, `data/reader.db` (or in `ATLAS_DATA_DIR` if set), opened once by `server/db/database.js`:

| Tables | Schema version |
|---|---|
| feeds, folders, articles, `articles_fts`, favicons, summaries, highlights | 6 |

Summaries and highlights had files of their own (`summaries.db`, `highlights.db`) until v6. On first start `server/db/legacyMerge.js` copies their rows in, keeping ids, and renames the old files `*.merged`. One database lets queries join articles with the summaries and highlights saved from them.

Each schema change is a numbered migration in `server/db/migrations/reader.js`. `server/db/migrate.js` applies pending migrations in order and records progress in `PRAGMA user_version`. Databases from before the migration runner are adopted as version 1. Never edit a released migration; add a new one.

Settings are in `data/settings.json`, a flat `{ "atlas-pulse-…": "<string>" }` file you can read, edit or back up. `shared/settingsKeys.js` lists the keys it accepts. Per-device layout state (sidebar and pane widths, list and rail visibility, scroll positions) stays in the browser. At startup `src/settings/sync.js` copies the file into `localStorage`, which the app reads synchronously; if the file is still empty, it seeds the file from the browser instead. After that, every `writeStored()` of a synced key is sent back through `PUT /api/settings` (batched).

The article list is paged on the server. `GET /api/reader/articles/page` (`server/db/articlePages.js`) returns 150 rows of `LIST_COLUMNS`, which leave out the article body, plus the view's total, unread count and AI-filter values. Search ranking (`shared/search.js`) and the AI filters (`shared/aiFilters.js`) run on the server: browsing filters in SQL; a search ranks the view's rows, using FTS5 matches from `articles_fts` (contentless, porter tokenizer) for bodies. The reader fetches a single article in full.

In the browser, server data for the list goes through TanStack Query (`src/lib/queryClient.js`). `useArticleListData` is an infinite query keyed by view, search and filters. The virtual list asks for the next page near its end. Optimistic edits patch the cached pages, and a refresh invalidates them, which refetches the loaded pages. Other server data still uses plain hooks; move it to queries as features need caching.

## Request flows

**Refreshing a feed.** `useFeeds.refreshFeed` → `refreshOne` (`src/utils/feedSync.js`) → `POST /api/feeds/parse` (Ingestion fetches and normalizes the feed) → `bulkInsertArticles` (Storage skips known GUIDs and canonical links, writes rows, excerpts and FTS entries) → new articles in scope are queued for batch AI.

**Summarizing an article.** `useArticleSummary` → `summaryMessages()` (`src/ai/tasks.js`) → `streamChat` → Gemini Nano or Ollama → tokens are batched to the UI with `useTokenBuffer` → the user saves → `POST /api/summaries`.

**Batch processing.** `useAIBatchProcessor` polls the queue count. While articles are queued, it takes the newest one, runs `batchMessages`, parses the result with `parseBatchResult`, and stores it with `batchUpdates` (`src/ai/batch.js`).

## Where new features go

- **A new AI output** (for example newsletters): add the prompt and parser to `src/ai/`, the UI under `src/components/studio/`, and store results through a Storage route backed by a migration.
- **A new feed source:** add it to Ingestion behind the URL guard, and return the same normalized item shape as `normalizeItem`.
- **A new setting:** add it to the registry in `src/components/settings/registry.js` (and its key to `shared/settingsKeys.js` if it syncs to `settings.json`).
- **A new file outside the component patterns:** add it to a component in the table above and in CodeScene, so nothing goes unassigned.
- **New styles:** build new UI with Tailwind classes and shadcn/ui components (`npx shadcn@latest add <name>` writes JSX into `src/components/ui/`). Use `cn()` from `@/lib/utils` to combine classes.
- **Bundle size:** screens opened now and then (Settings, Add feeds, ⌘K, AI Summaries, Highlights, the multi-article panel) are `lazy()` imports in `App.jsx`, and the `docx` library loads only when a Word file is downloaded (`src/utils/docx.js`). Keep new occasional screens and heavy libraries out of the startup bundle the same way.
- **Styling:** every component is styled with Tailwind classes; Tailwind scans the project and its preflight is the CSS reset. `src/styles/tailwind.css` imports `index.css` into the `components` layer (above preflight, below utilities), which holds the design tokens (`tokens.css`), fonts, the page frame (`base.css`), and the reader (`reader.css`: docked/overlay/focus panel layout, and `.reader-article-content`, the prose styles for arbitrary article HTML). shadcn's semantic colors (`bg-primary`, `text-muted-foreground`…) map to the tokens in `tokens.css`; every pane's top bar uses `--pane-header-height`. Positioning that a media or container query must override (the AI rail's overlay mode) lives in CSS, not a utility, since utilities win over the components layer.

## Guardrails

- `npm run lint` enforces complexity limits as warnings: complexity 9, 70 lines per function, nesting depth 3, 4 parameters, 3 nested callbacks. The `--max-warnings` cap is **0**, so any new finding fails CI.
- `npm test` runs every `*.test.js` with Node's test runner. Pure logic (models, parsers, prompts, migrations) is tested. Prompt tests pin each prompt byte for byte, so a prompt change is always deliberate.
- CodeScene reviews every pull request. Its gate requires new and changed code to be at full Code Health.
- CodeScene's architecture view (project 86144) shows hotspots, Code Health and change coupling per component. Coupling between components that should be independent is the early sign that a rule is being bent.
