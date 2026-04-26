# Atlas Pulse — Personal RSS Feed Reader

**Version 1.3.0**

A modern, privacy-first RSS feed reader that runs entirely on your local machine. No cloud services, no subscriptions, no accounts — your data stays in your browser's IndexedDB. Powered by React, Express, and (optionally) a local Ollama LLM for AI-powered summaries, content analysis, and article chat.

---

## Quick Start

### Prerequisites

- **Node.js** v18 or later — `node -v`
- **npm** (bundled with Node.js) — `npm -v`
- **Ollama** _(optional, for AI features)_ — [ollama.com](https://ollama.com)

### Run the App

```bash
# 1. Navigate to the project folder
cd "/path/to/RSS Feed Reader"

# 2. Install dependencies (first time only, or after pulling updates)
npm install

# 3. Start frontend + backend together
npm run dev
```

Open **http://localhost:5173** in your browser.

> **What starts:**
> - Vite dev server on **port 5173** (React frontend)
> - Express API server on **port 3001** (CORS proxy + Ollama bridge)
> - Vite proxies all `/api/*` requests to Express automatically

Press `Ctrl + C` to stop everything.

---

## Features

### Reading

| Feature | Details |
|---------|---------|
| **Three article views** | Grid (portrait thumbnail cards), List (title + excerpt + thumbnail), Compact (dense single-line rows) |
| **Auto full-text extraction** | Full article pulled from source automatically on open |
| **Reading progress bar** | Accent-colored bar at the top of the reader tracks scroll position |
| **Zen / Focus mode** | Press `f` to expand the reader to full width, hiding all distractions |
| **Keyboard shortcuts** | `j/k` next/prev · `b` bookmark · `o` open original · `f` zen · `Esc` close |

### Organization

| Feature | Details |
|---------|---------|
| **Folders** | Create folders, move feeds into them, right-click to rename or delete |
| **Saved / Bookmarks** | Bookmark any article; find them under "Saved" in the sidebar |
| **Today view** | Shows only articles published today |
| **Search** | AND-logic tokenized search — "cloud AI" matches articles containing both terms anywhere; quoted phrases for exact match; results ranked by relevance (title › source › AI topics › body) |
| **Mark all read** | One-click button in the article list header |
| **AI Only filter** | Toggle in the article list header to show only AI-analyzed articles |
| **Content filters** | Per-dimension dropdown pills (Sentiment · Urgency · Frame · Tone · Depth) — shown when AI analysis data is available |

### Appearance

| Feature | Details |
|---------|---------|
| **Dark / Light theme** | Toggle in sidebar header or settings |
| **Collapsible sidebar** | Three states: expanded → icon-only (56 px) → fully hidden |
| **Resizable panels** | Drag the handle between article list and reader to resize |
| **Font picker** | Inter, Poppins, Lato, Nunito, Merriweather, Garamond, Times, Mono, System UI |
| **Accent color** | 6 presets + full custom color picker |
| **Text color** | 4 presets (Cool, Warm, Pure, Soft) + full custom color picker |
| **Reader typography** | Adjustable font size, line width, line height in reader settings |

### Feed Management

| Feature | Details |
|---------|---------|
| **URL discovery** | Paste any URL — feeds auto-discovered from `<link>` tags and common paths |
| **Google News search** | Type a keyword to subscribe to a Google News RSS feed |
| **Popular feeds catalog** | Curated feeds across Technology, AI, Business, Science, and more |
| **OPML import / export** | Move your feeds to/from any other RSS reader |
| **Configurable auto-refresh** | Off, 15 min, 30 min, 1 hr, or 2 hr — set in Settings → Reading |

### AI Features (requires Ollama)

| Feature | Details |
|---------|---------|
| **Guided Ollama setup** | Built-in wizard detects install status, starts Ollama, and pulls recommended models — no terminal needed |
| **AI Summary** | On-demand 3–4 sentence summary of the current article, streamed in real time |
| **Content Analysis** | On-demand classification across 5 dimensions: Sentiment, Urgency, Frame, Tone, Depth — with topic tags |
| **Article Chat** | Ask any question about the article; streamed responses with full context |
| **Background Batch Processing** | Automatically summarizes and classifies new articles in the background as you read |
| **On-demand batch trigger** | `✨` button in the article list header queues the latest N articles for immediate processing |
| **AI processing indicator** | Spinner with remaining count appears in the header while batch is running |
| **AI Summaries Library** | Save any AI summary to a persistent SQLite library; search, browse, and export as CSV |
| **Model selector** | Dropdown populated from your installed Ollama models |
| **AI processed badge** | Sparkle icon appears on analyzed articles in all three list views |

### Multi-Article AI Actions

| Feature | Details |
|---------|---------|
| **Multi-select** | Click the checkbox on any article card to select it (or click blank space); `Escape` clears selection |
| **Floating action bar** | Appears at the bottom of the article list when ≥1 article is selected — Mark Read, Bookmark, CSV export, AI Actions |
| **Compare Sources** | 2–5 articles → AI side-by-side analysis of angle, framing, key claims, what's missing, tone, and evidence |
| **Generate Newsletter** | 3–15 articles → AI-written Daily Digest, Weekly Roundup, or Executive Brief in Markdown |
| **AI Briefing** | 2–15 articles → free-form prompt answered using only the selected articles as context |
| **Streaming output** | All multi-article AI operations stream token by token with a live cursor |
| **Active config strip** | Shows the active AI personas, tone settings, and custom instructions before generating |
| **Export** | Copy, download as Markdown (`.md`), download as Word (`.docx`), or open in email client |

---

## Setting Up AI Features

The app uses [Ollama](https://ollama.com) — a free, local LLM runner. No API keys, no usage costs. The app has a built-in setup wizard, but you can also set up manually.

### Option A: Built-in Wizard (recommended)

1. Open **Settings → AI Processing**.
2. The Ollama section detects whether Ollama is installed and running.
3. Follow the prompts: download → start → pull a model. Done.

### Option B: Manual Setup

**1. Install Ollama**

Download from [ollama.com](https://ollama.com) and follow the installer.

**2. Pull a Model**

```bash
# Fast — good default for most machines
ollama pull deepseek-r1:7b

# Lightweight — best for older hardware
ollama pull qwen2.5:3b

# Balanced quality/speed
ollama pull llama3.1:8b
```

**3. Make Sure Ollama is Running**

```bash
ollama serve   # starts the API on http://localhost:11434
```

Verify with:

```bash
curl http://localhost:11434   # should print "Ollama is running"
```

**4. Open the AI Drawer**

1. Open any article in the reader.
2. Click the **✦ AI** button in the reader toolbar.
3. Choose a tab: **Summary**, **Analysis**, or **Chat**.

### Using Background Batch Processing

1. Open **Settings → AI Processing**.
2. Set your model, choose what to generate (Summary / Analysis / Both), and set articles-per-cycle.
3. Enable **Background batch processing**.
4. New articles will be automatically analyzed after each feed refresh.
5. To process existing articles immediately, click the `✨` button in the article list header.

> All AI queries go to your local Ollama instance. No article content is ever sent to any external server.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `j` / `↓` / `→` | Next article |
| `k` / `↑` / `←` | Previous article |
| `b` | Toggle bookmark |
| `o` | Open article in original tab |
| `f` | Toggle zen / focus mode |
| `/` | Focus search box |
| `Esc` | Clear selection · clear search · exit zen mode · close reader |

---

## Project Structure

```
RSS Feed Reader/
│
├── package.json                  # Dependencies & npm scripts
├── vite.config.js                # Vite config + /api proxy to port 3001
├── index.html                    # HTML entry point
│
├── server/                       # ── EXPRESS BACKEND (port 3001) ──
│   ├── index.js                  # Server entry — mounts all routes
│   └── routes/
│       ├── feeds.js              # POST /api/feeds/parse — parse RSS URL
│       ├── discover.js           # POST /api/discover — auto-discover feeds
│       ├── articles.js           # POST /api/articles/extract — full article extraction
│       ├── ai.js                 # GET /api/ai/models · POST /api/ai/chat (Ollama proxy)
│       ├── ollama.js             # GET /api/ollama/status · POST /api/ollama/start|pull
│       └── summaries.js          # CRUD + export for saved AI summaries (SQLite)
│   └── utils/
│       ├── feedParser.js         # RSS/Atom parsing (rss-parser)
│       ├── feedDiscovery.js      # HTML link tag + common path discovery
│       └── articleExtractor.js  # Full text extraction (@extractus/article-extractor)
│
└── src/                          # ── REACT FRONTEND (port 5173) ──
    ├── main.jsx                  # React entry — renders <App />
    ├── App.jsx                   # Root — state, layout, auto-refresh, batch wiring
    ├── index.css                 # Full design system (themes, typography, all components)
    │
    ├── components/
    │   ├── Sidebar.jsx           # Left panel — nav, folders, feeds, library badge
    │   ├── ArticleList.jsx       # Middle panel — grid/list/compact + multi-select + AI filters
    │   ├── ArticleReader.jsx     # Right panel — reader, toolbar, progress bar, sharing
    │   ├── AIDrawer.jsx          # AI panel — Summary / Analysis / Chat tabs
    │   ├── MultiArticlePanel.jsx # Multi-article AI panel — Compare / Newsletter / Briefing
    │   ├── OllamaSetup.jsx       # Guided Ollama install/start/model-pull wizard
    │   ├── LibraryView.jsx       # Full-panel saved summaries library
    │   ├── AddFeedModal.jsx      # Add feeds via URL / search / popular
    │   ├── SettingsPanel.jsx     # Appearance, Reading, AI Processing, Data settings
    │   ├── ReaderSettings.jsx    # Inline reader typography controls
    │   └── ResizableHandle.jsx   # Draggable panel resize handle
    │
    ├── db/
    │   └── database.js           # Dexie.js IndexedDB schema v6 (feeds, articles, folders)
    │                             # Articles carry: aiStatus, aiSummary, aiAnalysis, canonicalLink
    │
    ├── utils/
    │   ├── api.js                # HTTP client — all /api/* calls + streamChat() generator
    │   ├── batchSettings.js      # Batch processor config (enabled, model, features, maxPerCycle)
    │   ├── helpers.js            # Date formatting, read time, HTML stripping, canonicalizeUrl
    │   ├── aiSettings.js         # AI persona + tone configuration, buildSystemPrompt
    │   ├── constants.js          # Auto-refresh options, popular feeds
    │   ├── opml.js               # OPML import/export
    │   └── docx.js               # Client-side Markdown → .docx export
    │
    └── hooks/
        ├── useFeeds.js           # Feed CRUD + refresh (dedup by canonicalLink, queues for batch)
        ├── useFolders.js         # Folder management
        └── useAIBatchProcessor.js # Background AI engine — queue watcher, processOne loop,
                                  # triggerBatch (on-demand), pause/resume, progress tracking
```

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                            BROWSER                               │
│                                                                  │
│  ┌──────────┐  ┌───────────────────────┐  ┌──────────────────┐  │
│  │ Sidebar  │  │     ArticleList       │  │  ArticleReader   │  │
│  │ 3 states │  │  Grid/List/Compact    │  │  + AI Drawer     │  │
│  │ lib badge│  │  AI filters + trigger │  │  Sum/Anal/Chat   │  │
│  └──────────┘  └───────────────────────┘  └──────────────────┘  │
│                              │                                   │
│              ┌───────────────────────────┐                       │
│              │         IndexedDB         │  All data local       │
│              │  feeds · articles         │  aiStatus             │
│              │  folders · bookmarks      │  aiSummary            │
│              │  (Dexie.js)               │  aiAnalysis           │
│              └───────────────────────────┘                       │
│              ┌───────────────────────────┐                       │
│              │   useAIBatchProcessor     │  Background engine    │
│              │   watches queue depth     │  processes newest     │
│              │   processOne() loop       │  articles first       │
│              └───────────────────────────┘                       │
│                              │                                   │
└──────────────────────────────┼───────────────────────────────────┘
                               │ /api/* (proxied by Vite)
                    ┌──────────────────────┐
                    │      Express.js      │  port 3001
                    │  ┌────────────────┐  │
                    │  │ feeds          │  │  Fetches RSS
                    │  │ discover       │  │  Extracts full text
                    │  │ articles       │  │
                    │  │ ai ────────────┼──┼──► Ollama :11434
                    │  │ ollama         │  │     Local LLM
                    │  │ summaries ─────┼──┼──► SQLite (library)
                    │  └────────────────┘  │
                    └──────────────────────┘
```

### Why a Local Backend?

Browsers block direct cross-origin requests (CORS). The Express server acts as a proxy so the browser can fetch RSS feeds from any website. For AI, it bridges between the browser and Ollama (which also blocks direct browser requests). Everything stays on your machine — including AI summaries saved to a local SQLite database.

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 19 + Vite 8 | UI + fast HMR dev server |
| Styling | Vanilla CSS | Full design system, dark/light themes |
| Storage | Dexie.js (IndexedDB) | Local-first article/feed data |
| Storage | SQLite (better-sqlite3) | Saved AI summaries library |
| Backend | Express.js 5 | CORS proxy + Ollama bridge |
| AI Runtime | Ollama | Local LLM inference — free, private |
| Feed Parsing | rss-parser | RSS/Atom XML parsing |
| Article Extraction | @extractus/article-extractor | Full-text extraction from any URL |
| HTML Sanitization | DOMPurify | Safe HTML rendering in reader |
| Icons | react-icons (hi2) | UI iconography |
| Dev Runner | concurrently | Frontend + backend in one command |

---

## npm Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend (Vite) + backend (Express) concurrently |
| `npm run dev:frontend` | Start only the Vite frontend |
| `npm run dev:server` | Start only the Express backend |
| `npm run build` | Build production frontend bundle to `dist/` |
| `npm run preview` | Preview the production build locally |

---

## Data & Privacy

| Data | Where stored |
|------|-------------|
| Feeds, articles, folders, bookmarks, read state | IndexedDB in your browser |
| AI batch settings, view preferences | `localStorage` |
| Manually saved AI summaries | SQLite file (server-side, local) |

- **Fully private** — nothing leaves your machine, including AI queries
- **Browser-specific** — IndexedDB data is tied to the browser; switching browsers means starting fresh
- **Backup** — use **Settings → Export OPML** to back up your feed list

---

## Troubleshooting

### App won't load / blank page
Check the terminal for errors. `EADDRINUSE` means a port is in use:
```bash
kill -9 $(lsof -ti:3001) && kill -9 $(lsof -ti:5173)
npm run dev
```

### AI drawer shows "Checking Ollama…" for a long time
- Make sure Ollama is running: `ollama serve`
- Verify: `curl http://localhost:11434` → should return `Ollama is running`
- The app's built-in wizard (Settings → AI Processing) can start Ollama for you

### No models in the model dropdown
- Pull a model: `ollama pull qwen2.5:3b`
- Or use the **Pull model** button in the Ollama setup section of Settings

### Batch processing isn't analyzing the latest articles
- Click the `✨` button in the article list header to trigger an on-demand run
- This queues the N most recent unprocessed articles (N = Articles per cycle setting)

### AI responses are slow
- Use a smaller model (3B–7B parameters) — select it in Settings → AI Processing or the AI drawer
- Larger models (14B+) need significant RAM; stick to 7–8B on machines with less than 16 GB

### Feeds show an error when adding
- Some sites block automated requests (403/429). Try the direct RSS URL instead of the homepage
- Example: `https://feeds.bbci.co.uk/news/rss.xml` instead of `https://bbc.com`

### Full article doesn't load
- The source site blocked extraction. Click **Open** in the toolbar to read in a new tab

### Reset everything
- **Settings → Clear All Data** wipes all IndexedDB data

---

## Changelog

### v1.3.0
- **Multi-select with AI Actions** — Select 2–15 articles via checkboxes; floating action bar appears with Mark Read, Bookmark, CSV, and AI Actions menu
- **Compare Sources** — AI side-by-side comparison of 2–5 articles across angle, framing, key claims, omissions, tone, and evidence
- **Generate Newsletter** — AI-written Daily Digest, Weekly Roundup, or Executive Brief from 3–15 articles
- **AI Briefing** — Free-form prompt answered using 2–15 selected articles as grounded context
- **Multi-article export** — Copy, download as Markdown (`.md`), download as Word (`.docx`), or email from the AI panel
- **Active AI config strip** — MultiArticlePanel shows the currently active personas, tone presets, and custom instructions before generating
- **Improved search** — AND-logic tokenized search: "cloud AI" finds both terms anywhere in the article; "quoted phrases" for exact match; results ranked by title › source › AI topics › body weight
- **Cross-feed deduplication** — Wire stories appearing in multiple feeds are stored only once; canonical URL normalization strips tracking params (`utm_*`, `fbclid`, etc.), `www.` prefix, fragments, and sorts query params (DB v6 migration with backfill)
- **`/` shortcut** — Press `/` anywhere to focus the search box
- **`Escape` improvements** — Clears multi-select → clears search → exits zen mode, in priority order

### v1.2.0
- **Background AI batch processing** — Automatically summarizes and classifies new articles using a local Ollama model; configurable in Settings
- **Content Analysis** — 5-dimension article classification (Sentiment, Urgency, Frame, Tone, Depth) + topic tags; available on-demand in the AI drawer's Analysis tab
- **On-demand batch trigger** — `✨` button in the article list header queues the latest N articles for immediate analysis; shows live progress indicator while running
- **AI Summaries Library** — Full-panel view for browsing, searching, and exporting manually saved summaries (SQLite-backed)
- **Per-dimension filter pills** — Content filters organized by dimension with dropdown selectors; replaces flat chip list
- **AI Only filter** — Toggle in article list header to show only AI-analyzed articles
- **AI processed badge** — Sparkle indicator on analyzed articles; own column in compact view, badge pill in list view, image overlay in grid view
- **Guided Ollama setup wizard** — Built-in UI for detecting, starting, and pulling models; no terminal required
- **Model dropdown** — Settings shows a live dropdown of installed Ollama models instead of a text field
- **Configurable auto-refresh** — Off / 15 min / 30 min / 1 hr / 2 hr (previously fixed at 30 min)
- **Custom text color picker** — Full color picker for text color alongside the 4 presets

### v1.1.0
- **AI Assistant** — Summary and chat powered by local Ollama models; streaming responses; model picker; LinkedIn/X sharing from summary
- **Excerpt view** — Article list view with title, snippet, and thumbnail
- **Sidebar collapse** — Three-state sidebar: expanded → icon-only → hidden
- **Settings expansion** — Font picker (9 options), accent color wheel (6 presets + custom hex), text color variants
- **Reader enhancements** — Reading progress bar, zen/focus mode, expanded keyboard shortcuts
- **Share popover** — LinkedIn, X/Twitter, Email, Web Share API, Copy Link
- **OPML import/export** — Full feed portability

### v1.0.0
- Initial release: RSS reading, full-text extraction, folders, bookmarks, dark/light theme, resizable panels
