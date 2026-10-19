import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import ArticleList from './components/ArticleList.jsx';
import ArticleReader from './components/ArticleReader.jsx';
import ReaderErrorBoundary from './components/reader/ReaderErrorBoundary.jsx';
import ReaderPlaceholder from './components/shell/ReaderPlaceholder.jsx';
import ResizableHandle from './components/shell/ResizableHandle.jsx';
import Sidebar from './components/Sidebar.jsx';
import { AppearanceProvider } from './app/AppearanceContext.jsx';
import { LibraryProvider, useLibrary } from './app/LibraryContext.jsx';
import { ToastProvider, useToast } from './app/ToastContext.jsx';
import { useLayout } from './app/useLayout.js';
import { usePaneKeyboard } from './app/usePaneKeyboard.js';
import { emit, on } from './lib/appEvents.js';
import { useSettingsModal } from './app/useSettingsModal.js';
import { useCommandPalette } from './app/useCommandPalette.js';
import { usePaletteCommands } from './app/usePaletteCommands.js';
import { useArticleNavigation, useLibraryNavigation, useSummaryCount } from './app/useWorkspace.js';
import { useAIBatchProcessor } from './hooks/useAIBatchProcessor.js';

// Screens opened now and then load on first use, keeping the startup bundle
// small (the list, the reader and the AI rail are in it).
const AddFeedDialog = lazy(() => import('./components/add-feed/AddFeedDialog.jsx'));
const CollectionPicker = lazy(() => import('./components/library/CollectionPicker.jsx'));
const CommandPalette = lazy(() => import('./components/shell/CommandPalette.jsx'));
const HighlightsScreen = lazy(() => import('./components/library/HighlightsScreen.jsx'));
const MultiArticlePanel = lazy(() => import('./components/multi-article/MultiArticlePanel.jsx'));
const SettingsScreen = lazy(() => import('./components/settings/SettingsScreen.jsx'));
const SummariesScreen = lazy(() => import('./components/library/SummariesScreen.jsx'));
const StudioScreen = lazy(() => import('./components/studio/StudioScreen.jsx'));

const LIBRARY_VIEWS = { library: SummariesScreen, highlights: HighlightsScreen, studio: StudioScreen };
// The palette searches all articles while a library screen is open.
const ALL_ARTICLES = { type: 'all' };

// Mounts lazy children only once they have been opened, then keeps them
// mounted (so dialogs keep their state and close animations).
function OnceOpened({ open, children }) {
  const [opened, setOpened] = useState(open);
  if (open && !opened) setOpened(true);
  return opened ? <Suspense fallback={null}>{children}</Suspense> : null;
}

// Right-hand panel: the multi-article AI panel, the reader, or nothing.
function DetailPanel({ multiPanel, onCloseMulti, reader, layout }) {
  if (multiPanel) {
    return (
      <Suspense fallback={<ReaderPlaceholder width={layout.readerWidth} onResize={layout.resizeReader} />}>
        <MultiArticlePanel articles={multiPanel.articles} initialOperation={multiPanel.operation} onClose={onCloseMulti} width={layout.readerWidth} onResize={layout.resizeReader} />
      </Suspense>
    );
  }
  if (!reader.article) return <ReaderPlaceholder width={layout.readerWidth} onResize={layout.resizeReader} />;
  return (
    <ReaderErrorBoundary width={layout.readerWidth} onClose={reader.onClose}>
      <ArticleReader {...reader} isOpen width={layout.readerWidth} onResize={layout.resizeReader} />
    </ReaderErrorBoundary>
  );
}

function useBatchActions(batch) {
  const showToast = useToast();
  const trigger = useCallback(async () => {
    const { queued, reason } = await batch.triggerBatch();
    if (reason === 'no-model') showToast('No AI model available. Open Atlas Pulse in Google Chrome for Gemini Nano, or set up Ollama in Settings → AI Processing.', 'error');
    else if (queued > 0) showToast(`Analyzing ${queued} recent article${queued !== 1 ? 's' : ''}`);
    else showToast('All recent articles are already analyzed', 'error');
  }, [batch, showToast]);
  const clear = useCallback(async () => {
    const cleared = await batch.clearQueue();
    showToast(`Cleared ${cleared} article${cleared !== 1 ? 's' : ''} from the AI queue`);
  }, [batch, showToast]);
  return { trigger, clear };
}

// The ⌘K palette with the workspace's commands and the current list's articles.
function PaletteHost({ open, onOpenChange, view, onOpenArticle, commands }) {
  const { feeds } = useLibrary();
  const groups = usePaletteCommands(commands);
  const sourceOf = useCallback((article) => feeds.find((f) => f.id === article.feedId)?.title || '', [feeds]);
  return <CommandPalette open={open} onOpenChange={onOpenChange} groups={groups} view={view} sourceOf={sourceOf} onOpenArticle={onOpenArticle} />;
}

// The collection picker, opened by the 'open-collections' event with the
// article ids to file (c in the reader, Collect on a selection).
function useCollectionPicker() {
  const [articleIds, setArticleIds] = useState(null);
  useEffect(() => on('open-collections', (ids) => { if (ids?.length) setArticleIds(ids); }), []);
  const close = useCallback(() => setArticleIds(null), []);
  return { open: articleIds !== null, articleIds, close };
}

function CollectionPickerHost({ picker }) {
  return (
    <OnceOpened open={picker.open}>
      <CollectionPicker key={picker.articleIds?.join(',')} open={picker.open} articleIds={picker.articleIds ?? []} onClose={picker.close} />
    </OnceOpened>
  );
}

// Dialogs over the workspace: Add Feed or Settings (modal), the collection
// picker, and whether any of them or the palette is open (single-key
// shortcuts pause while one is).
function useOverlays(paletteOpen) {
  const [modal, setModal] = useState(null); // 'addFeed' | 'settings' | null
  const closeModal = useCallback(() => setModal(null), []);
  const settingsSection = useSettingsModal(setModal);
  const picker = useCollectionPicker();
  const anyOpen = [modal !== null, paletteOpen, picker.open].some(Boolean);
  return { modal, setModal, closeModal, settingsSection, picker, anyOpen };
}

function Workspace({ activeView, setActiveView, selectedArticle, setSelectedArticle }) {
  const library = useLibrary();
  const layout = useLayout();
  const batch = useAIBatchProcessor();
  const batchActions = useBatchActions(batch);
  const [visibleArticles, setVisibleArticles] = useState([]);
  const [multiPanel, setMultiPanel] = useState(null); // { articles, operation }
  const [summaryCount, refreshSummaryCount] = useSummaryCount(activeView.type);
  const [changedArticle, setChangedArticle] = useState(null);
  const onArticleChanged = useCallback((updated) => { library.bumpCounts(); setChangedArticle(updated); }, [library]);
  const onLibraryChanged = useCallback(() => { refreshSummaryCount(); library.bumpCounts(); }, [refreshSummaryCount, library]);
  const nav = useArticleNavigation(selectedArticle, setSelectedArticle, visibleArticles);
  const [paletteOpen, setPaletteOpen] = useCommandPalette();
  const { modal, setModal, closeModal, settingsSection, picker, anyOpen: overlayOpen } = useOverlays(paletteOpen);
  usePaneKeyboard({ isModalOpen: overlayOpen, toggleSidebar: layout.toggleSidebarMode, toggleList: layout.toggleList });
  const goToView = useCallback((view) => { setActiveView(view); setSelectedArticle(null); }, [setActiveView, setSelectedArticle]);

  const closeReader = useCallback(() => setSelectedArticle(null), [setSelectedArticle]);
  const { openFromLibrary, selectStudioItem } = useLibraryNavigation(setActiveView, setSelectedArticle);
  const LibraryScreen = LIBRARY_VIEWS[activeView.type];

  return (
    <div className={layout.listHidden ? 'app-layout list-hidden' : 'app-layout'}>
      <Sidebar
        mode={layout.sidebarMode}
        activeView={activeView}
        onViewChange={goToView}
        onAddFeed={() => setModal('addFeed')} onSettings={() => emit('open-settings')} onToggleMode={layout.toggleSidebarMode}
        librarySummaryCount={summaryCount}
        style={{ width: layout.effectiveSidebarWidth, minWidth: layout.effectiveSidebarWidth }}
      />
      {layout.sidebarMode === 'expanded' && <ResizableHandle onResize={layout.resizeSidebar} />}

      {LibraryScreen ? <Suspense fallback={<div className="flex-1" />}><LibraryScreen onOpenArticle={openFromLibrary} onChanged={onLibraryChanged} selectedId={activeView.id} onSelect={selectStudioItem} /></Suspense> : (
        <>
          <ArticleList
            activeView={activeView}
            selectedArticleId={selectedArticle?.id}
            onSelectArticle={setSelectedArticle}
            onArticlesLoaded={setVisibleArticles}
            batch={{ status: batch.status, pauseReason: batch.pauseReason, queuedCount: batch.queuedCount, onTrigger: batchActions.trigger, onClear: batchActions.clear }}
            onOpenAIPanel={(articles, operation) => { setMultiPanel({ articles, operation }); setSelectedArticle(null); }}
            refreshKey={library.articlesRefreshKey}
            onCountChanged={library.bumpCounts}
            changedArticle={changedArticle}
          />
          <DetailPanel
            multiPanel={multiPanel}
            onCloseMulti={() => setMultiPanel(null)}
            layout={layout}
            reader={{
              article: selectedArticle, isModalOpen: overlayOpen, onClose: closeReader, onArticleChanged,
              onNavigate: nav.navigate, hasPrev: nav.hasPrev, hasNext: nav.hasNext, currentIndex: nav.index,
              totalCount: visibleArticles.length, onSummarySaved: refreshSummaryCount,
            }}
          />
        </>
      )}

      <OnceOpened open={paletteOpen}><PaletteHost
        open={paletteOpen} onOpenChange={setPaletteOpen} view={LibraryScreen ? ALL_ARTICLES : activeView}
        onOpenArticle={LibraryScreen ? openFromLibrary : setSelectedArticle}
        commands={{ goToView, setModal, layout, readerOpen: Boolean(selectedArticle) }}
      /></OnceOpened>
      <CollectionPickerHost picker={picker} />
      <OnceOpened open={modal === 'addFeed'}><AddFeedDialog isOpen={modal === 'addFeed'} onClose={closeModal} /></OnceOpened>
      <OnceOpened open={modal === 'settings'}>
        <SettingsScreen key={settingsSection ?? 'start'} section={settingsSection} isOpen={modal === 'settings'} onClose={closeModal} availableModels={batch.availableModels} />
      </OnceOpened>
    </div>
  );
}

// View and selection state lives above the library provider so that deleting
// the current feed or folder can return the app to All Articles.
function AppShell() {
  const [activeView, setActiveView] = useState({ type: 'all' });
  const [selectedArticle, setSelectedArticle] = useState(null);
  // (type, id) leaves that feed or folder view; (null) leaves any of them.
  const onViewRemoved = useCallback((type, id) => {
    setActiveView((view) => (type === null || (view.type === type && view.id === id) ? { type: 'all' } : view));
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
