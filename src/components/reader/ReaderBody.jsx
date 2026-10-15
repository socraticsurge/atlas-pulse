import { HiOutlineArrowTopRightOnSquare } from 'react-icons/hi2';
import { estimateReadTime, formatDate } from '../../utils/helpers.js';

function Meta({ article, feedTitle, displayContent }) {
  return (
    <div className="reader-meta">
      <span className="meta-source">{feedTitle || 'Unknown Source'}</span>
      <span className="meta-divider">·</span>
      <span>{formatDate(article.publishedAt)}</span>
      <span className="meta-divider">·</span>
      <span>{estimateReadTime(displayContent)}</span>
      {article.author && (
        <>
          <span className="meta-divider">·</span>
          <span>By {article.author}</span>
        </>
      )}
    </div>
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
 * Article title, meta line, and body. While extraction runs, the feed's own
 * HTML (if any) is shown; afterwards, the best available content.
 */
export default function ReaderBody({ article, feedTitle, extracting, previewHtml, html, displayContent }) {
  return (
    <>
      <h1 className="article-title">{article.title}</h1>
      <Meta article={article} feedTitle={feedTitle} displayContent={displayContent} />
      {extracting && previewHtml && <div className="reader-article-content" dangerouslySetInnerHTML={{ __html: previewHtml }} />}
      {!extracting && <div className="reader-article-content" dangerouslySetInnerHTML={{ __html: html }} />}
      {!extracting && !displayContent && <NoContent link={article.link} />}
    </>
  );
}
