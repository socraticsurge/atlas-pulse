import { POPULAR_FEEDS } from '../../utils/constants.js';
import { getFaviconUrl } from '../../utils/helpers.js';
import { categoriesFor, getDomain } from './catalog.js';
import { FeedAddButton } from './FeedAddButton.jsx';

const hideOnError = (e) => { e.currentTarget.style.display = 'none'; };

function CategoryPills({ selected, onSelect }) {
  return (
    <div className="category-pills-scroll">
      <button className={`category-pill ${selected === 'all' ? 'active' : ''}`} onClick={() => onSelect('all')}>All</button>
      {POPULAR_FEEDS.map((cat) => (
        <button key={cat.category} className={`category-pill ${selected === cat.category ? 'active' : ''}`} onClick={() => onSelect(cat.category)}>
          {cat.emoji} {cat.category}
        </button>
      ))}
    </div>
  );
}

function PopularFeed({ feed, adder }) {
  return (
    <div className={`popular-feed-card ${adder.isAdded(feed.url) ? 'added' : ''}`}>
      <img src={getFaviconUrl(feed.siteUrl)} alt="" className="popular-feed-favicon" onError={hideOnError} />
      <div className="popular-feed-info">
        <div className="popular-feed-title">{feed.title}</div>
        {feed.description && <div className="popular-feed-desc">{feed.description}</div>}
        <div className="popular-feed-domain">{getDomain(feed.siteUrl)}</div>
      </div>
      <FeedAddButton url={feed.url} adder={adder} />
    </div>
  );
}

/** Popular tab: curated feeds by category. */
export function PopularTab({ category, onCategoryChange, adder }) {
  return (
    <div>
      <CategoryPills selected={category} onSelect={onCategoryChange} />
      <div className="discover-categories">
        {categoriesFor(category).map((cat) => (
          <div key={cat.category} className="discover-category">
            <h3>
              <span className="category-heading-emoji">{cat.emoji}</span>
              {cat.category}
              <span className="category-heading-desc">{cat.description}</span>
            </h3>
            <div className="popular-feeds-list">
              {cat.feeds.map((feed) => <PopularFeed key={feed.url} feed={feed} adder={adder} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
