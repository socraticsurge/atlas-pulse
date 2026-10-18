import { HiOutlineArrowTopRightOnSquare } from 'react-icons/hi2';
import { estimateReadTime, formatDate } from '../../utils/helpers.js';

// Kicker above the headline: source, then date, read time and author.
function Kicker({ article, feedTitle, displayContent }) {
  const details = [formatDate(article.publishedAt), estimateReadTime(displayContent), article.author && `By ${article.author}`];
  return (
    <div className="reader-meta">
      <span className="meta-source">{feedTitle || 'Unknown Source'}</span>
      {details.filter(Boolean).map((detail) => (
        <span key={detail}><span className="meta-divider">·</span> {detail}</span>
      ))}
    </div>
  );
}

// The saved AI summary, as a one-paragraph brief under the headline.
function InBrief({ text }) {
  return (
    <aside className="reader-brief" aria-label="In brief">
      <div className="reader-brief-label">In brief</div>
      <p>{text}</p>
    </aside>
  );
}

function NoContent({ link }) {
  return (
    <div className="empty-state" style={{ padding: '40px 0' }}>
      <p>No content available for this article.</p>
      <a href={link} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
        <HiOutlineArrowTopRightOnSquare /> Read on Original Site
      </a>
    </div>
  );
}

/**
 * Kicker, headline, the AI brief when there is one, and the body. While
 * extraction runs, the feed's own HTML (if any) is shown; afterwards, the
 * best available content.
 */
export default function ReaderBody({ article, brief, feedTitle, extracting, previewHtml, html, displayContent }) {
  return (
    <>
      <Kicker article={article} feedTitle={feedTitle} displayContent={displayContent} />
      <h1 className="article-title">{article.title}</h1>
      {brief && <InBrief text={brief} />}
      {extracting && previewHtml && <div className="reader-article-content" dangerouslySetInnerHTML={{ __html: previewHtml }} />}
      {!extracting && <div className="reader-article-content" dangerouslySetInnerHTML={{ __html: html }} />}
      {!extracting && !displayContent && <NoContent link={article.link} />}
    </>
  );
}
