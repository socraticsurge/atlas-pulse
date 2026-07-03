# Security Policy

Atlas Pulse is a local-first application: it runs entirely on your machine, stores data in your browser's IndexedDB and a local SQLite file, and never sends your data to any external service. That design limits the attack surface, but security issues are still possible (for example in feed parsing, HTML sanitization of article content, or the local Express server).

## Supported versions

Only the latest release on the `master` branch is supported with security fixes.

## Reporting a vulnerability

Please do **not** open a public issue for security vulnerabilities.

Instead, report privately using one of these channels:

1. **GitHub private vulnerability reporting** (preferred): use the ["Report a vulnerability"](https://github.com/socraticsurge/atlas-pulse/security/advisories/new) button on the repo's Security tab.
2. **Email:** cvk.atreya@gmail.com with the subject line "Atlas Pulse security".

Please include steps to reproduce, the potential impact, and any suggested fix. You can expect an acknowledgment within a few days. Once a fix ships, the issue will be disclosed in the changelog with credit to the reporter (unless you prefer to stay anonymous).

## Areas of particular interest

- Bypass of DOMPurify sanitization when rendering article HTML
- Server-side request forgery (SSRF) through the feed-fetching and article-extraction proxy endpoints
- Injection into the SQLite summaries library
- Any way a malicious RSS feed could execute code or exfiltrate local data
