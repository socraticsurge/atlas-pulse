import DOMPurify from 'dompurify';

// Feed HTML is untrusted. We allow <iframe> for legitimate video embeds only:
// any iframe whose src is not on this host allowlist is dropped, so a malicious
// feed cannot embed an arbitrary phishing/clickjacking frame in the trusted UI.
const IFRAME_HOST_ALLOWLIST = [
  'www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com',
  'player.vimeo.com', 'w.soundcloud.com',
];

DOMPurify.addHook('uponSanitizeElement', (node, data) => {
  if (data.tagName !== 'iframe') return;
  let host = '';
  try { host = new URL(node.getAttribute('src') || '', 'https://x.invalid').hostname; }
  catch { /* invalid/relative src → leave host empty so the iframe is dropped */ }
  if (!IFRAME_HOST_ALLOWLIST.includes(host)) {
    node.parentNode?.removeChild(node);
  }
});

// Runs after attribute sanitization, so the forced sandbox value survives
// (it isn't in ADD_ATTR) and overrides any sandbox the feed tried to set.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'IFRAME') {
    node.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation allow-popups');
  }
});

/** Full article HTML, with allowlisted video iframes. */
export function sanitizeArticleHtml(html) {
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling'],
  });
}

/** Feed (RSS) HTML shown while full-text extraction runs. */
export function sanitizeFeedHtml(html) {
  return DOMPurify.sanitize(html);
}
