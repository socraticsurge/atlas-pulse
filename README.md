<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/brand/readme-banner-dark.png">
    <img src="docs/brand/readme-banner-light.png" alt="Atlas Pulse: privacy-first RSS reader with on-device AI" width="640">
  </picture>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-f26b1d" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/license-MIT-0b3b6f" alt="License: MIT">
  <img src="https://img.shields.io/badge/AI-on--device%20%C2%B7%20Gemini%20Nano%20%7C%20Ollama-0b3b6f" alt="On-device AI: Gemini Nano or Ollama">
  <img src="https://img.shields.io/badge/node-22.13%2B%20%7C%2024%2B-0b3b6f" alt="Node 22.13+ or 24+">
  <img src="https://img.shields.io/badge/PRs-welcome-f26b1d" alt="PRs welcome">
</p>

Atlas Pulse is an RSS reader for people who read a lot and want to keep what matters. Scan hundreds of articles in dense rows, read in a calm docked reader, save the good ones with a note on why, and file them into collections you can send to NotebookLM or turn into a newsletter.

It runs entirely on your own machine. There is no account, no cloud and no tracking: your feeds, saves and notes live in one local SQLite file. AI summaries, analysis and chat run **on-device**, using **Gemini Nano** (built into desktop Google Chrome, no setup) or an optional local **Ollama** model.

![Atlas Pulse: saved articles with notes, and the reader showing your note and an AI summary](docs/screenshots/01-saved-reader-dark.png)

## Why Atlas Pulse

- **Fast to scan, calm to read.** Dense two-line rows with day headings on the left; a docked reader with good typography on the right. Everything has a key.
- **Built for keeping, not just reading.** Press `b` to save, `n` to save with a note, `c` to file into collections. An Unsorted queue keeps filing quick.
- **From reading to output.** Send a collection to NotebookLM as one Markdown source, or start a newsletter draft in Studio and export it as a PNG or an A4 PDF.
- **AI that stays home.** Summaries, five-dimension analysis, article chat and multi-article briefings run on Gemini Nano in your browser or on Ollama on your machine. Article text never goes to a hosted AI service.
- **Yours, on disk.** One SQLite database and one settings file. Copy the folder to back it up.

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/02-rows-reader-dark.png" alt="A folder in Rows view with an article open in the docked reader"><p align="center"><em>Rows view and the docked reader</em></p></td>
    <td width="50%"><img src="docs/screenshots/03-collection-dark.png" alt="A collection with Send to NotebookLM and Start a Studio draft"><p align="center"><em>A collection, ready for NotebookLM or Studio</em></p></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/screenshots/04-studio-dark.png" alt="Studio: a newsletter in Markdown beside its Evening Edition page"><p align="center"><em>Studio: edit a newsletter beside its printed page</em></p></td>
    <td width="50%"><img src="docs/screenshots/05-palette-dark.png" alt="The command palette searching for articles"><p align="center"><em>⌘K: jump anywhere, run any command, search articles</em></p></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/screenshots/06-grid-dark.png" alt="Grid view of a folder"><p align="center"><em>Grid view (also Rows, List and Compact)</em></p></td>
    <td width="50%"><img src="docs/screenshots/07-saved-reader-light.png" alt="Saved articles and the reader in the light theme"><p align="center"><em>Light theme</em></p></td>
  </tr>
</table>

---

## Quick start

**You need:** Node.js 22.13+ or 24+ (24 LTS recommended; with nvm, run `nvm install` in the folder), and desktop Google Chrome 148+ for the built-in Gemini Nano AI. Ollama is optional.

```bash
git clone https://github.com/socraticsurge/atlas-pulse.git
cd atlas-pulse
npm ci
npm run dev
```

Open **http://localhost:5173** in Chrome. `npm run dev` starts the Vite frontend on port 5173 and the Express API on port 3001; Vite proxies `/api/*` to Express. Press `Ctrl + C` to stop. If 3001 is taken, use another port for the API: `PORT=3002 npm run dev`.

To run it without the dev server, `npm start` builds the app and serves everything from **http://localhost:3001** (or your `PORT`).

Add a feed with **+** in the rail: paste any site URL (the feed is discovered for you), search Google News, pick from the Popular catalog, or import an OPML file in **Settings → Data**.

### Run it like an app (macOS)

Install Atlas Pulse as a login service so it is always at the same address, without a terminal:

```bash
npm run service install
```

Then open **http://atlas-pulse.localhost:4317**. Chrome resolves every `*.localhost` name to your own machine, so no DNS or hosts-file changes are needed. Atlas Pulse ships a web app manifest and icons, so you can also install it from Chrome's menu to get its own window and dock icon.

| Command | What it does |
|---------|--------------|
| `npm run service install` | Build the app and register the background service |
| `npm run service restart` | Install changed dependencies, rebuild and restart: run this after pulling updates |
| `npm run service status` | Show whether the service is running |
| `npm run service logs` | Follow the logs (`~/Library/Logs/atlas-pulse/`) |
| `npm run service uninstall` | Stop the service and remove it |

The service listens on `127.0.0.1` only and is not reachable from other devices. Set `PORT=<number>` before `install` to use another port. `CHROME_PATH`, `ATLAS_DATA_DIR` and `OLLAMA_HOST`, if set when you run `install`, are kept for the service too; run `install` again to change them.

---

## Features

### Reading

| Feature | Details |
|---------|---------|
| **Four list views** | **Rows** (default: dense two-line rows with day headings), Grid, List and Compact. Switch in the list header, in **Settings → Reading**, or with ⌘K |
| **Docked reader** | A third pane on wide windows (1100 px and up); on narrower ones it slides over the list. Hide the sidebar with `[` and the list with `]` for more room |
| **Full text, automatically** | The full article is extracted from the source when you open it; the reader shows whether you're reading the full article or the feed's text |
| **Reading comfort** | Newsreader serif by default, with font, size, spacing and width in the **Aa** menu; a progress bar; focus mode (`f`); your scroll position is remembered |
| **In brief** | When an article has an AI summary, it appears at the top of the reader |
| **Highlights** | Select text to highlight it in one of four colours; browse and search them all in **Highlights**, and export as CSV |
| **Command palette** | ⌘K / Ctrl+K: go to any view, folder or feed, run commands (add feed, refresh, theme, panes, list view), or search articles |
| **Share** | LinkedIn, X, email, your system's share sheet, or copy the link |

### Saving and organizing

| Feature | Details |
|---------|---------|
| **Save with a note** | `b` saves an article; `n` saves it and opens a note on why it caught your eye. Saved lists your saves newest first under "today", "yesterday", "this week" and "earlier", with each note in place of the preview |
| **Collections** | `c` opens the collection picker: add the article to one or more collections, or type a name to create one. Adding an article saves it; unsaving removes it from every collection. Rename or delete from the sidebar (deleting a collection keeps its saves) |
| **Unsorted** | Saves that aren't in any collection yet: a filing queue. Press `c` to file one, and `j` moves on to the next |
| **Send to NotebookLM** | From a collection: download its articles as one Markdown file (title, source, dates, your note and the text of each) to upload as a source, copy the links to paste as website sources, or open NotebookLM |
| **Start a Studio draft** | Turns a collection into a newsletter draft, one section per article with your note as "Why it matters" |
| **Folders** | Group feeds into folders; right-click a feed to refresh it, move it or remove it |
| **Search** | Full-text search over everything you've fetched, ranked title › source › AI topics › body. Words match as prefixes; "quoted phrases" match exactly. Press `/` |
| **Filters** | The **Filters** button reveals AI-analyzed-only and content filters (sentiment, urgency, frame, tone, depth) |
| **Removing a feed keeps your saves** | Its other articles go, but saved ones stay in Saved and your collections with their notes. Subscribe again and they rejoin the feed |

### Studio

| Feature | Details |
|---------|---------|
| **Newsletters you can edit** | Save any generated newsletter to Studio, or start one from a collection. Edit the title and Markdown in Write, Split or Preview mode; changes save as you type |
| **Three designs** | Broadsheet, Evening Edition and Quarterly: a real newspaper page laid out from your Markdown |
| **Export** | Copy, Markdown, Word, PNG (for sharing) or an A4 PDF with real text. PNG and PDF are rendered by your installed Chrome or Edge (set `CHROME_PATH` if it's somewhere unusual) |
| **Sources** | Each newsletter lists the articles it came from; open any of them in the reader |

### AI, on your device

| Feature | Details |
|---------|---------|
| **Gemini Nano by default** | Uses the model built into desktop Google Chrome: no install, no API key, nothing to configure |
| **Ollama, optional** | Connect Ollama for larger local models; a built-in wizard detects it, starts it and pulls models |
| **AI rail** | Press `a` for the side rail: Summary, Analysis, Chat and Highlights tabs, the model picker, and an "Ask AI about this article" bar |
| **Summary and analysis** | A 3–4 sentence summary, and a classification across sentiment, urgency, frame, tone and depth with topic tags. A summary you ask for is kept; background runs never overwrite it |
| **Your voice** | Nine reading personas, tone (voice, energy, angle) and custom instructions, applied to every response, including background runs |
| **Background processing** | Summarizes and analyzes new articles after each refresh while the app is open. The ✨ button runs it on recent articles any time, and the queue can be cleared |
| **Multi-article actions** | Select articles and choose **AI**: Compare Sources (2–5), Generate Newsletter (3–15, as a Daily Digest, Weekly Roundup or Executive Brief) or Briefing (2–15, any question answered from just those articles). Export to Markdown or Word, email it, or save it to Studio |
| **Editable prompts** | In **Power** mode, **Settings → Prompts** lets you read and change every prompt and character budget the app uses |

### Feeds

| Feature | Details |
|---------|---------|
| **Add a feed four ways** | Paste a URL (feeds are discovered from the page), search Google News, browse the Popular catalog, or follow the Google Alerts steps |
| **OPML** | Import and export your feeds and folders in **Settings → Data**; imported feeds fetch right away |
| **Feed health** | A feed that fails shows a warning with the reason; refresh it on its own from its menu |
| **Auto-refresh** | Off, 15 min, 30 min, 1 h or 2 h. A refresh fetches only what's new |

### Appearance and settings

| Feature | Details |
|---------|---------|
| **Themes** | Dark and light, from the rail, ⌘K or **Settings → Appearance** |
| **Fonts** | 15 self-hosted fonts for the app and the reader, including IBM Plex Sans (default), Newsreader (reader default), Inter, Merriweather, Source Serif and JetBrains Mono |
| **Accent and text colour** | Six accent presets (Amber is the default) or any custom colour; text colour presets for comfort |
| **Simple and Power modes** | Simple shows the settings most people need; Power shows everything, including prompts. Search finds any setting |
| **A settings file** | Settings live in `data/settings.json`: back it up, edit it, or copy it to another machine |

---

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `⌘K` / `Ctrl+K` | Command palette |
| `/` | Search |
| `[` | Show or hide the sidebar |
| `]` | Show or hide the article list |
| `j` / `↓` / `→` | Next article |
| `k` / `↑` / `←` | Previous article |
| `b` | Save or unsave |
| `n` | Save with a note |
| `c` | Add to collections |
| `o` | Open the original |
| `f` | Focus mode |
| `a` | AI rail |
| `Esc` | Clear the selection or search; in the reader, leave focus mode, then close the article |

The article keys work while an article is open. None of them fire while you're typing. In a note, `Enter` or `Esc` finishes and `Shift+Enter` adds a line.

---

## Setting up AI

Both engines run on your machine: no API keys, no usage costs, and no article text sent to a hosted AI service.

| | Gemini Nano (default) | Ollama (optional) |
|---|---|---|
| **Setup** | None: built into Google Chrome | Install Ollama and pull a model |
| **Where it runs** | In the browser tab, on your device | In the Ollama service on your machine |
| **Browsers** | Desktop Google Chrome 148+ | Any browser |
| **Models** | Gemini Nano, managed and updated by Chrome | Any model from the Ollama library |
| **Best for** | Summaries, analysis, short chats | Longer inputs and higher-quality analysis |

When Gemini Nano is available, Atlas Pulse uses it automatically. Switch to an Ollama model from the model picker in the AI rail, or in **Settings → AI engines**.

### Gemini Nano in Google Chrome (recommended)

1. Open Atlas Pulse in desktop **Google Chrome 148 or later**.
2. Open an article and press `a` (or click the sparkle button in the reader toolbar).
3. Click **Generate Summary**. The first time, Chrome downloads Gemini Nano once (a few GB) and reuses it from then on.

**Requirements** (set by Chrome): Windows 10/11, macOS 13+, Linux, or ChromeOS on Chromebook Plus; about 22 GB of free disk space; and either a GPU with more than 4 GB of VRAM or 16 GB of RAM. Check the model's state at `chrome://on-device-internals`.

> **Other browsers.** Plain Chromium, embedded browsers and Chromium-based browsers without Google's model expose the same API but contain no model; Atlas Pulse detects this and hides Gemini Nano instead of returning placeholder output. Safari and Firefox don't support the API. Use Ollama in those browsers.

**Limits to know**

- **Smaller context.** Single-article features fit comfortably. For multi-article actions, Atlas Pulse shortens every selected article evenly so the selection fits, and tells you when it does. For long comparisons, use an Ollama model.
- **The tab must stay open.** Gemini Nano runs inside the page, so background processing pauses when the tab is closed.
- **No model choice.** Chrome manages the model, and output can change between Chrome versions.
- **Terms.** Gemini Nano is governed by Google Chrome's terms, including Google's [Generative AI Prohibited Use Policy](https://policies.google.com/terms/generative-ai/use-policy).

### Ollama

Open **Settings → AI engines** and click **Set up Ollama**; the wizard checks for Ollama only when you ask, then walks you through download → start → pull a model, and marks the suggested model that suits your computer's memory. Or set it up by hand:

```bash
# Install from https://ollama.com, then pull a model:
ollama pull llama3.2:3b      # fastest; fine with 8 GB of memory
ollama pull gemma3:4b        # balanced; for 16 GB

ollama serve                 # API on http://localhost:11434
```

Installed models appear in the model picker automatically. Models that reason before answering (DeepSeek R1, Qwen 3.5, Gemma 4) work too: Atlas Pulse asks them for the answer without the reasoning, which keeps summaries fast. If Ollama listens somewhere else (another port, or another machine), set `OLLAMA_HOST` the way Ollama reads it, for example `OLLAMA_HOST=gpu-box:11434 npm run dev`.

### Background processing

In **Settings → AI engines**, choose a model (**Auto** uses Gemini Nano when available), what to generate (summary, analysis or both) and how many articles per run, then turn on **Background processing**. New articles are processed after each refresh while the app is open. Click ✨ in the list header to process recent articles now.

---

## Data and privacy

| Data | Where it lives |
|------|----------------|
| Feeds, folders, articles, saves and notes, collections, highlights, AI summaries, Studio newsletters, search index | `data/reader.db` (one SQLite database) |
| Settings | `data/settings.json` |
| Pane widths, scroll positions and other per-device layout | Your browser's `localStorage` |
| Gemini Nano model | Managed by Google Chrome on your device |

- **Private by design.** Feeds are fetched directly from their publishers; site icons are fetched and cached by your local server, not a third party; AI runs on your device. Nothing is sent to an Atlas Pulse server, because there isn't one.
- **Shared across browsers.** Data lives on disk, not in the browser, so every browser on the machine sees the same library.
- **Backup.** Copy the `data/` folder (set `ATLAS_DATA_DIR` to keep it elsewhere). For just your feed list, use **Settings → Data → Export feeds and folders**.

---

## How it works

```
┌──────────────────────── Browser (Chrome) ────────────────────────┐
│                                                                  │
│  Rail + Sidebar   Article list            Reader + AI rail       │
│  views, folders,  Rows · Grid · List ·    In brief, notes,       │
│  collections, ⌘K  Compact (virtualized)   Studio editor          │
│                                                                  │
│  streamChat() ──┬── Gemini Nano (Chrome Prompt API, on-device)   │
│                 └── Ollama (through the local server)            │
└────────────────────────────────┬─────────────────────────────────┘
                                 │  /api/*
┌────────────────────────────────▼─────────────────────────────────┐
│  Express on 127.0.0.1                                            │
│                                                                  │
│  feeds · discover · articles ──► publishers (SSRF-guarded)       │
│  reader · collections · studio ──► data/reader.db (SQLite, FTS5) │
│  page export ──► your installed Chrome (PNG, PDF)                │
│  ai · ollama ──► Ollama on :11434 (optional)                     │
└──────────────────────────────────────────────────────────────────┘
```

Browsers block cross-origin requests, so a small local Express server fetches feeds and full articles for the page, checking every user-supplied URL (and every redirect and DNS answer) against SSRF before connecting. It also owns the SQLite database, renders Studio exports through your installed Chrome, and bridges to Ollama when you use it. Gemini Nano needs no server: it runs inside the page. The server binds to `127.0.0.1` and only admits requests from local origins.

The code is a modular monolith: feature folders under `src/components/` and `server/`, with the boundaries and dependency rules in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

### Technology

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, Tailwind CSS 4, shadcn/ui (Radix, cmdk) |
| Client data | TanStack Query, TanStack Virtual |
| Backend | Express 5, express-rate-limit |
| Storage | SQLite via better-sqlite3, with FTS5 full-text search |
| AI | Gemini Nano (Chrome Prompt API); Ollama, optional |
| Feeds and extraction | rss-parser, @extractus/article-extractor, cheerio, undici |
| Rendering and export | DOMPurify, marked, docx, puppeteer-core (drives your installed Chrome) |
| Fonts | Self-hosted with Fontsource |

### npm scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the frontend (Vite) and backend (Express) together |
| `npm start` | Build the app and serve it, with the API, from one process on port 3001 |
| `npm run dev:frontend` | Start only the Vite frontend |
| `npm run dev:server` | Start only the Express backend |
| `npm run build` | Build the production frontend to `dist/` |
| `npm run preview` | Serve the production build with Vite (start the API too: `npm run dev:server`) |
| `npm run lint` | Run ESLint |
| `npm test` | Run the test suite (Node's test runner) |
| `npm run service <command>` | Manage the macOS background service (see [Run it like an app](#run-it-like-an-app-macos)) |

---

## Troubleshooting

**"Atlas Pulse needs Node.js …", or `SyntaxError: … does not provide an export named 'styleText'`.** Your Node is too old. Install the current LTS from [nodejs.org](https://nodejs.org) (or `nvm install`), then reinstall the dependencies, which are built for the Node that installed them: `npm ci`.

**`… was compiled against a different Node.js version … NODE_MODULE_VERSION …`.** You changed Node versions after installing. Run `npm ci`. With the background service, run `npm run service install` too, so it uses the new Node.

**"Port 3001 is already in use" or "Port 5173 is already in use".** Another program has the port. See which with `lsof -i :3001` (or `:5173`) and quit it, or give the API another port: `PORT=3002 npm run dev`.

**The app won't load, or it looks empty and adding a feed fails.** The local server isn't running or can't be reached. Check the terminal where you ran `npm run dev` for an error. With the background service, run `npm run service status` and `npm run service logs`. After pulling updates, run `npm run service restart`.

**"No AI model available".** The card says why Gemini Nano isn't available: not Chrome (Chromium, Safari and Firefox don't include it), a Chrome older than 148, or a computer Chrome can't run it on (`chrome://on-device-internals` shows the reason). Or set up Ollama in **Settings → AI engines**.

**"Gemini Nano needs a one-time download".** Chrome hasn't downloaded the model yet, and starts only when you click: use **Download Gemini Nano** in the AI panel or in **Settings → AI engines** to follow its progress. If it never finishes, check that you have about 22 GB free.

**"Articles were shortened" or "too long for Gemini Nano".** Select fewer articles, or switch to an Ollama model.

**No Ollama models in the picker.** Run `ollama serve`, check `curl http://localhost:11434` (or your `OLLAMA_HOST`), then pull a model (`ollama pull llama3.2:3b`) or use **Pull** in the Ollama setup, which marks the one that suits your computer's memory.

**A feed won't add.** Some sites block automated requests (403/429). Try the feed URL itself, for example `https://feeds.bbci.co.uk/news/rss.xml` instead of `https://bbc.com`.

**The full article doesn't load.** The site blocked extraction. Press `o` to read it on the site.

**Studio PNG or PDF export fails.** It needs Google Chrome or Microsoft Edge installed. If yours is in an unusual place, start the server with `CHROME_PATH=/path/to/chrome` (for the background service, set it before `npm run service install`).

---

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) for the project principles (local-first, privacy-first, on-device AI only), setup and pull request guidelines; [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the code is organized; and [docs/TECH-DEBT.md](docs/TECH-DEBT.md) for open maintenance work. By taking part you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

- **Found a bug?** [Open a bug report](https://github.com/socraticsurge/atlas-pulse/issues/new?template=bug_report.yml)
- **Have an idea?** [Open a feature request](https://github.com/socraticsurge/atlas-pulse/issues/new?template=feature_request.yml) or start a [discussion](https://github.com/socraticsurge/atlas-pulse/discussions)
- **Security issue?** Report it privately: see [SECURITY.md](SECURITY.md)

## License

[MIT](LICENSE). Copyright (c) 2026 Vinay Chaganti.

## Changelog

**2.0.0** is a new reader: a three-pane layout with dense Rows, a docked reader and an AI rail; saves with notes, collections and an Unsorted queue; NotebookLM export; Studio for editable, printable newsletters; full-text search; a command palette; and a single local database. See [CHANGELOG.md](CHANGELOG.md) for everything in this release and earlier ones.
