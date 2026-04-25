# Atlas Pulse — Personal RSS Feed Reader

**Version 1.1.0**

A modern, privacy-first RSS feed reader that runs entirely on your local machine. No cloud services, no subscriptions, no accounts — your data stays in your browser's IndexedDB. Powered by React, Express, and (optionally) a local Ollama LLM for AI-powered summaries and article chat.

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
> - Express API server on **port 3001** (CORS proxy + AI bridge)
> - Vite proxies all `/api/*` requests to Express automatically

Press `Ctrl + C` to stop everything.

---

## Features

### Reading

| Feature | Details |
|---------|---------|
| **Three article views** | Magazine (card + image), Excerpt (title + snippet + thumbnail), Compact (dense list) |
| **Auto full-text extraction** | Full article pulled from source automatically on open |
| **Reading progress bar** | Accent-colored bar at the top of the reader tracks scroll position |
| **Zen / Focus mode** | Press `f` to expand the reader to full width, hiding all distractions |
| **Keyboard shortcuts** | `j/k` next/prev · `b` bookmark · `o` open original · `f` zen · `Esc` close |

### Organization

| Feature | Details |
|---------|---------|
| **Folders** | Create folders, drag feeds into them, right-click to rename or delete |
| **Saved / Bookmarks** | Bookmark any article; find them under "Saved" in the sidebar |
| **Today view** | Shows only articles published today |
| **Search** | Instant local search across title, content, and source name |
| **Mark all read** | One-click button in the article list header |

### Sharing

| Feature | Details |
|---------|---------|
| **Share popover** | Share to LinkedIn, X/Twitter, Email, or Web Share API |
| **Copy link** | Copy article URL to clipboard from the share menu |

### Appearance

| Feature | Details |
|---------|---------|
| **Dark / Light theme** | Toggle in sidebar header or settings |
| **Collapsible sidebar** | Three states: expanded → icon-only (56 px) → fully hidden |
| **Resizable panels** | Drag the handle between article list and reader to resize |
| **Font picker** | Inter, Serif (Merriweather), Mono (JetBrains Mono), System UI |
| **Accent color** | 6 presets + custom color wheel picker |
| **Text color** | Cool (default), Warm, Pure white, Soft grey |
| **Reader typography** | Adjustable font size, line width, line height in reader settings |

### Feed Management

| Feature | Details |
|---------|---------|
| **URL discovery** | Paste any URL — feeds auto-discovered from `<link>` tags and common paths |
| **Google News search** | Type a keyword to subscribe to a Google News RSS feed |
| **Popular feeds catalog** | Curated feeds across Technology, AI, Business, Science, and more |
| **OPML import / export** | Move your feeds to/from any other RSS reader |
| **Auto-refresh** | Feeds refresh every 30 minutes in the background |

### AI Assistant (requires Ollama)

| Feature | Details |
|---------|---------|
| **AI Summary** | One-click 3–4 sentence summary of the current article, streamed in real time |
| **Share summary** | Copy or share the AI summary directly to LinkedIn / X |
| **Article Chat** | Ask any question about the article; streamed responses with full context |
| **Model selector** | Pick any locally installed Ollama model from a dropdown |
| **Suggestion chips** | Pre-built prompts: key takeaways, simple explanation, author's argument |
| **Stop generation** | Cancel streaming mid-response |

---

## Setting Up AI Features

The AI drawer uses [Ollama](https://ollama.com) — a free, local LLM runner. No API keys, no usage costs.

### 1. Install Ollama

Download from [ollama.com](https://ollama.com) and follow the installer.

### 2. Pull a Model

```bash
# Fast and capable — recommended default
ollama pull deepseek-r1:8b

# Lightest option for older hardware
ollama pull phi4-mini:3.8b

# Most powerful (needs ~20 GB RAM)
ollama pull qwen3-coder:30b
```

### 3. Make Sure Ollama is Running

```bash
ollama serve   # starts the API on http://localhost:11434
```

Ollama usually starts automatically after install. Verify with:

```bash
curl http://localhost:11434   # should print "Ollama is running"
```

### 4. Open the AI Drawer in the App

1. Open any article in the reader.
2. Click the **✦ AI** button in the reader toolbar.
3. The AI drawer slides up from the bottom of the reader.
4. Choose **Summary** for a one-click summary, or **Chat** to ask questions.

The Express backend at `localhost:3001` acts as a bridge between the browser and Ollama (Ollama doesn't allow direct browser requests by default). No article content is ever sent to any external server.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `j` / `↓` / `→` | Next article |
| `k` / `↑` / `←` | Previous article |
| `b` | Toggle bookmark |
| `o` | Open article in original tab |
| `f` | Toggle zen / focus mode |
| `Esc` | Exit zen mode / close reader |

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
│   ├── index.js                  # Server entry point — mounts all routes
│   └── routes/
│       ├── feeds.js              # POST /api/feeds/parse — parse RSS URL
│       ├── discover.js           # POST /api/discover — auto-discover feeds
│       ├── articles.js           # POST /api/articles/extract — full article extraction
│       └── ai.js                 # GET /api/ai/models · POST /api/ai/chat (Ollama proxy)
│   └── utils/
│       ├── feedParser.js         # RSS/Atom parsing (rss-parser)
│       ├── feedDiscovery.js      # HTML link tag + common path discovery
│       └── articleExtractor.js  # Full text extraction (@extractus/article-extractor)
│
└── src/                          # ── REACT FRONTEND (port 5173) ──
    ├── main.jsx                  # React entry — renders <App />
    ├── App.jsx                   # Root component — state, routing, layout
    ├── index.css                 # Full design system (themes, typography, all components)
    │
    ├── components/
    │   ├── Sidebar.jsx           # Left panel — nav, folders, feeds, three-state collapse
    │   ├── ArticleList.jsx       # Middle panel — magazine/excerpt/compact views + search
    │   ├── ArticleReader.jsx     # Right panel — reader, toolbar, progress bar, sharing
    │   ├── AIDrawer.jsx          # AI panel — summary + chat with local LLM via Ollama
    │   ├── AddFeedModal.jsx      # Add feeds via URL / search / popular / alerts
    │   ├── SettingsPanel.jsx     # Appearance + data management settings
    │   ├── ReaderSettings.jsx    # Inline reader typography controls (font size, width, etc.)
    │   └── ResizableHandle.jsx   # Draggable panel resize handle
    │
    ├── db/
    │   └── database.js           # Dexie.js IndexedDB schema (feeds, articles, folders)
    │
    └── utils/
        ├── api.js                # HTTP client — all /api/* calls + streamChat() generator
        ├── helpers.js            # Date formatting, read time estimation, HTML stripping
        └── opml.js               # OPML import/export utilities
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                        BROWSER                          │
│                                                         │
│  ┌──────────┐  ┌─────────────┐  ┌────────────────────┐  │
│  │ Sidebar  │  │ ArticleList │  │  ArticleReader     │  │
│  │ 3 states │  │ 3 view modes│  │  + AI Drawer       │  │
│  └──────────┘  └─────────────┘  └────────────────────┘  │
│                        │                                │
│                 ┌──────────────┐                        │
│                 │  IndexedDB   │  All data local        │
│                 │  (Dexie.js)  │  feeds · articles      │
│                 └──────────────┘  folders · bookmarks   │
│                        │                                │
└────────────────────────┼────────────────────────────────┘
                         │ /api/* (proxied by Vite)
               ┌─────────────────┐
               │   Express.js    │  port 3001
               │  ┌───────────┐  │
               │  │ feeds     │  │  Fetches RSS from internet
               │  │ discover  │  │  Extracts full article text
               │  │ articles  │  │
               │  │ ai ───────┼──┼──► Ollama (localhost:11434)
               │  └───────────┘  │     Local LLM — no data leaves
               └─────────────────┘     your machine
```

### Why a Local Backend?

Browsers block direct cross-origin requests (CORS). The Express server acts as a proxy so the browser can fetch RSS feeds from any website. For AI, it bridges between the browser and Ollama (which also blocks browser requests by default). Everything stays on your machine.

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 19 + Vite 8 | UI + fast HMR dev server |
| Styling | Vanilla CSS | Full design system, dark/light themes |
| Storage | Dexie.js (IndexedDB) | Local-first data persistence |
| Backend | Express.js 5 | CORS proxy + Ollama bridge |
| AI Runtime | Ollama | Local LLM inference — free, private |
| Feed Parsing | rss-parser | RSS/Atom XML parsing |
| Article Extraction | @extractus/article-extractor | Full-text extraction from any URL |
| HTML Sanitization | DOMPurify | Safe HTML rendering in reader |
| Icons | react-icons (hi2, fa, si) | UI iconography |
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

All feeds, articles, folders, read state, and bookmarks are stored in **IndexedDB** inside your browser:

- **Zero cost** — no database server required
- **Fully private** — nothing leaves your machine (including AI queries, which go to your local Ollama instance)
- **Browser-specific** — data lives in the browser you use; switching browsers means starting fresh
- **Clearable** — don't clear site data for `localhost` or you'll lose your feeds

To back up your feeds, use **Settings → Export OPML**.

---

## Troubleshooting

### App shows a blank page or won't load
- Check the terminal for errors.
- `EADDRINUSE` means a port is already in use:
  ```bash
  kill -9 $(lsof -ti:3001) && kill -9 $(lsof -ti:5173)
  npm run dev
  ```

### AI button shows "Ollama offline"
- Make sure Ollama is running: `ollama serve`
- Verify: `curl http://localhost:11434` → should return `Ollama is running`
- Make sure you've pulled at least one model: `ollama list`

### AI responses are slow
- Use a smaller model like `phi4-mini:3.8b` — select it in the model picker inside the AI drawer.
- Larger models (14B+) need significant RAM; on machines with less than 16 GB, stick to 7–8B models.

### Feeds show an error when adding
- Some sites block automated requests (403/429). Try the direct RSS URL instead of the homepage.
- Example: `https://feeds.bbci.co.uk/news/rss.xml` instead of `https://bbc.com`

### Full article doesn't load ("Feed content only")
- The source site blocked extraction. Click **Open** in the toolbar to read in a new tab.

### Need to reset everything
- **Settings → Clear All Data** wipes all IndexedDB data and starts fresh.

---

## Changelog

### v1.1.0
- **AI Assistant** — Summary and chat powered by local Ollama models; streaming responses; model picker; LinkedIn/X sharing from summary
- **Excerpt view** — New article list view with title, snippet, and thumbnail
- **Sidebar collapse** — Three-state sidebar: expanded → icon-only → hidden
- **Settings expansion** — Font picker (4 options), accent color wheel (6 presets + custom hex), text color variants
- **Reader enhancements** — Reading progress bar, zen/focus mode, expanded keyboard shortcuts (j/k/b/o/f)
- **Share popover** — LinkedIn, X/Twitter, Email, Web Share API, Copy Link
- **OPML import/export** — Full feed portability

### v1.0.0
- Initial release: RSS reading, full-text extraction, folders, bookmarks, dark/light theme, resizable panels, reader settings
