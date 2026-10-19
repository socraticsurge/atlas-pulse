// Pure helpers for the Studio screen.

/** Words in a Markdown body, for the editor's status line. */
export function wordCount(md) {
  return (md || '').split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/** Short label for when an item was last edited: "19:12" today, else "Oct 3". */
export function editedLabel(iso, now = new Date()) {
  if (!iso) return '';
  const date = new Date(iso);
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
