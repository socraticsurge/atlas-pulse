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

// "example.com/path" for a link's accessible name.
function readableUrl(href) {
  try {
    const url = new URL(href, 'https://x.invalid');
    return `${url.hostname}${url.pathname === '/' ? '' : url.pathname}`.slice(0, 80);
  } catch { return 'link'; }
}

// An image with no alt attribute gets its title as alt text, or alt="" so a
// screen reader skips it instead of reading out the file name.
function giveAlt(img) {
  if (!img.hasAttribute('alt')) img.setAttribute('alt', (img.getAttribute('title') || '').trim());
}

// A link with nothing to read (a heading's empty anchor, an image without
// alt text) has no name for a screen reader: an image link is named by its
// URL; a link that shows nothing at all leaves the tab order. Its images get
// their alt first: DOMPurify reaches a link before the elements inside it.
function nameEmptyLink(a) {
  a.querySelectorAll('img').forEach(giveAlt);
  if (a.textContent.trim() || a.querySelector('img[alt]:not([alt=""])')) return;
  if (a.querySelector('img, svg, picture, video')) {
    a.setAttribute('aria-label', `Link: ${readableUrl(a.getAttribute('href'))}`);
    return;
  }
  a.setAttribute('aria-hidden', 'true');
  a.setAttribute('tabindex', '-1');
}

// Runs after attribute sanitization, so the forced values survive and override
// anything the feed set: iframes get a fixed sandbox; links open in a new tab,
// so following one never navigates the app itself away. Images always carry
// an alt attribute (giveAlt). Code blocks scroll
// sideways, so they take keyboard focus to be scrollable without a mouse.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'IFRAME') {
    node.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation allow-popups');
  }
  if (node.tagName === 'A' && node.hasAttribute('href')) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
    nameEmptyLink(node);
  }
  if (node.tagName === 'IMG') giveAlt(node);
  if (node.tagName === 'PRE') node.setAttribute('tabindex', '0');
});

// Feed HTML is shown inside the app, so it gets no interactive controls (a
// feed could otherwise render a fake "sign in again" form) and no inline
// styles (position:fixed overlays; the reader's own typography applies).
const BASE = {
  FORBID_TAGS: ['form', 'input', 'button', 'select', 'option', 'textarea', 'style'],
  FORBID_ATTR: ['style', 'action', 'formaction'],
};

/** Full article HTML, with allowlisted video iframes. */
export function sanitizeArticleHtml(html) {
  return DOMPurify.sanitize(html, {
    ...BASE,
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'target'],
  });
}

/** Feed (RSS) HTML shown while full-text extraction runs. */
export function sanitizeFeedHtml(html) {
  return DOMPurify.sanitize(html, { ...BASE, ADD_ATTR: ['target'] });
}
