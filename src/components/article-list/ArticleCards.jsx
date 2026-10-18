import { HiOutlineCheck, HiOutlineMagnifyingGlass, HiOutlineNewspaper, HiOutlineSparkles } from 'react-icons/hi2';
import { stripHtml, timeAgo } from '../../utils/helpers.js';
import FeedFavicon from '../FeedFavicon.jsx';
import { shortTime } from './listLogic.js';

function SelectButton({ selected, onToggle, className }) {
  return (
    <button
      className={`article-select-btn${selected ? ' selected' : ''} ${className}`}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      title={selected ? 'Deselect' : 'Select'}
    >
      {selected ? <HiOutlineCheck /> : <span className="select-circle" />}
    </button>
  );
}

function SourceIcon({ feed, imgClass, iconClass }) {
  return <FeedFavicon src={feed?.favicon} imgClass={imgClass} iconClass={iconClass} />;
}

const hideOnError = (e) => { e.target.style.display = 'none'; };

const cardClass = (base, { article, active, selected }) =>
  `${base} ${article.isRead ? 'read' : ''} ${active ? 'active' : ''} ${selected ? 'card-selected' : ''}`;

function CompactCard({ article, feed, state, onOpen, onToggle }) {
  return (
    <div className={cardClass('article-card-compact', state)} onClick={onOpen}>
      <SelectButton selected={state.selected} onToggle={onToggle} className="compact-checkbox" />
      {!article.isRead && <div className="unread-dot-compact" />}
      <SourceIcon feed={feed} imgClass="compact-favicon" iconClass="compact-source-icon" />
      <span className="compact-source">{feed?.title || 'Unknown'}</span>
      <span className="compact-title">{article.title}</span>
      <span className="compact-ai-col">{article.aiStatus === 'done' && <HiOutlineSparkles title="AI analyzed" />}</span>
      <span className="compact-time" title={timeAgo(article.publishedAt)}>{shortTime(article.publishedAt)}</span>
    </div>
  );
}

function ExcerptCard({ article, feed, state, onOpen, onToggle }) {
  const summary = stripHtml(article.excerpt || '');
  return (
    <div className={cardClass('article-card-excerpt', state)} onClick={onOpen}>
      <SelectButton selected={state.selected} onToggle={onToggle} className="excerpt-checkbox" />
      {!article.isRead && <div className="unread-dot-compact" />}
      <div className="excerpt-meta">
        <SourceIcon feed={feed} imgClass="excerpt-favicon" iconClass="excerpt-source-icon" />
        <span className="excerpt-source">{feed?.title || 'Unknown'}</span>
        <span className="excerpt-time">{timeAgo(article.publishedAt)}</span>
        {article.aiStatus === 'done' && <span className="excerpt-ai-badge" title="AI analyzed"><HiOutlineSparkles /> AI</span>}
      </div>
      <div className="excerpt-body">
        <div className="excerpt-text">
          <div className="excerpt-title">{article.title}</div>
          {summary && <div className="excerpt-summary">{summary}</div>}
        </div>
        {article.imageUrl && <img className="excerpt-thumbnail" src={article.imageUrl} alt="" loading="lazy" onError={hideOnError} />}
      </div>
    </div>
  );
}

function GridCard({ article, feed, state, onOpen, onToggle }) {
  return (
    <div className={cardClass('article-card-grid', state)} onClick={onOpen}>
      <SelectButton selected={state.selected} onToggle={onToggle} className="grid-checkbox" />
      <div className="card-image-wrap">
        {article.imageUrl
          ? <img className="card-image" src={article.imageUrl} alt="" loading="lazy" onError={hideOnError} />
          : <div className="card-image-placeholder"><HiOutlineNewspaper /></div>}
        {article.aiStatus === 'done' && <span className="card-ai-badge" title="AI analyzed"><HiOutlineSparkles /></span>}
      </div>
      <div className="card-body">
        <div className="card-meta">
          {!article.isRead && <span className="card-unread-dot" />}
          <SourceIcon feed={feed} imgClass="card-favicon" iconClass="card-favicon-icon" />
          <span className="card-source">{feed?.title || 'Unknown'}</span>
          <span className="card-dot" />
          <span className="card-time">{timeAgo(article.publishedAt)}</span>
        </div>
        <h3 className="card-title">{article.title}</h3>
      </div>
    </div>
  );
}

const CARDS = { compact: CompactCard, excerpt: ExcerptCard, magazine: GridCard };

/** One article in the current view mode (grid "magazine", list "excerpt", or compact). */
export function ArticleCard({ viewMode, article, feed, active, selected, onSelectArticle, onToggleSelect }) {
  const Card = CARDS[viewMode] || GridCard;
  return (
    <Card
      article={article}
      feed={feed}
      state={{ article, active, selected }}
      onOpen={() => onSelectArticle(article)}
      onToggle={() => onToggleSelect(article.id)}
    />
  );
}

export function LoadingCards() {
  return Array.from({ length: 8 }, (_, i) => (
    <div key={i} className="article-card-skeleton">
      <div className="skeleton-line skeleton-short" />
      <div className="skeleton-line" />
      <div className="skeleton-line skeleton-medium" />
    </div>
  ));
}

export function EmptyList({ title, body, searching }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">{searching ? <HiOutlineMagnifyingGlass /> : <HiOutlineSparkles />}</span>
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}
