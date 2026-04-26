import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns';

/**
 * Format a date as a human-readable relative time string.
 */
export function timeAgo(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return '';
  }
}

/**
 * Format a date for display in article reader.
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    if (isToday(date)) return `Today at ${format(date, 'h:mm a')}`;
    if (isYesterday(date)) return `Yesterday at ${format(date, 'h:mm a')}`;
    return format(date, 'MMM d, yyyy · h:mm a');
  } catch {
    return '';
  }
}

/**
 * Estimate reading time from text content.
 */
export function estimateReadTime(content) {
  if (!content) return '1 min read';
  // Strip HTML tags for word count
  const text = content.replace(/<[^>]*>/g, '');
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min read`;
}

/**
 * Strip HTML tags and return plain text snippet.
 */
export function stripHtml(html, maxLength = 160) {
  if (!html) return '';
  const text = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

/**
 * Generate a favicon URL from a website URL.
 */
export function getFaviconUrl(siteUrl) {
  if (!siteUrl) return '';
  try {
    const url = new URL(siteUrl);
    return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`;
  } catch {
    return '';
  }
}

/**
 * Normalize a URL by ensuring it has a protocol.
 */
export function normalizeUrl(url) {
  if (!url) return '';
  url = url.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  return url;
}

const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
  'fbclid', 'gclid', 'msclkid', '_ga', 'mc_cid', 'mc_eid', 'ref', 'source',
]);

/**
 * Produce a canonical URL for cross-feed deduplication.
 * Strips tracking params, removes www prefix, removes fragment, sorts params.
 */
export function canonicalizeUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, '');
    u.hash = '';
    for (const key of [...u.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) u.searchParams.delete(key);
    }
    u.searchParams.sort();
    if (u.pathname !== '/' && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.toString();
  } catch {
    return url;
  }
}
