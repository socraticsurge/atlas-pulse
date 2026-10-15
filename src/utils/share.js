// Share links for articles and AI output. Opened in a small popup window.

export function shareOnLinkedIn(link) {
  if (!link) return;
  const url = encodeURIComponent(link);
  window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank', 'width=600,height=600,noopener');
}

export function shareOnX(link, text) {
  if (!link) return;
  const url = encodeURIComponent(link);
  window.open(`https://x.com/intent/tweet?url=${url}&text=${encodeURIComponent(text || '')}`, '_blank', 'width=600,height=400,noopener');
}
