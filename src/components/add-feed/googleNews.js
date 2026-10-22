// Google News search feeds: the editions Google serves, and the feed URL for
// a query. Pure; the Google News tab and its hook use these.

/**
 * Google News editions: a language in a country. `id` is the edition's
 * `ceid`; `hl` and `gl` are its language and country. US English keeps
 * `hl=en` (Google redirects it to en-US) so feeds added before this list
 * existed keep their URL.
 */
export const EDITIONS = [
  { id: 'AE:ar', hl: 'ar', gl: 'AE', label: 'Arabic (UAE)' },
  { id: 'IN:bn', hl: 'bn', gl: 'IN', label: 'Bengali (India)' },
  { id: 'TW:zh-Hant', hl: 'zh-TW', gl: 'TW', label: 'Chinese (Taiwan)' },
  { id: 'NL:nl', hl: 'nl', gl: 'NL', label: 'Dutch (Netherlands)' },
  { id: 'AU:en', hl: 'en-AU', gl: 'AU', label: 'English (Australia)' },
  { id: 'CA:en', hl: 'en-CA', gl: 'CA', label: 'English (Canada)' },
  { id: 'IN:en', hl: 'en-IN', gl: 'IN', label: 'English (India)' },
  { id: 'SG:en', hl: 'en-SG', gl: 'SG', label: 'English (Singapore)' },
  { id: 'GB:en', hl: 'en-GB', gl: 'GB', label: 'English (UK)' },
  { id: 'US:en', hl: 'en', gl: 'US', label: 'English (US)' },
  { id: 'FR:fr', hl: 'fr', gl: 'FR', label: 'French (France)' },
  { id: 'DE:de', hl: 'de', gl: 'DE', label: 'German (Germany)' },
  { id: 'IN:hi', hl: 'hi', gl: 'IN', label: 'Hindi (India)' },
  { id: 'ID:id', hl: 'id', gl: 'ID', label: 'Indonesian (Indonesia)' },
  { id: 'IT:it', hl: 'it', gl: 'IT', label: 'Italian (Italy)' },
  { id: 'JP:ja', hl: 'ja', gl: 'JP', label: 'Japanese (Japan)' },
  { id: 'KR:ko', hl: 'ko', gl: 'KR', label: 'Korean (South Korea)' },
  { id: 'IN:mr', hl: 'mr', gl: 'IN', label: 'Marathi (India)' },
  { id: 'BR:pt-419', hl: 'pt-BR', gl: 'BR', label: 'Portuguese (Brazil)' },
  { id: 'MX:es-419', hl: 'es-419', gl: 'MX', label: 'Spanish (Mexico)' },
  { id: 'ES:es', hl: 'es', gl: 'ES', label: 'Spanish (Spain)' },
  { id: 'IN:ta', hl: 'ta', gl: 'IN', label: 'Tamil (India)' },
  { id: 'IN:te', hl: 'te', gl: 'IN', label: 'Telugu (India)' },
];

const US_ENGLISH = EDITIONS.find((e) => e.id === 'US:en');

const languageOf = (tag) => tag.split('-')[0].toLowerCase();

/**
 * The edition for a browser locale such as "en-IN": the same language in the
 * same country, else that language's plain edition ("en" is US English),
 * else any edition in that language, else US English.
 */
export function defaultEdition(locale = '') {
  const [language = '', country = ''] = locale.split('-');
  const lang = language.toLowerCase();
  const sameLanguage = EDITIONS.filter((e) => languageOf(e.hl) === lang);
  return sameLanguage.find((e) => e.gl === country.toUpperCase())
    ?? sameLanguage.find((e) => e.hl === lang)
    ?? sameLanguage[0]
    ?? US_ENGLISH;
}

/** A site to search within, as a bare host: "https://www.reuters.com/world" → "reuters.com". */
export function siteFilter(input = '') {
  const text = input.trim().toLowerCase();
  if (!text) return '';
  const host = text.replace(/^[a-z]+:\/\//, '').split(/[/?#]/)[0];
  return host.replace(/^www\./, '');
}

/** The search Google receives: the query, limited to one site when given. */
export function buildQuery({ query = '', site = '' }) {
  const host = siteFilter(site);
  return [query.trim(), host && `site:${host}`].filter(Boolean).join(' ');
}

/** The RSS URL of a Google News search, or '' without a query. */
export function googleNewsUrl({ query = '', site = '', edition = US_ENGLISH.id }) {
  if (!query.trim()) return '';
  const { hl, gl, id } = EDITIONS.find((e) => e.id === edition) ?? US_ENGLISH;
  return `https://news.google.com/rss/search?q=${encodeURIComponent(buildQuery({ query, site }))}&hl=${hl}&gl=${gl}&ceid=${id}`;
}

/** Example searches for the tab's tips; picking one puts it in the search box. */
export const SEARCH_TIPS = [
  { example: '"Gemini Nano"', text: 'Quotes match the exact phrase. Use them for names.' },
  { example: 'intitle:"open source"', text: 'intitle: matches words in the headline only.' },
  { example: '"Atlas" -ChatGPT', text: 'A minus sign leaves out articles that mention a word.' },
  { example: '"local-first" AND privacy', text: 'AND needs both terms in the same article.' },
  { example: '"NotebookLM" OR "Deep Research"', text: 'OR follows either search in one feed.' },
  { example: 'Anthropic when:7d', text: 'when: keeps only recent articles: 1h, 1d or 7d.' },
];
