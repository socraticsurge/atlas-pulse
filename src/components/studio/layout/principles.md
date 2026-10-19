# Presentation principles for Studio templates

Every design system follows these, whatever the content. `checkPage()` in
`pageChecks.js` tests the measurable ones on a rendered page.

1. **One reading path.** The page reads top to bottom. No side-by-side
   stories, no sidebars the eye has to return from. (Checked: no two body
   blocks share a row.)
2. **Comfortable measure.** Body text runs 60–75 characters per line
   (checked: 55–85 allowed). Never justified in a narrow column.
3. **No holes.** Nothing leaves an empty band inside the reading: content
   never depends on stories having equal length. (Checked: no gap over 72 px
   between consecutive blocks.)
4. **Clean section breaks.** A section starts full width, after a visible
   break, with its heading; a heading is never the last thing in a section.
   (Checked.)
5. **Pull quotes sit between paragraphs**, never first or last in a section,
   and only in a section long enough to carry one. (Checked.)
6. **Nothing overflows.** Long words and links wrap; a bare link shows its
   site name. (Checked: no element wider than its box.)
7. **Emphasis, not geometry, carries editorial judgement.** The plan decides
   what leads (bigger heading, drop cap), what is set off (panels, callouts)
   and which quote is pulled; it does not move text into columns.
8. **The writer's order is kept**, except that a summary-first layout may
   lift takeaways and a decision callout to the top.
