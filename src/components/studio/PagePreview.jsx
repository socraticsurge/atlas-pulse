import { useEffect, useMemo, useRef, useState } from 'react';
import NewsletterPage from './templates/NewsletterPage.jsx';
import { designById } from './templates/designs/index.js';
import { pageMeta } from './templates/pageMeta.js';
import { parseIssue } from './templates/parseIssue.js';
import { presentation } from './templates/rules.js';

const PAGE_WIDTH = 1000;

// The scale that fits a page of PAGE_WIDTH into the element's width (never above 1).
function useFitScale(ref) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(([entry]) => setScale(Math.min(1, entry.contentRect.width / PAGE_WIDTH)));
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return scale;
}

/** The newsletter as a page in its design, scaled to fit, updating as the draft changes. */
export default function PagePreview({ item, draft }) {
  const ref = useRef(null);
  const scale = useFitScale(ref);
  const issue = useMemo(() => parseIssue(draft.bodyMd, draft.title), [draft.bodyMd, draft.title]);
  const shown = useMemo(() => presentation(issue), [issue]);
  const meta = useMemo(() => pageMeta(item, issue), [item, issue]);
  return (
    <div ref={ref} className="w-full">
      <div className="mx-auto shadow-[0_1px_12px_rgba(0,0,0,0.25)]" style={{ width: PAGE_WIDTH, zoom: scale }}>
        <NewsletterPage design={designById(draft.template)} issue={issue} presentation={shown} meta={meta} sources={item.sources} />
      </div>
    </div>
  );
}
