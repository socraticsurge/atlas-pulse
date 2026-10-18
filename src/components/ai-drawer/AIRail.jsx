import { useRef, useState } from 'react';
import { HiOutlineSparkles, HiOutlineXMark } from 'react-icons/hi2';
import { cn } from '@/lib/utils';
import { NoAIEngine } from '../ollama/NoAIEngine.jsx';
import ResizableHandle from '../shell/ResizableHandle.jsx';
import AIConfigStrip from './AIConfigStrip.jsx';
import AnalysisPanel from './AnalysisPanel.jsx';
import AskBar from './AskBar.jsx';
import ChatTab from './ChatTab.jsx';
import HighlightsTab from './HighlightsTab.jsx';
import ModelPicker from './ModelPicker.jsx';
import SummaryTab from './SummaryTab.jsx';
import { useAIModels } from './useAIModels.js';
import { useArticleAnalysis } from './useArticleAnalysis.js';
import { useArticleChat } from './useArticleChat.js';
import { useArticleSummary } from './useArticleSummary.js';
import { Spinner } from '@/components/ui/spinner';

const TABS = [
  { id: 'summary', label: 'Summary' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'chat', label: 'Chat' },
  { id: 'highlights', label: 'Highlights' },
];

function Header({ ai, onClose }) {
  return (
    <div className="flex h-[var(--pane-header-height)] shrink-0 items-center gap-2 border-b border-border pr-2 pl-4">
      <HiOutlineSparkles className="size-4 text-primary" />
      <span className="mr-auto text-[13.5px] font-semibold text-foreground">AI</span>
      {!ai.checked && <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Spinner className="size-3 border-[1.5px]" /> checking</span>}
      {ai.ready && <ModelPicker models={ai.models} selectedModel={ai.selectedModel} onSelect={ai.setSelectedModel} />}
      <button type="button" onClick={onClose} title="Close AI rail (a)" aria-label="Close AI rail" className="flex size-8 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground hover:bg-[var(--bg-hover)] hover:text-foreground">
        <HiOutlineXMark className="size-4" />
      </button>
    </div>
  );
}

function TabBar({ tab, onChange, highlightCount }) {
  return (
    <div role="tablist" className="flex shrink-0 border-b border-border px-2">
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={tab === id}
          onClick={() => onChange(id)}
          className={cn(
            '-mb-px flex h-10 cursor-pointer items-center gap-1.5 border-0 border-b-2 bg-transparent px-2.5 text-[13px] transition-colors',
            tab === id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          {label}
          {id === 'highlights' && highlightCount > 0 && <span className="font-mono text-[10.5px] text-primary">{highlightCount}</span>}
        </button>
      ))}
    </div>
  );
}

// The closed rail: a narrow strip that keeps the way back in view.
function RailStrip({ onOpen }) {
  return (
    <div className="flex h-full w-11 shrink-0 flex-col items-center border-l border-border bg-[var(--bg-secondary)] pt-2">
      <button type="button" onClick={onOpen} title="Open AI rail (a)" aria-label="Open AI rail" className="flex size-8 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-primary hover:bg-[var(--bg-hover)]">
        <HiOutlineSparkles className="size-4" />
      </button>
    </div>
  );
}

function TabPanel({ tab, ctx }) {
  const { ai, article, summary, analysis, chat, highlights, onHighlightDeleted, suggest } = ctx;
  const model = ai.selectedModel;
  if (tab === 'analysis') return <AnalysisPanel {...analysis} onRun={analysis.run} canRun={Boolean(model) && !summary.summarizing} />;
  if (tab === 'chat') return <ChatTab chat={chat} onSuggest={suggest} />;
  if (tab === 'highlights') return <HighlightsTab highlights={highlights} onDelete={onHighlightDeleted} />;
  return <SummaryTab article={article} s={summary} canGenerate={Boolean(model) && !analysis.analyzing} />;
}

/**
 * The AI rail beside the open article: Summary, Analysis, Chat and
 * Highlights, the voice it answers in, and an "Ask AI" box on every tab.
 * Resizable from its left edge; closed, it leaves a thin strip. Tab state
 * lives in hooks here (not in the tabs) so it survives tab switches.
 */
export default function AIRail({ isOpen, onClose, width, onResize, article, extractedContent, feedTitle, onSummarySaved, highlights = [], onHighlightDeleted }) {
  const [tab, setTab] = useState('summary');
  const askRef = useRef(null);
  const ai = useAIModels();
  const model = ai.selectedModel;
  const summary = useArticleSummary({ article, extractedContent, model, feedTitle, onSummarySaved });
  const analysis = useArticleAnalysis({ article, extractedContent, model });
  const chat = useArticleChat({ article, extractedContent, model });

  if (!isOpen) return <RailStrip onOpen={onClose} />;
  const ask = () => { setTab('chat'); chat.send(); };
  const suggest = (text) => { chat.setInput(text); askRef.current?.focus(); };
  const ctx = { ai, article, summary, analysis, chat, highlights, onHighlightDeleted, suggest };

  return (
    <aside className="ai-drawer flex h-full shrink-0 flex-col overflow-hidden border-l border-border bg-[var(--bg-secondary)]" aria-label="AI assistant" style={{ width: `${width}px` }}>
      <ResizableHandle overlay className="left-0" onResize={onResize} />
      <Header ai={ai} onClose={onClose} />
      {ai.checked && !ai.ready && <div className="border-b border-border p-4"><NoAIEngine onReady={ai.loadModels} /></div>}
      {ai.ready && (
        <>
          <TabBar tab={tab} onChange={setTab} highlightCount={highlights.length} />
          <AIConfigStrip />
          <div className="min-h-0 flex-1 overflow-y-auto"><TabPanel tab={tab} ctx={ctx} /></div>
          <AskBar chat={chat} disabled={!model} onAsk={ask} inputRef={askRef} />
        </>
      )}
    </aside>
  );
}
