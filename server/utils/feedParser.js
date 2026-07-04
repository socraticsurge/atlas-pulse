import RSSParser from 'rss-parser';
import { assertPublicHttpUrl } from './urlGuard.js';

const parser = new RSSParser({
  timeout: 15000,
  headers: {
    'User-Agent': 'RSS-Feed-Reader/1.0',
    'Accept': 'application/rss+xml, application/xml, application/atom+xml, text/xml, */*',
  },
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['content:encoded', 'contentEncoded'],
      ['dc:creator', 'dcCreator'],
    ],
  },
});

/**
 * Parse an RSS/Atom feed URL and return structured data.
 */
export async function parseFeed(feedUrl) {
  try {
    await assertPublicHttpUrl(feedUrl);
    const feed = await parser.parseURL(feedUrl);

    return {
      title: feed.title || 'Untitled Feed',
      description: feed.description || '',
      link: feed.link || feedUrl,
      feedUrl: feedUrl,
      language: feed.language || '',
      image: feed.image?.url || feed.itunes?.image || '',
      items: (feed.items || []).map((item) => ({
        title: item.title || 'Untitled',
        link: item.link || '',
        content: item.contentEncoded || item['content:encoded'] || item.content || item.summary || '',
        summary: item.contentSnippet || item.summary || '',
        author: item.dcCreator || item.creator || item.author || '',
        publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
        guid: item.guid || item.id || item.link || '',
        imageUrl: extractImageUrl(item),
        categories: item.categories || [],
      })),
    };
  } catch (error) {
    throw new Error(`Failed to parse feed: ${error.message}`);
  }
}

/**
 * Extract the best image URL from a feed item.
 */
function extractImageUrl(item) {
  // Try media content
  if (item.mediaContent?.$?.url) return item.mediaContent.$.url;
  if (item.mediaThumbnail?.$?.url) return item.mediaThumbnail.$.url;

  // Try enclosure
  if (item.enclosure?.url && item.enclosure.type?.startsWith('image/')) {
    return item.enclosure.url;
  }

  // Try to extract from content HTML
  const content = item.contentEncoded || item['content:encoded'] || item.content || '';
  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch) return imgMatch[1];

  return '';
}
