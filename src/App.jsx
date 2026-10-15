import { useCallback, useState } from 'react';
import AddFeedModal from './components/AddFeedModal.jsx';
import ArticleList from './components/ArticleList.jsx';
import ArticleReader from './components/ArticleReader.jsx';
import HighlightsLibrary from './components/HighlightsLibrary.jsx';
import LibraryView from './components/LibraryView.jsx';
import MultiArticlePanel from './components/MultiArticlePanel.jsx';
import ReaderErrorBoundary from './components/ReaderErrorBoundary.jsx';
import ResizableHandle from './components/ResizableHandle.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import Sidebar from './components/Sidebar.jsx';
import { AppearanceProvider } from './app/AppearanceContext.jsx';
import { LibraryProvider, useLibrary } from './app/LibraryContext.jsx';
import { ToastProvider, useToast } from './app/ToastContext.jsx';
import { useLayout } from './app/useLayout.js';
import { useArticleNavigation, useSummaryCount } from './app/useWorkspace.js';
import { useAIBatchProcessor } from './hooks/useAIBatchProcessor.js';

const LIBRARY_VIEWS = { library: LibraryView, highlights: HighlightsLibrary };

// Right-hand panel: the multi-article AI panel, the reader, or nothing.
function DetailPanel({ multiPanel, onCloseMulti, reader, layout }) {
  if (multiPanel) {
    return (
      <MultiArticlePanel articles={multiPanel.articles} initialOperation={multiPanel.operation} onClose={onCloseMulti} width={layout.readerWidth} onResize={layout.resizeReader} />
    );
  }
  if (!reader.article) return null;
  return (
    <ReaderErrorBoundary width={layout.readerWidth} onClose={reader.onClose}>
      <ArticleReader {...reader} isOpen width={layout.readerWidth} onResize={layout.resizeReader} />
    </ReaderErrorBoundary>
  );
}

function useBatchTrigger(triggerBatch) {
  const showToast = useToast();
  return useCallback(async () => {
    const count = await triggerBatch();
    if (count > 0) showToast(`Queued ${count} article${count !== 1 ? 's' : ''} for AI analysis`);
    else showToast('All recent articles are already analyzed', 'error');
  }, [triggerBatch, showToast]);
}

function Workspace({ activeView, setActiveView, selectedArticle, setSelectedArticle }) {
  const library = useLibrary();
  const layout = useLayout();
  const batch = useAIBatchProcessor();
  const onTriggerBatch = useBatchTrigger(batch.triggerBatch);
  const [visibleArticles, setVisibleArticles] = useState([]);
  const [modal, setModal] = useState(null); // 'addFeed' | 'settings' | null
  const [multiPanel, setMultiPanel] = useState(null); // { articles, operation }
  const [summaryCount, refreshSummaryCount] = useSummaryCount(activeView.type);
  const nav = useArticleNavigation(selectedArticle, setSelectedArticle, visibleArticles);

  const closeReader = useCallback(() => setSelectedArticle(null), [setSelectedArticle]);
  const openFromLibrary = useCallback((article) => { setActiveView({ type: 'all' }); setSelectedArticle(article); }, [setActiveView, setSelectedArticle]);
  const LibraryScreen = LIBRARY_VIEWS[activeView.type];

  return (
    <div className="app-layout">
      <Sidebar
        mode={layout.sidebarMode}
        activeView={activeView}
        onViewChange={(view) => { setActiveView(view); setSelectedArticle(null); }}
        onAddFeed={() => setModal('addFeed')}
        onSettings={() => setModal('settings')}
        onToggleMode={layout.toggleSidebarMode}
        librarySummaryCount={summaryCount}
        style={{ width: layout.effectiveSidebarWidth, minWidth: layout.effectiveSidebarWidth }}
      />
      {layout.sidebarMode === 'expanded' && <ResizableHandle onResize={layout.resizeSidebar} />}

      {LibraryScreen ? <LibraryScreen onOpenArticle={openFromLibrary} /> : (
        <>
          <ArticleList
            activeView={activeView}
            selectedArticleId={selectedArticle?.id}
            onSelectArticle={setSelectedArticle}
            onArticlesLoaded={setVisibleArticles}
            sidebarHidden={layout.sidebarMode === 'hidden'}
            onShowSidebar={layout.toggleSidebarMode}
            batchProgress={batch.progress}
            batchQueuedCount={batch.queuedCount}
            onTriggerBatch={onTriggerBatch}
            onOpenAIPanel={(articles, operation) => { setMultiPanel({ articles, operation }); setSelectedArticle(null); }}
            refreshKey={library.articlesRefreshKey}
            onCountChanged={library.bumpCounts}
          />
          <DetailPanel
            multiPanel={multiPanel}
            onCloseMulti={() => setMultiPanel(null)}
            layout={layout}
            reader={{
              article: selectedArticle,
              isModalOpen: modal !== null,
              onClose: closeReader,
              onNavigate: nav.navigate,
              hasPrev: nav.hasPrev,
              hasNext: nav.hasNext,
              currentIndex: nav.index,
              totalCount: visibleArticles.length,
              onSummarySaved: refreshSummaryCount,
              onArticleChanged: library.bumpCounts,
            }}
          />
        </>
      )}

      <AddFeedModal isOpen={modal === 'addFeed'} onClose={() => setModal(null)} />
      <SettingsPanel isOpen={modal === 'settings'} onClose={() => setModal(null)} availableModels={batch.availableModels} />
    </div>
  );
}

// View and selection state lives above the library provider so that deleting
// the current feed or folder can return the app to All Articles.
function AppShell() {
  const [activeView, setActiveView] = useState({ type: 'all' });
  const [selectedArticle, setSelectedArticle] = useState(null);
  const onViewRemoved = useCallback((type, id) => {
    setActiveView((view) => (view.type === type && view.id === id ? { type: 'all' } : view));
  }, []);
  return (
    <LibraryProvider onViewRemoved={onViewRemoved}>
      <Workspace activeView={activeView} setActiveView={setActiveView} selectedArticle={selectedArticle} setSelectedArticle={setSelectedArticle} />
    </LibraryProvider>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppearanceProvider>
        <AppShell />
      </AppearanceProvider>
    </ToastProvider>
  );
}
