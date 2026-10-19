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
5. **Pull quotes are the writer's own.** A short `>` quote is set as a pull
   quote where the writer put it; nothing is pulled out automatically.
6. **Nothing overflows.** Long words and links wrap; a bare link shows its
   site name. (Checked: no element wider than its box.)
7. **Presentation follows shape, not judgement.** Each section's role
   (story, analysis, takeaways, callout, intro, sign-off) comes from its
   shape (rules.js) and only picks a treatment. In a blind test this beat
   letting rules or Gemini Nano promote a lead, pull quotes or reorder
   sections (9 of 11).
8. **The writer's order is kept.** Nothing is moved, promoted or added.
