import { useEffect, useState } from 'react';
import AIConfigStrip from '../ai-drawer/AIConfigStrip.jsx';
import ResizableHandle from '../shell/ResizableHandle.jsx';
import { countHint, countOk, OPERATIONS } from './operations.js';
import { ArticleChips, ExportBar, Instructions, Output, PanelHeader, TemplatePicker } from './Panels.jsx';
import { useMultiArticleGeneration } from './useMultiArticleGeneration.js';

// Slides in on mount.
function useSlideIn() {
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);
  return visible;
}

/** Multi-article AI panel: Compare, Newsletter, Briefing over the selected articles. */
export default function MultiArticlePanel({ articles, initialOperation, onClose, width, onResize }) {
  const [operation, setOperation] = useState(initialOperation || 'briefing');
  const [activeIds, setActiveIds] = useState(() => articles.map((a) => a.id));
  const [template, setTemplate] = useState('digest');
  const [instructions, setInstructions] = useState('');
  const gen = useMultiArticleGeneration();
  const visible = useSlideIn();

  const active = articles.filter((a) => activeIds.includes(a.id));
  const ok = countOk(OPERATIONS[operation], active.length);
  const generate = () => { if (ok) gen.generate({ operation, template, instructions, articles: active }); };
  const changeOperation = (key) => { setOperation(key); gen.reset(); };

  return (
    <>
      <ResizableHandle onResize={onResize} />
      <div className={`article-reader-panel flex-col bg-[var(--bg-secondary)]${visible ? ' visible' : ''}`} style={{ width }}>
        <PanelHeader operation={operation} onOperationChange={changeOperation} onClose={onClose} />
        <ArticleChips
          articles={articles}
          activeIds={activeIds}
          onRemove={(id) => setActiveIds((prev) => prev.filter((x) => x !== id))}
          hint={countHint(operation, active.length)}
          ok={ok}
        />
        {operation === 'newsletter' && <TemplatePicker value={template} onChange={setTemplate} />}
        <AIConfigStrip />
        <Instructions operation={operation} value={instructions} onChange={setInstructions} gen={gen} ok={ok} onGenerate={generate} />
        <Output operation={operation} gen={gen} onRetry={generate} />
        {gen.generated && gen.output && <ExportBar operation={operation} output={gen.output} />}
      </div>
    </>
  );
}
