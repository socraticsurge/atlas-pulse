# Governance

Atlas Pulse is a single-maintainer project. This document says who decides what, how to propose a change, and what happens if the maintainer is unavailable.

## Roles

**Maintainer:** Vinay Chaganti ([@socraticsurge](https://github.com/socraticsurge)). The maintainer:

- reviews and merges pull requests, and triages issues and Discussions;
- decides what goes into the project, following the process below;
- cuts releases following the [release checklist](MAINTAINING.md#release-checklist): bumps the version, updates `CHANGELOG.md`, tags `vX.Y.Z` and publishes a GitHub release;
- keeps the [roadmap](ROADMAP.md) and the [security design](docs/SECURITY-DESIGN.md) current;
- handles vulnerability reports as described in [SECURITY.md](SECURITY.md);
- enforces the [Code of Conduct](CODE_OF_CONDUCT.md);
- keeps CI, the `master` branch ruleset and dependency updates working.

**Contributors:** anyone who opens an issue, starts a Discussion, reviews a pull request or sends one. Contributors follow [CONTRIBUTING.md](CONTRIBUTING.md) and the Code of Conduct. Contributions are licensed under the project's [MIT License](LICENSE); there is no separate agreement to sign.

**Backup maintainer:** not named yet. See [Access continuity](#access-continuity).

There are no other roles today. A contributor with a record of sustained, careful contributions may be invited to become a co-maintainer. That is the main way this project gets past a bus factor of 1.

## How decisions are made

- **Small changes** (bug fixes, docs, small improvements): open a pull request. The maintainer reviews it and merges it once it meets the [definition of done](MAINTAINING.md#definition-of-done), which includes the required checks: lint, tests and build on Linux, macOS and Windows, plus CodeQL.
- **Review with AI assistance.** The maintainer works with AI coding assistants, mostly Claude Code. An assistant session may review a diff against [MAINTAINING.md](MAINTAINING.md) and run the [merge routine](MAINTAINING.md#merge-routine), but it merges or releases only on the maintainer's explicit go-ahead. The maintainer is responsible for every merge and release, whoever ran the steps. What AI sessions may and may not do is set out in [AI-assisted work](MAINTAINING.md#ai-assisted-work).
- **Larger changes** (a new feature, a new dependency, a SQLite schema change, a change to how AI or storage works): open an [issue](https://github.com/socraticsurge/atlas-pulse/issues/new/choose) or a [Discussion](https://github.com/socraticsurge/atlas-pulse/discussions) first, so the approach is agreed before anyone writes code. A pull request for a larger change that skipped this step may be asked to start there.
- **The project principles are binding.** The [guiding principles in CONTRIBUTING.md](CONTRIBUTING.md#guiding-principles) (local-first, on-device AI only, one styling system, privacy over convenience) are not traded off case by case. A change that breaks one is not merged, whoever proposes it, the maintainer included.
- **The roadmap.** [ROADMAP.md](ROADMAP.md) says what the project plans for the next year and what it will not do. Adding to it follows the same process as any larger change.
- **Changing a principle or this document.** While Atlas Pulse has a single maintainer, the change lands as a pull request labelled `governance`. Its description says what changes and why. The maintainer reads the full diff, not a summary, and says so in the pull request. It stays open for at least 24 hours before it merges, and the CHANGELOG notes it. Once there is a co-maintainer or a named backup maintainer, or anyone asks for it, such a change starts as a Discussion and lands as a pull request that links to it.
- **Final call.** The maintainer makes the final call and gives the reasoning in the issue or pull request. If you disagree, say so there; a decision can be revisited when new information turns up. The MIT License also leaves you free to fork.

## Access continuity

The goal: if the maintainer is unavailable, for a while or for good, someone else can still triage issues, accept pull requests and publish a release within a week.

What there is to hand over:

- admin access to the [socraticsurge/atlas-pulse](https://github.com/socraticsurge/atlas-pulse) repository: merging, the branch ruleset, releases, Discussions and private security advisories;
- the email address in [SECURITY.md](SECURITY.md) and the [Code of Conduct](CODE_OF_CONDUCT.md), used for private reports.

There is nothing else: no package registry account, no domain, no release signing keys and no hosted service. Atlas Pulse is installed from source and runs on the user's own machine.

### Backup maintainer

> **To be filled in by the maintainer.** No backup maintainer is named yet, so today the bus factor is 1.
>
> - Backup maintainer: `<name, GitHub handle>`
> - Access held: `<for example: Admin role on the repository; successor on @socraticsurge>`
> - Named on: `<date>`

A named backup maintainer holds the Admin role on the repository, so they can act without the maintainer's account, and is set as the successor in the maintainer's GitHub account settings (Settings → Account → Successor settings).

If the maintainer is unreachable for 30 days (no response on issues, pull requests or the SECURITY.md email) or says they are stepping away, the backup maintainer takes over the maintainer role, updates this document and posts an [announcement](https://github.com/socraticsurge/atlas-pulse/discussions/categories/announcements). Before that point, the backup maintainer steps in only to ship an urgent security fix the maintainer hasn't responded to within 7 days.

Until a backup is named, nobody else can merge or release in this repository if the maintainer is unavailable. The code, its history and these docs stay public, and the MIT License lets anyone fork the project and carry it on.
