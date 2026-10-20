# Roadmap

_Written: 20 October 2026, at v2.1.0. Covers October 2026 to October 2027. Reviewed at each minor release._

This is what Atlas Pulse intends to do over the next year, and what it will not do. Atlas Pulse has one maintainer working in spare time, so the roadmap gives no dates. Items under **Planned** are intended. Items under **Candidates** may happen, change or be dropped, and each starts as an issue before any code is written.

## What Atlas Pulse will not do

These follow from the [guiding principles in CONTRIBUTING.md](CONTRIBUTING.md#guiding-principles), which are binding (see [GOVERNANCE.md](GOVERNANCE.md#how-decisions-are-made)). A proposal to do one of these is declined, whoever makes it.

- **Hosted AI.** No cloud LLM APIs, API keys or usage costs, not even as an opt-in. AI runs in Gemini Nano inside Chrome, or in an Ollama the user runs themselves, on this machine or on one they point `OLLAMA_HOST` at.
- **Accounts.** No sign-in, no user accounts, no user management.
- **A hosted service or sync server.** There is no Atlas Pulse server, and there won't be one. Data stays in `data/` on the user's machine; moving it to another machine means copying that folder.
- **Telemetry.** No analytics, usage tracking, crash reporting or update checks. Atlas Pulse only goes online to fetch what the user asked for: their feeds and articles (with the images and embeds in them), site icons, and any Ollama models they choose to download.
- **A server for many users.** The local API has no authentication because it serves one person on one machine. Binding it to the network (`HOST=0.0.0.0`) remains an override for people who know what they are doing, not a supported setup.
- **A second styling system.** No other CSS framework, CSS-in-JS or second component library next to Tailwind CSS 4 and shadcn/ui.
- **Breaking user data.** Schema changes migrate existing databases in place. No release asks users to delete their data.

## Planned

### Security and maintenance (ongoing)

- Fix reported vulnerabilities in the latest release, as [SECURITY.md](SECURITY.md) describes.
- Keep dependencies current: Dependabot opens weekly updates for npm packages and GitHub Actions, and a release ships with `npm audit` reporting no known vulnerabilities.
- Keep CI passing on Linux, macOS and Windows, lint at zero warnings under the complexity ratchet, and CodeScene Code Health at 10.0 ([docs/TECH-DEBT.md](docs/TECH-DEBT.md)).
- Keep [docs/SECURITY-DESIGN.md](docs/SECURITY-DESIGN.md) current whenever a change crosses a trust boundary: a new server route that fetches URLs, a new place that renders HTML, a new process the server starts.
- Review this roadmap and docs/TECH-DEBT.md at each minor release.

### Project health (next three months)

The goal is the [OpenSSF Best Practices](https://www.bestpractices.dev/) passing badge, then silver.

- Register the project at bestpractices.dev and complete the passing criteria.
- Name a backup maintainer, as [GOVERNANCE.md](GOVERNANCE.md#access-continuity) describes, so that the project no longer depends on one person.
- Measure test coverage in CI and report it on pull requests.
- Add automated UI and accessibility checks.

### Node.js support

- Node.js 22 reaches end of life in April 2027. Expected: the minimum then moves to Node.js 24 in a minor release, with an **Upgrading** note in the changelog.

## Candidates

Maintenance and hardening work that may happen if time allows:

- **Page the summaries and highlights lists.** Both still load in full, as the article list did before it was paged ([docs/TECH-DEBT.md](docs/TECH-DEBT.md), section 3.3).
- **Tests for the HTML sanitizer.** Its rules have no automated test yet, because the test runner has no DOM.
- **Signed release tags.** This needs a signing key that the maintainer, and later the backup maintainer, keeps safe. GOVERNANCE.md would change to list it.

## Feature work

New features are on hold until about 26 October 2026. Until then the maintainer is using 2.1 day to day to see which problems are worth solving next. The directions chosen then will be added here as candidates, so this roadmap names no new features yet.

Feature ideas are welcome at any time as a [feature request](https://github.com/socraticsurge/atlas-pulse/issues/new?template=feature_request.yml) or a [Discussion](https://github.com/socraticsurge/atlas-pulse/discussions). Each one is weighed against the principles above.

## How this roadmap changes

- Propose an addition in an issue or Discussion, as for any [larger change](GOVERNANCE.md#how-decisions-are-made).
- The maintainer updates this file at each minor release, and when a candidate is accepted, started or dropped.
- Changing **What Atlas Pulse will not do** means changing a project principle. That starts as a Discussion, as GOVERNANCE.md requires.
- Section 6 of [docs/TECH-DEBT.md](docs/TECH-DEBT.md) records the release plan made before 2.0. Most of it shipped in 2.0. Anything from it that isn't listed here is not currently planned.
