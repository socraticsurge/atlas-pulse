import RSSParser from 'rss-parser';
import { fetchText } from './fetchText.js';

const FEED_HEADERS = {
  'User-Agent': 'RSS-Feed-Reader/1.0',
  'Accept': 'application/rss+xml, application/xml, application/atom+xml, text/xml, */*',
};

// Parses text only: the feed is fetched by fetchText, so redirects are checked
// by the SSRF guard (rss-parser's own parseURL follows them unchecked).
const parser = new RSSParser({
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['content:encoded', 'contentEncoded'],
      ['dc:creator', 'dcCreator'],
    ],
  },
});

// First truthy value, or '' when none is.
const firstOf = (...values) => values.find(Boolean) || '';

const itemHtml = (item) => firstOf(item.contentEncoded, item['content:encoded'], item.content);

/** Normalizes one rss-parser item into the shape the client stores. */
export function normalizeItem(item) {
  return {
    title: item.title || 'Untitled',
    link: item.link || '',
    content: firstOf(itemHtml(item), item.summary),
    summary: firstOf(item.contentSnippet, item.summary),
    author: firstOf(item.dcCreator, item.creator, item.author),
    publishedAt: firstOf(item.isoDate, item.pubDate) || new Date().toISOString(),
    guid: firstOf(item.guid, item.id, item.link),
    imageUrl: extractImageUrl(item),
    categories: item.categories || [],
  };
}

/** Normalizes an rss-parser feed. */
export function normalizeFeed(feed, feedUrl) {
  return {
    title: feed.title || 'Untitled Feed',
    description: feed.description || '',
    link: feed.link || feedUrl,
    feedUrl,
    language: feed.language || '',
    image: firstOf(feed.image?.url, feed.itunes?.image),
    items: (feed.items || []).map(normalizeItem),
  };
}

// A bare "&" (not starting an entity like &amp; or &#38;) is the most common
// way real feeds break XML; browsers shrug it off, the XML parser doesn't.
const BARE_AMPERSAND = /&(?![a-zA-Z][a-zA-Z0-9]*;|#[0-9]+;|#x[0-9a-fA-F]+;)/g;

/** Escapes bare ampersands so slightly malformed feeds still parse. */
export const escapeBareAmpersands = (xml) => xml.replace(BARE_AMPERSAND, '&amp;');

const looksLikeHtmlPage = (text) => /^\s*(<!doctype html|<html)/i.test(text);
export const NOT_A_FEED = 'The address returned a web page, not a feed. The site may have moved or dropped its feed.';

/**
 * Parses feed XML strictly first; if that fails, once more with bare "&"s
 * escaped. A web page where the feed should be gets a plain explanation.
 */
export async function parseFeedText(text) {
  if (looksLikeHtmlPage(text)) throw new Error(NOT_A_FEED);
  try {
    return await parser.parseString(text);
  } catch (strictError) {
    const repaired = escapeBareAmpersands(text);
    if (repaired === text) throw strictError;
    return parser.parseString(repaired).catch(() => { throw strictError; });
  }
}

/**
 * Parse an RSS/Atom feed URL and return structured data.
 */
export async function parseFeed(feedUrl) {
  try {
    const { text } = await fetchText(feedUrl, { headers: FEED_HEADERS });
    return normalizeFeed(await parseFeedText(text), feedUrl);
  } catch (error) {
    const message = error.message === NOT_A_FEED ? NOT_A_FEED : `Failed to parse feed: ${error.message}`;
    throw new Error(message, { cause: error });
  }
}

function enclosureImage(enclosure) {
  return enclosure?.type?.startsWith('image/') ? enclosure.url : '';
}

function firstImgSrc(html) {
  return html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] || '';
}

/**
 * Extract the best image URL from a feed item: media tags, then an image
 * enclosure, then the first <img> in the content.
 */
export function extractImageUrl(item) {
  return firstOf(
    item.mediaContent?.$?.url,
    item.mediaThumbnail?.$?.url,
    enclosureImage(item.enclosure),
    firstImgSrc(itemHtml(item)),
  );
}
