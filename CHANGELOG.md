# Changelog

All notable changes to Atlas Pulse. Pull request numbers link to
[socraticsurge/atlas-pulse](https://github.com/socraticsurge/atlas-pulse/pulls?q=is%3Apr+is%3Amerged).

## Unreleased

### Fixed

- **When the local server stops, the app says so.** It used to look like an empty library ("Your feed is empty"), and adding a feed failed with "Failed to discover feeds". Now a banner says the server isn't answering and how to start it, the list says it can't load articles, and requests fail with "Can't reach the Atlas Pulse server". The app keeps checking and reloads everything once the server is back (#126).
- **A taken port stops the server with a clear message.** The API used to print that it was running and then serve nothing; Vite moved to another port while everything still said 5173. Both now stop, and the API names the port and how to pick another (#125).
- **`PORT` works with `npm run dev`.** Vite's proxy followed only 3001, so the app went blank under any other port. `npm start` builds the app and serves it from one process; the startup line says which address to open (#125).
- **The background service installs changed dependencies** on `npm run service restart`, so pulling an update that changes them no longer leaves the service on the old ones (#125).
- **A clear message on an unsupported Node.** `npm run dev` and `npm run build` now stop and say which Node to install, instead of failing inside Vite with `SyntaxError: … does not provide an export named 'styleText'`, and `npm install` refuses an unsupported Node. The minimum is now stated correctly as Node 22.13+ or 24+, since several dependencies no longer support Node 20. `.nvmrc` pins 24 LTS, and CI runs on it (#123).
- **Images in Medium articles.** Full-text extraction dropped the inline images from Medium publications such as Towards AI; they now come through (#122).
- **Delete all** in Settings → Data says that it also deletes your saves and their notes and empties collections, and AI errors point to Settings → AI engines (#121).
- **Ollama somewhere else.** `OLLAMA_HOST` (the variable Ollama reads) now points Atlas Pulse at an Ollama on another port or machine; it was fixed at `localhost:11434`. Finding Ollama also works on Windows (`where`, `%LOCALAPPDATA%\Programs\Ollama`) and with the macOS app's own copy. The background service keeps `CHROME_PATH`, `ATLAS_DATA_DIR` and `OLLAMA_HOST` if they are set at `install` (#127).
- **Getting AI set up.** The AI panel and Settings → AI engines now say why Gemini Nano isn't available (not Chrome, a Chrome older than 148, or a computer Chrome can't run it on) instead of always "needs Chrome". When Chrome hasn't downloaded Nano yet, **Download Gemini Nano** starts the download with progress; before, the first summary sat silent. Ollama setup suggests current models (Llama 3.2 3B, Gemma 3 4B, Qwen 3.5 4B, Gemma 3 12B) and marks the one that fits your computer's memory, also after models are installed. Reasoning models answer without their reasoning, and "Auto" no longer prefers DeepSeek R1 or picks an embedding model (#128).
- **Windows commands.** The README, the "port is already in use" message and the Node version check give PowerShell versions of `PORT=…`, `lsof` and `nvm install` on Windows, and the README says the background service is macOS-only (#PR).

### Security

- **No more audit warnings on install.** puppeteer-core, which renders Studio's PNG and PDF exports, is upgraded to 25. Its browser-download helper no longer pulls in `extract-zip`, `proxy-agent` or `basic-ftp`, which carried 7 high-severity advisories. `npm audit` now reports 0 vulnerabilities. Atlas Pulse never downloads a browser (it uses your installed Chrome), so the vulnerable code was not reachable, but scanners flagged it on every install (#124).

## 2.0.0 (2026-10-19)

A new reader. Atlas Pulse now scans like an inbox, reads like a magazine, and keeps what you find: saves with notes, collections, NotebookLM export and Studio. Your data moves into a single local database; the upgrade is automatic.

### New

- **A new layout.** An app rail, a sidebar you can hide (`[`), dense **Rows** as the default list view (Grid, List and Compact remain), and a reader docked beside the list on wide windows; hide the list with `]`. Filters appear only when you ask for them (#81–#87, #91–#98).
- **Command palette.** ⌘K / Ctrl+K jumps to any view, folder or feed, runs commands, and searches articles (#86).
- **AI rail.** Summary, Analysis, Chat and Highlights in a resizable side rail (`a`), with the model picker and an "Ask AI about this article" bar (#85, #94). A saved summary also appears as **In brief** at the top of the reader.
- **Save with a note.** `b` saves, `n` saves with a note on why it caught your eye; Saved lists your saves by when you saved them, with your notes (#114).
- **Collections.** `c` files an article into one or more collections; an article can sit in several (#115). **Unsorted** is a queue of saves still to file (#116).
- **Send to NotebookLM.** Export a collection as one Markdown source, copy its links, or open NotebookLM; or turn it into a Studio draft (#117).
- **Studio.** Saved, editable newsletters in Write, Split or Preview mode, in three newspaper designs (Broadsheet, Evening Edition, Quarterly), exported as Markdown, Word, PNG or an A4 PDF rendered by your installed Chrome (#109–#113).
- **Full-text search** with SQLite FTS5, run on the server and ranked by title, source, topics and body (#45, #106).
- **Settings, rebuilt.** One settings screen with Simple and Power modes, a search box, and in Power mode every AI prompt and character budget, editable (#90). Settings are stored in `data/settings.json` (#89).
- **Feed health.** A failing feed shows a warning with the reason, and can be refreshed on its own (#100).
- **A new logo,** app icons, favicons and a web app manifest.

### Improved

- Background AI follows your personas, tone and custom instructions (#88). The ✨ button runs AI on recent articles even when background processing is off, and the queue can be cleared (#73).
- Much faster with large libraries: a virtualized list (#70), paged articles and server-side search (#106, #107), a list payload cut from 78 MB to 7.8 MB (#44, #103), and the initial bundle halved from 964 kB to 494 kB (#99).
- Self-hosted fonts (#62) and site icons fetched by the local server instead of a third party (#64).
- Light-theme text colours and no theme flash on load (#61); the reader toolbar fits narrow windows (#63).
- The reader remembers your scroll position (#68), and highlights that cross links or formatting draw correctly (#69).
- Imported feeds fetch straight away (#65), and large feeds refresh in chunks (#66).

### Fixed

- Removing a feed keeps your saved articles, notes and collections (#119).
- A summary you asked for is no longer overwritten by background processing (#118).
- Only one tab works on each queued article (#102); AI streams stop cleanly and never leak between articles (#74); AI output parsing and model fallback are sturdier (#79).
- Ingestion no longer drops articles, and dates are stored consistently (#78); feeds and unread counts stay in sync (#77); bulk updates and API errors are handled robustly (#80).
- **Mark all read** asks for confirmation (#49).

### Security

- Every server-side fetch and redirect is checked against SSRF, article HTML is sanitized more strictly, and CSV exports are safe to open in spreadsheets (#76).
- DNS rebinding is blocked with a check at connection time (#101).
- Dependency updates, including express-rate-limit 8 (#104, #22, #27).

### Under the hood

- One SQLite database (`data/reader.db`) replaces three; your summaries and highlights move over automatically (#105). Schema changes run through numbered migrations (#43).
- Tailwind CSS 4 and shadcn/ui replace the hand-written stylesheets (#81, #98).
- The code is organized as feature folders with documented boundaries in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (#46–#59, #75), and lint enforces a complexity ratchet (#42).

## 1.4.0
**On-device AI with zero setup**
- **Gemini Nano support** — AI summaries, analysis, chat, batch processing, and multi-article actions run on the model built into desktop Google Chrome (148+), with no installation or API key
- **Gemini Nano is the default engine** — selected automatically when available; Ollama models remain one click away in the model picker
- **Ollama is now optional** — the app no longer polls for Ollama in the background; its setup wizard runs only when you open **Settings → AI Processing → Set up Ollama**
- **Chromium detection** — browsers that expose the Prompt API without a model (plain Chromium, embedded browsers) are detected, so they never return placeholder output

**Run it like an app**
- **Background service for macOS** — `npm run service install` keeps Atlas Pulse running at `http://atlas-pulse.localhost:4317`, starting at login and restarting automatically
- **Single-process production mode** — the Express server now serves the built frontend, and its port is configurable via `PORT`

**Fixes**
- Multi-article actions (Compare, Newsletter, Briefing) no longer fail with "No AI model selected" when the model is set to **Auto**
- Multi-article actions on Gemini Nano fit the selection to the model's context window by shortening every article evenly, instead of failing on large selections
- A missing Ollama installation is treated as a normal state instead of logging server errors
- **AI now reads the whole article.** A text helper silently cut every article to its first 160 characters, so summaries, analysis, chat, batch processing, and multi-article actions were working from little more than the headline. AI features now receive the full text (up to 6,000 characters for summaries and chat, 4,000 for analysis, 1,200 per article for multi-article actions)
- Corrected the minimum Node.js version to 20.19 (required by Vite 8)

**Security & maintenance** (since v1.3.0)
- SSRF guard on every user-supplied URL the server fetches, loopback-only server binding, CORS restricted to local origins, and an iframe allowlist
- Resolved all CodeQL code-scanning findings; added SSRF and OPML regression tests to CI
- Patched all known dependency vulnerabilities (`npm audit`: 0), including `proxy-addr`, `dompurify`, and `undici`; upgraded to ESLint 10 and concurrently 10; Dependabot updates for dependencies and GitHub Actions

**Documentation**
- README, CONTRIBUTING, and SECURITY now reflect the SQLite storage model, the Highlights feature, and both AI engines

## 1.3.0
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

## 1.2.0
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

## 1.1.0
- **AI Assistant** — Summary and chat powered by local Ollama models; streaming responses; model picker; LinkedIn/X sharing from summary
- **Excerpt view** — Article list view with title, snippet, and thumbnail
- **Sidebar collapse** — Three-state sidebar: expanded → icon-only → hidden
- **Settings expansion** — Font picker (9 options), accent color wheel (6 presets + custom hex), text color variants
- **Reader enhancements** — Reading progress bar, zen/focus mode, expanded keyboard shortcuts
- **Share popover** — LinkedIn, X/Twitter, Email, Web Share API, Copy Link
- **OPML import/export** — Full feed portability

## 1.0.0
- Initial release: RSS reading, full-text extraction, folders, bookmarks, dark/light theme, resizable panels
