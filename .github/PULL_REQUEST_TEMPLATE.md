<!-- Thanks for contributing! Please keep PRs focused: one feature or fix per PR. A PR is merged once it meets the definition of done in MAINTAINING.md. -->

## What does this PR do?

<!-- Short description of the change and the motivation. Link the related issue if one exists, e.g. "Closes #12". -->

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Documentation
- [ ] Refactor / code quality

## Checklist

- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] Tests added or updated for new behavior or the fixed bug (for UI-only changes: a logic test, or how you checked it manually in "What does this PR do?")
- [ ] App starts cleanly with `npm run dev` and the affected flows work (tested manually)
- [ ] Works in both dark and light themes (for UI changes)
- [ ] README updated (features table, shortcuts) if user-facing behavior changed
- [ ] `CHANGELOG.md` has a line under `## Unreleased` ending with this PR's number (user-facing changes)
- [ ] `docs/SECURITY-DESIGN.md` updated in this PR if the change crosses a trust boundary: a new way to fetch a URL, new raw HTML or a sanitizer change, starting a process, building SQL, or the server's binding, Host or Origin checks or limits
- [ ] SQLite schema changes migrate existing databases in place (if applicable)
- [ ] Respects the project principles: local-first, privacy-first, on-device AI only (Gemini Nano or Ollama)
- [ ] AI-assisted work is said so here and carries a `Co-Authored-By:` trailer (if applicable)

## Not checked

<!-- What you didn't test or verify, and why. "Nothing" is a fine answer if it's true. -->

## Screenshots (UI changes)

<!-- Before / after screenshots or a short clip, if relevant. -->
