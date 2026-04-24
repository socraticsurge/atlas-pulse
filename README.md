# FeedFlow — Personal RSS Feed Reader

A fully functional, Feedly-style RSS feed reader that runs entirely on your local machine at **zero cost**. No cloud services, no subscriptions, no accounts — your data stays on your computer in the browser's IndexedDB.

---

## Quick Start

### Prerequisites

- **Node.js** (v18 or later) — check with `node -v`
- **npm** (comes with Node.js) — check with `npm -v`

### Run the App

```bash
# 1. Open a terminal and navigate to this folder
cd "/Users/vinaychaganti/Documents/RSS Feed Reader"

# 2. Install dependencies (only needed the first time, or after pulling new changes)
npm install

# 3. Start the app (runs both frontend + backend concurrently)
npm run dev
```

The app will open at: **http://localhost:5173/**

> **What happens under the hood:**
> - The **Vite frontend** starts on port `5173`
> - The **Express backend** starts on port `3001`
> - The `concurrently` package runs both in a single terminal
> - Vite proxies all `/api/*` requests to the Express backend (configured in `vite.config.js`)

### Stop the App

Press `Ctrl + C` in the terminal where `npm run dev` is running.

---

## How to Use

### Adding Feeds

1. Click **"+ Add Content"** at the bottom of the sidebar.
2. Four tabs are available:
   - **URL** — Paste any website or RSS feed URL to auto-discover feeds.
   - **Search** — Type a keyword (e.g., "artificial intelligence") to generate a Google News RSS feed you can subscribe to.
   - **Popular** — Browse curated feeds by category (Technology, AI, Business, Science, etc.). Click any to add.
   - **Alerts** — Step-by-step instructions for adding Google Alerts as RSS.

### Organizing with Folders

- Click the **📁 icon** next to "FOLDERS" in the sidebar to create a new folder.
- **Right-click** any feed → **"Move to folder"** to reorganize feeds between folders.
- **Right-click** a folder to rename or delete it.

### Reading Articles

- Click any article in the middle panel to read it.
- Full article content is **automatically extracted** from the original page (no need to click anything).
- A green **"✓ Full article loaded"** badge confirms full extraction.
- If extraction fails, the RSS summary is shown with an **"Open Original"** link.

### Searching Articles

- Click the **🔍 icon** in the article list header to open the search bar.
- Type any keyword to filter articles by title, content, or source name.
- Search is instant and fully local — no data leaves your machine.

### Other Features

- **Bookmark** articles using the bookmark icon in the reader toolbar → access them via **"Saved"** in the sidebar.
- **Mark all read** — button in the article list header.
- **Dark/Light theme** — toggle the sun/moon icon in the top-right of the sidebar.
- **Auto-refresh** — feeds refresh automatically every 30 minutes while the app is running.
- **Manual refresh** — click **"Refresh All"** at the bottom of the sidebar.

---

## Project Structure

```
RSS Feed Reader/
│
├── package.json              # Dependencies & npm scripts
├── vite.config.js            # Vite config + proxy to backend
├── index.html                # HTML entry point (loads React)
│
├── server/                   # ── EXPRESS BACKEND (port 3001) ──
│   ├── index.js              # Express server entry point
│   ├── routes/
│   │   ├── feeds.js          # POST /api/feeds/parse — parse RSS feed URL
│   │   ├── discover.js       # POST /api/feeds/discover — auto-discover feeds from any URL
│   │   └── articles.js       # POST /api/articles/extract — extract full article content
│   └── utils/
│       ├── feedParser.js     # RSS/Atom feed parsing (uses rss-parser)
│       ├── feedDiscovery.js  # Discovers RSS feeds from HTML link tags & common URL patterns
│       └── articleExtractor.js # Full article extraction (uses @extractus/article-extractor)
│
├── src/                      # ── REACT FRONTEND (port 5173) ──
│   ├── main.jsx              # React entry point — renders <App />
│   ├── App.jsx               # Root component — wires everything together
│   ├── index.css             # Complete design system (dark/light themes, all styles)
│   │
│   ├── components/           # UI Components
│   │   ├── Sidebar.jsx       # Left panel — navigation, folders, feeds, context menus
│   │   ├── ArticleList.jsx   # Middle panel — article cards, search bar
│   │   ├── ArticleReader.jsx # Right panel — full article reader with auto-extraction
│   │   ├── AddFeedModal.jsx  # Modal — add feeds via URL, search, popular, or alerts
│   │   └── SettingsPanel.jsx # Modal — theme toggle, clear data
│   │
│   ├── hooks/                # React Hooks (business logic)
│   │   ├── useFeeds.js       # Feed CRUD — add, remove, move, refresh feeds
│   │   ├── useArticles.js    # Article queries — read/unread, bookmarks
│   │   └── useFolders.js     # Folder CRUD — add, rename, delete folders
│   │
│   ├── db/
│   │   └── database.js       # Dexie.js IndexedDB schema — defines tables & indexes
│   │
│   └── utils/
│       ├── api.js            # HTTP client — calls backend /api/* endpoints
│       ├── constants.js      # Popular feeds list, refresh interval, view types
│       └── helpers.js        # Date formatting, text utilities, URL helpers
│
└── public/
    └── favicon.svg           # App icon
```

### How the Pieces Fit Together

```
┌──────────────────────────────────────────────────────────────┐
│                        BROWSER                               │
│                                                              │
│  ┌─────────┐  ┌────────────┐  ┌─────────────────────────┐   │
│  │ Sidebar │→│ ArticleList │→│   ArticleReader          │   │
│  │         │  │ + Search    │  │   (auto-extracts full   │   │
│  │ Folders │  │             │  │    article on select)   │   │
│  │ Feeds   │  │             │  │                         │   │
│  └─────────┘  └────────────┘  └─────────────────────────┘   │
│       │              │                    │                   │
│       └──────────────┴────────────────────┘                  │
│                      │                                       │
│              ┌───────────────┐                               │
│              │  IndexedDB    │  ← All data stored locally    │
│              │  (via Dexie)  │    in your browser             │
│              └───────────────┘                               │
│                      │                                       │
└──────────────────────┼───────────────────────────────────────┘
                       │ /api/* calls
              ┌────────────────┐
              │  Express.js    │  ← Backend (port 3001)
              │  - Parse feeds │    Handles CORS proxying
              │  - Discover    │    so the browser can fetch
              │  - Extract     │    RSS feeds from any site
              └────────┬───────┘
                       │
                  ┌────────┐
                  │Internet│
                  └────────┘
```

### Why a Backend Server?

Browsers block direct requests to other websites (CORS policy). The Express backend acts as a proxy — the browser asks the backend, and the backend fetches from the internet. This is the standard approach for RSS readers and keeps everything free (no paid CORS proxy services).

---

## Data Storage

All your data (feeds, articles, folders, read/unread state, bookmarks) is stored in **IndexedDB** inside your browser. This means:

- ✅ **Zero cost** — no database server to run
- ✅ **Private** — nothing leaves your machine
- ⚠️ **Browser-specific** — data lives in the browser you use. If you switch browsers, you start fresh.
- ⚠️ **Clearable** — clearing browser data will erase your feeds. Don't clear site data for localhost.

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React + Vite | UI framework + fast dev server |
| Styling | Vanilla CSS | Full design system with dark/light themes |
| Storage | Dexie.js (IndexedDB) | Local data persistence |
| Backend | Express.js | CORS proxy for feed/article fetching |
| Feed Parsing | rss-parser | Parse RSS/Atom XML feeds |
| Article Extraction | @extractus/article-extractor | Pull full article content from any URL |
| HTML Sanitization | DOMPurify | Safely render article HTML |
| Icons | react-icons (Heroicons) | UI iconography |
| Dev Runner | concurrently | Run frontend + backend in one command |

---

## Key npm Scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Starts both frontend (Vite) and backend (Express) concurrently |
| `npm run dev:frontend` | Starts only the Vite frontend |
| `npm run dev:backend` | Starts only the Express backend |
| `npm run build` | Builds the production frontend bundle |

---

## Troubleshooting

### App shows a blank page
- Check the terminal for errors. If you see `EADDRINUSE`, another process is using port 3001 or 5173.
- Fix: `kill -9 $(lsof -ti:3001)` and/or `kill -9 $(lsof -ti:5173)`, then run `npm run dev` again.

### Feeds show an error when adding
- Some websites actively block automated requests (403/429 errors). This is a limitation — those sites don't want RSS readers accessing them.
- Try the direct RSS URL instead of the website URL (e.g., `https://feeds.bbci.co.uk/news/rss.xml` instead of `https://bbc.com`).

### Articles don't load full content
- If extraction fails, you'll see "Feed content only" in the reader toolbar — this means the source site blocked extraction.
- Use the **"Open Original"** link to read in a new tab.

### Need to reset everything
- Go to **Settings** (⚙️ icon) → **Clear All Data** to wipe IndexedDB and start fresh.

---

## Future Roadmap

The architecture is designed for extensibility:

- **AI Summarization** — Add an `/api/ai/summarize` endpoint that pipes article content to a local LLM (e.g., Ollama with DeepSeek).
- **Smart Daily Digest** — Scheduled task that generates a morning briefing from unread articles.
- **Topic Clustering** — Group related articles using embeddings.
- **Export/Import** — OPML import/export for feed portability.
- **Mobile PWA** — Add a service worker for offline reading on mobile.
