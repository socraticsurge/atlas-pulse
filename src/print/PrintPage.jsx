import NewsletterPage from '../components/studio/templates/NewsletterPage.jsx';
import { pageMeta } from '../components/studio/templates/pageMeta.js';
import { parseIssue } from '../components/studio/templates/parseIssue.js';
import { presentation } from '../components/studio/templates/rules.js';

/** One Studio item's page, marked for the export renderer to capture. */
export default function PrintPage({ item, design }) {
  const issue = parseIssue(item.bodyMd, item.title);
  return (
    <div data-export-page style={{ width: 'fit-content' }}>
      <NewsletterPage design={design} issue={issue} presentation={presentation(issue)} meta={pageMeta(item, issue)} sources={item.sources} />
    </div>
  );
}
