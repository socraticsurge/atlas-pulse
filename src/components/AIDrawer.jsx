import { useState } from 'react';
import { HiOutlineSparkles, HiOutlineXMark } from 'react-icons/hi2';
import { NoAIEngine } from './AIEngines.jsx';
import ResizableHandle from './ResizableHandle.jsx';
import AIConfigStrip from './ai-drawer/AIConfigStrip.jsx';
import AnalysisPanel from './ai-drawer/AnalysisPanel.jsx';
import ChatTab from './ai-drawer/ChatTab.jsx';
import HighlightsTab from './ai-drawer/HighlightsTab.jsx';
import ModelPicker from './ai-drawer/ModelPicker.jsx';
import SummaryTab from './ai-drawer/SummaryTab.jsx';
import { useAIModels } from './ai-drawer/useAIModels.js';
import { useArticleAnalysis } from './ai-drawer/useArticleAnalysis.js';
import { useArticleChat } from './ai-drawer/useArticleChat.js';
import { useArticleSummary } from './ai-drawer/useArticleSummary.js';

const TABS = [
  { id: 'summary', label: 'Summary' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'chat', label: 'Chat' },
  { id: 'highlights', label: 'Highlights' },
];

function TabBar({ tab, onChange, highlightCount }) {
  return (
    <div className="ai-drawer-tabs">
      {TABS.map(({ id, label }) => (
        <button key={id} className={`ai-tab ${tab === id ? 'active' : ''}`} onClick={() => onChange(id)}>
          {label}
          {id === 'highlights' && highlightCount > 0 && <span className="ai-tab-badge">{highlightCount}</span>}
        </button>
      ))}
    </div>
  );
}

function DrawerHeader({ ai, onClose }) {
  return (
    <div className="ai-drawer-header">
      <div className="ai-drawer-title">
        <HiOutlineSparkles className="ai-sparkle-icon" />
        <span>AI Assistant</span>
      </div>
      <div className="ai-drawer-header-right">
        {!ai.checked && (
          <span className="ai-checking-label">
            <span className="spinner" style={{ width: 11, height: 11 }} /> checking
          </span>
        )}
        {ai.ready && <ModelPicker models={ai.models} selectedModel={ai.selectedModel} onSelect={ai.setSelectedModel} />}
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} title="Close AI rail (a)">
          <HiOutlineXMark />
        </button>
      </div>
    </div>
  );
}

function DrawerBody({ ai, tab, setTab, article, summary, analysis, chat, highlights, onHighlightDeleted }) {
  const model = ai.selectedModel;
  const panels = {
    summary: () => <SummaryTab article={article} s={summary} canGenerate={Boolean(model) && !analysis.analyzing} />,
    analysis: () => (
      <div className="ai-drawer-body">
        <AnalysisPanel
          analysis={analysis.analysis}
          analyzing={analysis.analyzing}
          error={analysis.error}
          onRun={analysis.run}
          canRun={Boolean(model) && !summary.summarizing}
        />
      </div>
    ),
    chat: () => <ChatTab chat={chat} />,
    highlights: () => <HighlightsTab highlights={highlights} onDelete={onHighlightDeleted} />,
  };
  return (
    <>
      <TabBar tab={tab} onChange={setTab} highlightCount={highlights.length} />
      <AIConfigStrip />
      {panels[tab]()}
    </>
  );
}

// The closed rail: a thin strip that keeps the way back in view.
function RailStrip({ onOpen }) {
  return (
    <div className="ai-rail-strip">
      <button className="btn btn-ghost btn-icon" onClick={onOpen} title="Open AI rail (a)" aria-label="Open AI rail">
        <HiOutlineSparkles />
      </button>
    </div>
  );
}

/**
 * AI side rail beside the open article: Summary, Analysis, Chat, Highlights.
 * Resizable from its left edge. Tab state lives in hooks here (not in the
 * tabs) so it survives tab switches.
 */
export default function AIDrawer({ isOpen, onClose, width, onResize, article, extractedContent, feedTitle, onSummarySaved, highlights = [], onHighlightDeleted }) {
  const [tab, setTab] = useState('summary');
  const ai = useAIModels();
  const model = ai.selectedModel;
  const summary = useArticleSummary({ article, extractedContent, model, feedTitle, onSummarySaved });
  const analysis = useArticleAnalysis({ article, extractedContent, model });
  const chat = useArticleChat({ article, extractedContent, model });

  if (!isOpen) return <RailStrip onOpen={onClose} />;
  const showSetup = ai.checked && !ai.ready;

  return (
    <aside className="ai-drawer" aria-label="AI assistant" style={{ width: `${width}px` }}>
      <ResizableHandle className="overlay-resize-handle" onResize={onResize} />
      <DrawerHeader ai={ai} onClose={onClose} />
      {showSetup && (
        <div className="ai-drawer-setup">
          <NoAIEngine onReady={ai.loadModels} />
        </div>
      )}
      {ai.ready && (
        <DrawerBody
          ai={ai} tab={tab} setTab={setTab} article={article}
          summary={summary} analysis={analysis} chat={chat}
          highlights={highlights} onHighlightDeleted={onHighlightDeleted}
        />
      )}
    </aside>
  );
}
