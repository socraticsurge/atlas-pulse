// Presentation-only changes to a newsletter's inline Markdown: the words
// never change. Typesetting (curly quotes, apostrophes, en dashes) and links
// that show their site name instead of a long address.

/** Curly quotes and apostrophes; spaced hyphens become en dashes. */
export function typeset(md) {
  return md
    .replace(/(^|[\s([{—–-])"(?=\S)/g, '$1“')
    .replace(/"/g, '”')
    .replace(/(\p{L})'(\p{L})/gu, '$1’$2')
    .replace(/(^|[\s([{])'(?=\S)/g, '$1‘')
    .replace(/'/g, '’')
    .replace(/ - /g, ' – ');
}

/** The site name of an address ("https://www.wired.com/x" → "wired.com"), or ''. */
export function siteOf(url) {
  try {
    return new URL(/^https?:\/\//.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

// [dev.to/a/b](…): link text that is itself an address.
const URL_TEXT_LINK = /\[((?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\]]*)?)\]\(/gi;
// A bare address in the text: with a protocol, or a domain followed by a path.
const BARE_URL = /(^|\s)((?:https?:\/\/)[^\s)<>\]]+|(?:[a-z0-9-]+\.)+[a-z]{2,}\/[^\s)<>\]]*)/gi;

/** Links show their site name: both [address](…) links and bare addresses. */
export function nameLinks(md) {
  return md
    .replace(URL_TEXT_LINK, (match, text) => (siteOf(text) ? `[${siteOf(text)}](` : match))
    .replace(BARE_URL, (match, before, raw) => {
      const url = raw.replace(/[.,;:!?]+$/, '');
      const site = siteOf(url);
      if (!site) return match;
      const href = /^https?:\/\//.test(url) ? url : `https://${url}`;
      return `${before}[${site}](${href})${raw.slice(url.length)}`;
    });
}

/** Both passes, in the order they must run. */
export const present = (md) => nameLinks(typeset(md || ''));
