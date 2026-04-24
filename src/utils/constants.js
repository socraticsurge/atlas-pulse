/**
 * Curated popular feeds organized by category for the Add Feed modal.
 * All URLs verified as working RSS/Atom feeds.
 */
export const POPULAR_FEEDS = [
  {
    category: 'Technology',
    feeds: [
      { title: 'TechCrunch', url: 'https://techcrunch.com/feed/', siteUrl: 'https://techcrunch.com' },
      { title: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', siteUrl: 'https://www.theverge.com' },
      { title: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', siteUrl: 'https://arstechnica.com' },
      { title: 'Hacker News', url: 'https://news.ycombinator.com/rss', siteUrl: 'https://news.ycombinator.com' },
      { title: 'Wired', url: 'https://www.wired.com/feed/rss', siteUrl: 'https://www.wired.com' },
      { title: 'The Next Web', url: 'https://thenextweb.com/feed', siteUrl: 'https://thenextweb.com' },
    ],
  },
  {
    category: 'AI & Machine Learning',
    feeds: [
      { title: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml', siteUrl: 'https://openai.com' },
      { title: 'Google AI Blog', url: 'https://blog.google/technology/ai/rss/', siteUrl: 'https://blog.google' },
      { title: 'Hugging Face Blog', url: 'https://huggingface.co/blog/feed.xml', siteUrl: 'https://huggingface.co' },
      { title: 'MIT News - AI', url: 'https://news.mit.edu/topic/mitartificial-intelligence2-rss.xml', siteUrl: 'https://news.mit.edu' },
      { title: 'AI News', url: 'https://www.artificialintelligence-news.com/feed/', siteUrl: 'https://www.artificialintelligence-news.com' },
    ],
  },
  {
    category: 'Business & Finance',
    feeds: [
      { title: 'Harvard Business Review', url: 'https://hbr.org/rss/most-popular', siteUrl: 'https://hbr.org' },
      { title: 'Inc. Magazine', url: 'https://www.inc.com/rss', siteUrl: 'https://www.inc.com' },
      { title: 'Entrepreneur', url: 'https://www.entrepreneur.com/latest.rss', siteUrl: 'https://www.entrepreneur.com' },
      { title: 'Fast Company', url: 'https://www.fastcompany.com/latest/rss', siteUrl: 'https://www.fastcompany.com' },
      { title: 'Forbes', url: 'https://www.forbes.com/innovation/feed2', siteUrl: 'https://www.forbes.com' },
      { title: 'First Round Review', url: 'https://review.firstround.com/feed.xml', siteUrl: 'https://review.firstround.com' },
    ],
  },
  {
    category: 'Science',
    feeds: [
      { title: 'Nature', url: 'https://www.nature.com/nature.rss', siteUrl: 'https://www.nature.com' },
      { title: 'Science Daily', url: 'https://www.sciencedaily.com/rss/all.xml', siteUrl: 'https://www.sciencedaily.com' },
      { title: 'NASA Breaking News', url: 'https://www.nasa.gov/news-release/feed/', siteUrl: 'https://www.nasa.gov' },
      { title: 'Phys.org', url: 'https://phys.org/rss-feed/', siteUrl: 'https://phys.org' },
      { title: 'Scientific American', url: 'https://rss.sciam.com/ScientificAmerican-Global', siteUrl: 'https://www.scientificamerican.com' },
    ],
  },
  {
    category: 'Design & Product',
    feeds: [
      { title: 'Smashing Magazine', url: 'https://www.smashingmagazine.com/feed/', siteUrl: 'https://www.smashingmagazine.com' },
      { title: 'A List Apart', url: 'https://alistapart.com/main/feed/', siteUrl: 'https://alistapart.com' },
      { title: 'CSS-Tricks', url: 'https://css-tricks.com/feed/', siteUrl: 'https://css-tricks.com' },
      { title: 'UX Collective', url: 'https://uxdesign.cc/feed', siteUrl: 'https://uxdesign.cc' },
      { title: 'Nielsen Norman Group', url: 'https://www.nngroup.com/feed/rss/', siteUrl: 'https://www.nngroup.com' },
    ],
  },
  {
    category: 'News',
    feeds: [
      { title: 'BBC News', url: 'https://feeds.bbci.co.uk/news/rss.xml', siteUrl: 'https://www.bbc.com/news' },
      { title: 'NPR News', url: 'https://feeds.npr.org/1001/rss.xml', siteUrl: 'https://www.npr.org' },
      { title: 'AP News', url: 'https://rsshub.app/apnews/topics/apf-topnews', siteUrl: 'https://apnews.com' },
      { title: 'The Guardian', url: 'https://www.theguardian.com/world/rss', siteUrl: 'https://www.theguardian.com' },
      { title: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', siteUrl: 'https://www.aljazeera.com' },
      { title: 'Reuters', url: 'https://www.reutersagency.com/feed/', siteUrl: 'https://www.reuters.com' },
    ],
  },
  {
    category: 'Startups & Venture Capital',
    feeds: [
      { title: 'Y Combinator Blog', url: 'https://www.ycombinator.com/blog/rss/', siteUrl: 'https://www.ycombinator.com' },
      { title: 'a16z Blog', url: 'https://a16z.com/feed/', siteUrl: 'https://a16z.com' },
      { title: 'Paul Graham Essays', url: 'http://www.aaronsw.com/2002/feeds/pgessays.rss', siteUrl: 'http://paulgraham.com' },
      { title: 'Stratechery', url: 'https://stratechery.com/feed/', siteUrl: 'https://stratechery.com' },
    ],
  },
];

export const DEFAULT_REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes

export const VIEW_TYPES = {
  ALL: 'all',
  TODAY: 'today',
  SAVED: 'saved',
  FEED: 'feed',
  FOLDER: 'folder',
};
