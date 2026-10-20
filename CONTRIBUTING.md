# Contributing to Atlas Pulse

Thanks for your interest in improving Atlas Pulse! This is a personal open-source project, and contributions of all kinds are welcome: bug reports, feature ideas, documentation fixes, and pull requests.

## Guiding principles

Before proposing a change, keep the project's core promises in mind. Contributions that break these will not be merged:

1. **Local-first, always.** All user data stays on the user's machine. No cloud services, no telemetry, no accounts, no external analytics.
2. **AI is optional and on-device.** AI features must run on the user's own machine — through Gemini Nano built into Chrome (the default) or the user's local Ollama instance. No hosted LLM APIs, no API keys, no usage costs. New AI features must work with both engines.
3. **One styling system.** The UI is built with Tailwind CSS 4 utilities and shadcn/ui components (`src/components/ui/`), on the design tokens in `src/styles/tokens.css`. Use those rather than adding another CSS framework, CSS-in-JS, or a second component library.
4. **Privacy over convenience.** When a feature trades privacy for convenience, privacy wins.

## Getting started

```bash
# Fork the repo on GitHub, then:
git clone https://github.com/<your-username>/atlas-pulse.git
cd atlas-pulse
npm ci
npm run dev
```

Open http://localhost:5173. The Vite dev server (5173) and Express API server (3001) start together.

To work on AI features, open the app in desktop Google Chrome 148+ so Gemini Nano is available (the first request downloads the model). Plain Chromium and embedded browsers have no model. To test the Ollama path as well, run [Ollama](https://ollama.com) with at least one small model pulled (for example `qwen2.5:3b`); the wizard under Settings → AI engines → Set up Ollama can handle this for you.

## Project layout

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before adding a feature. It maps each component, says where new code belongs, and lists the dependency rules. In short:

- `src/` is the React 19 frontend. App-wide state lives in contexts under `src/app/`. Each large component has a feature folder holding its hooks and subcomponents.
- AI prompts and parsing live in `src/ai/`. All AI calls go through `streamChat()` in `src/utils/api.js`, which routes to Gemini Nano (`src/utils/chromeAI.js`) or Ollama.
- `server/` is the Express 5 backend: a feed proxy with SSRF protection, full-text extraction, the optional Ollama bridge, and all persistent data in SQLite (`server/db/`, with files in `data/`).
- Vite proxies all `/api/*` calls from the frontend to port 3001.

## Reporting bugs

Use the [bug report template](https://github.com/socraticsurge/atlas-pulse/issues/new?template=bug_report.yml). Please include:

- Steps to reproduce, expected vs. actual behavior
- OS, browser, and Node.js version
- For AI issues: the engine and model (Gemini Nano with your Chrome version, or your Ollama version and model)
- Any errors from the browser console or the terminal running `npm run dev`

## Proposing features

Open a [feature request](https://github.com/socraticsurge/atlas-pulse/issues/new?template=feature_request.yml) first, especially for larger changes, so we can agree on the approach before you invest time in code. [GOVERNANCE.md](GOVERNANCE.md) explains how decisions are made.

## Pull requests

1. Fork the repo and create a branch from `master`: `feat/short-name` or `fix/short-name`.
2. Keep PRs focused: one feature or fix per PR.
3. Run `npm run lint` and `npm test`, and make sure the app starts cleanly with `npm run dev`.
4. Add or update tests as described in [Tests](#tests), and test the affected flows manually.
5. If you change user-facing behavior, update the README (features tables, shortcuts) and add a line to `CHANGELOG.md`.
6. If you change a SQLite schema, add a new numbered migration in `server/db/migrations/`. Never edit a released migration, and never require users to delete their data.
7. Keep `npm run lint` at zero warnings. The complexity rules (complexity 9, 70 lines per function, nesting depth 3, 4 parameters) are there to keep components small. Split the code rather than raising the limit.

### Tests

Changes that alter behavior come with automated tests:

- **New features and bug fixes add or update tests.** A bug fix adds a regression test that fails without the fix. A new feature tests its logic: parsing, data handling, routes, state changes.
- **Where tests live.** Tests use Node's built-in runner (`node --test`, run by `npm test`) and sit next to the code they cover as `*.test.js`, for example `server/utils/urlGuard.test.js` next to `server/utils/urlGuard.js`. CI runs them on Linux, macOS and Windows for every pull request, and they must pass before a merge.
- **UI-only changes** (layout, styling, wording) need one of two things: a logic test, usually after moving the logic into a plain module the way `src/components/article-list/listLogic.js` does, or a note in the pull request on how you checked it by hand (browser, dark and light themes, the steps you took).
- **Refactors** keep the existing tests passing without weakening them.

A pull request that changes behavior without a test or a manual-check note will be asked for one before it is merged.

### Commit messages

The project uses Conventional Commits:

```
feat: Add keyboard shortcut for zen mode
fix: Prevent duplicate articles across feeds
docs: Update AI setup instructions
refactor: Extract batch queue logic into hook
```

### Code style

- React function components with hooks; no class components.
- Follow the existing ESLint config (`npm run lint`).
- Match the surrounding code's naming and structure; when in doubt, look at a similar existing component.
- New UI should respect both dark and light themes and the user's accent color.

## Questions

Open a [discussion](https://github.com/socraticsurge/atlas-pulse/discussions) or an issue; [SUPPORT.md](SUPPORT.md) says where each kind of question goes. Happy building!
