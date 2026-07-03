# Contributing to Atlas Pulse

Thanks for your interest in improving Atlas Pulse! This is a personal open-source project, and contributions of all kinds are welcome: bug reports, feature ideas, documentation fixes, and pull requests.

## Guiding principles

Before proposing a change, keep the project's core promises in mind. Contributions that break these will not be merged:

1. **Local-first, always.** All user data stays on the user's machine. No cloud services, no telemetry, no accounts, no external analytics.
2. **AI is optional and local.** AI features must work through the user's local Ollama instance. No hosted LLM APIs, no API keys, no usage costs.
3. **No heavy frameworks for styling.** The design system is vanilla CSS in `src/index.css`. Please do not introduce Tailwind, CSS-in-JS, or component libraries.
4. **Privacy over convenience.** When a feature trades privacy for convenience, privacy wins.

## Getting started

```bash
# Fork the repo on GitHub, then:
git clone https://github.com/<your-username>/atlas-pulse.git
cd atlas-pulse
npm install
npm run dev
```

Open http://localhost:5173. The Vite dev server (5173) and Express API server (3001) start together.

To work on AI features you will also need [Ollama](https://ollama.com) running locally with at least one small model pulled (for example `qwen2.5:3b`). The built-in wizard in Settings → AI Processing can handle this for you.

## Project layout

See the "Project Structure" and "Architecture Overview" sections of the [README](README.md). In short:

- `src/` is the React 19 frontend. State lives in `App.jsx`; data lives in IndexedDB via Dexie (`src/db/database.js`).
- `server/` is the Express 5 backend: CORS proxy for feeds, full-text extraction, Ollama bridge, and the SQLite-backed summaries library.
- All `/api/*` calls from the frontend are proxied by Vite to port 3001.

## Reporting bugs

Use the [bug report template](https://github.com/socraticsurge/atlas-pulse/issues/new?template=bug_report.yml). Please include:

- Steps to reproduce, expected vs. actual behavior
- OS, browser, and Node.js version
- For AI issues: your Ollama version and the model you were using
- Any errors from the browser console or the terminal running `npm run dev`

## Proposing features

Open a [feature request](https://github.com/socraticsurge/atlas-pulse/issues/new?template=feature_request.yml) first, especially for larger changes, so we can agree on the approach before you invest time in code.

## Pull requests

1. Fork the repo and create a branch from `master`: `feat/short-name` or `fix/short-name`.
2. Keep PRs focused: one feature or fix per PR.
3. Run `npm run lint` and make sure the app starts cleanly with `npm run dev`.
4. Test the affected flows manually (there is no automated test suite yet; a PR adding one would be very welcome).
5. If you change user-facing behavior, update the README (features table, shortcuts, changelog).
6. If you change the IndexedDB schema, add a new Dexie version with a migration; never edit an existing version in place.

### Commit messages

The project uses Conventional Commits:

```
feat: Add keyboard shortcut for zen mode
fix: Prevent duplicate articles across feeds
docs: Update Ollama setup instructions
refactor: Extract batch queue logic into hook
```

### Code style

- React function components with hooks; no class components.
- Follow the existing ESLint config (`npm run lint`).
- Match the surrounding code's naming and structure; when in doubt, look at a similar existing component.
- New UI should respect both dark and light themes and the user's accent color.

## Questions

Open a [discussion](https://github.com/socraticsurge/atlas-pulse/discussions) or an issue. Happy building!
