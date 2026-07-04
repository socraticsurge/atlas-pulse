import { useState, useCallback, useEffect, useRef, Component } from 'react';
import Sidebar from './components/Sidebar.jsx';
import ArticleList from './components/ArticleList.jsx';
import ArticleReader from './components/ArticleReader.jsx';
import AddFeedModal from './components/AddFeedModal.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import LibraryView from './components/LibraryView.jsx';
import HighlightsLibrary from './components/HighlightsLibrary.jsx';
import MultiArticlePanel from './components/MultiArticlePanel.jsx';
import ResizableHandle from './components/ResizableHandle.jsx';
import { useFeeds } from './hooks/useFeeds.js';
import { useFolders } from './hooks/useFolders.js';
import { useAIBatchProcessor } from './hooks/useAIBatchProcessor.js';
import { getAutoRefreshMinutes } from './utils/constants.js';
import { fetchSummaries } from './utils/api.js';

class ReaderErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err) { console.error('[ArticleReader]', err); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="article-reader-panel visible" style={{ width: this.props.width }}>
          <div className="empty-state" style={{ padding: '60px 32px', textAlign: 'center' }}>
            <p style={{ marginBottom: 16 }}>Something went wrong displaying this article.</p>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { this.setState({ hasError: false }); this.props.onClose(); }}
            >
              Close
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const SIDEBAR_MIN = 180;
const SIDEBAR_MAX = 400;
const SIDEBAR_ICON_WIDTH = 56;

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function adjustHexBrightness(hex, amount) {
  const clamp = (n) => Math.min(255, Math.max(0, n));
  const r = clamp(parseInt(hex.slice(1, 3), 16) + amount);
  const g = clamp(parseInt(hex.slice(3, 5), 16) + amount);
  const b = clamp(parseInt(hex.slice(5, 7), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function App() {
  const [activeView, setActiveView] = useState({ type: 'all' });
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [visibleArticles, setVisibleArticles] = useState([]);
  const [showAddFeed, setShowAddFeed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefreshMinutes, setAutoRefreshMinutes] = useState(getAutoRefreshMinutes);
  const [toast, setToast] = useState(null);

  const [theme, setTheme] = useState(() =>
    localStorage.getItem('atlas-pulse-theme') || localStorage.getItem('feedflow-theme') || 'dark'
  );
  const [appFont, setAppFont] = useState(() =>
    localStorage.getItem('atlas-pulse-font') || 'sans'
  );
  const [appColor, setAppColor] = useState(() =>
    localStorage.getItem('atlas-pulse-color') || 'emerald'
  );
  const [customAccentHex, setCustomAccentHex] = useState(() =>
    localStorage.getItem('atlas-pulse-custom-color') || '#00d4aa'
  );
  const [appTextColor, setAppTextColor] = useState(() =>
    localStorage.getItem('atlas-pulse-text') || 'default'
  );
  const [customTextColorHex, setCustomTextColorHex] = useState(() =>
    localStorage.getItem('atlas-pulse-custom-text') || '#e8eaed'
  );
  const [sidebarMode, setSidebarMode] = useState(() =>
    localStorage.getItem('atlas-pulse-sidebar-mode') || 'expanded'
  );

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const stored = localStorage.getItem('atlas-pulse-sidebar-width');
    return stored ? parseInt(stored, 10) : 260;
  });
  const [readerWidth, setReaderWidth] = useState(() => {
    const stored = localStorage.getItem('atlas-pulse-reader-width');
    return stored ? parseInt(stored, 10) : 600;
  });

  const [librarySummaryCount, setLibrarySummaryCount] = useState(0);
  const [multiPanel, setMultiPanel] = useState(null); // { articles, operation }

  // Incremented after any mutation that changes article data — used to trigger re-fetches
  const [articlesRefreshKey, setArticlesRefreshKey] = useState(0);
  const [countsRefreshKey, setCountsRefreshKey] = useState(0);

  const bumpArticles = useCallback(() => {
    setArticlesRefreshKey(k => k + 1);
    setCountsRefreshKey(k => k + 1);
  }, []);
  const bumpCounts = useCallback(() => setCountsRefreshKey(k => k + 1), []);

  const { feeds, addFeed, removeFeed, updateFeedFolder, refreshAllFeeds, importFeedsFromOPML } = useFeeds(bumpArticles);
  const { folders, addFolder, renameFolder, deleteFolder, deleteFolderAndFeeds } = useFolders();
  const { availableModels, progress: batchProgress, queuedCount: batchQueuedCount, triggerBatch } = useAIBatchProcessor();
  const refreshIntervalRef = useRef(null);

  // Keep sidebar library badge in sync with the server-side summaries count
  useEffect(() => {
    fetchSummaries().then(rows => setLibrarySummaryCount(rows.length)).catch(() => {});
  }, [activeView.type]);

  const handleSummarySaved = useCallback(() => {
    fetchSummaries().then(rows => setLibrarySummaryCount(rows.length)).catch(() => {});
  }, []);

  const effectiveSidebarWidth = sidebarMode === 'hidden' ? 0
    : sidebarMode === 'icon' ? SIDEBAR_ICON_WIDTH
    : sidebarWidth;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-font', appFont);
    localStorage.setItem('atlas-pulse-theme', theme);
    localStorage.setItem('atlas-pulse-font', appFont);

    if (appTextColor === 'custom') {
      document.documentElement.setAttribute('data-text', 'custom');
      document.documentElement.style.setProperty('--text-primary', customTextColorHex);
      localStorage.setItem('atlas-pulse-text', 'custom');
      localStorage.setItem('atlas-pulse-custom-text', customTextColorHex);
    } else {
      document.documentElement.setAttribute('data-text', appTextColor);
      document.documentElement.style.removeProperty('--text-primary');
      localStorage.setItem('atlas-pulse-text', appTextColor);
    }

    if (appColor === 'custom') {
      document.documentElement.setAttribute('data-color', 'custom');
      document.documentElement.style.setProperty('--accent', customAccentHex);
      document.documentElement.style.setProperty('--accent-hover', adjustHexBrightness(customAccentHex, 20));
      document.documentElement.style.setProperty('--accent-muted', hexToRgba(customAccentHex, 0.15));
      document.documentElement.style.setProperty('--accent-border', hexToRgba(customAccentHex, 0.3));
      document.documentElement.style.setProperty('--shadow-glow', `0 0 20px ${hexToRgba(customAccentHex, 0.1)}`);
      localStorage.setItem('atlas-pulse-color', 'custom');
      localStorage.setItem('atlas-pulse-custom-color', customAccentHex);
    } else {
      document.documentElement.setAttribute('data-color', appColor);
      document.documentElement.style.removeProperty('--accent');
      document.documentElement.style.removeProperty('--accent-hover');
      document.documentElement.style.removeProperty('--accent-muted');
      document.documentElement.style.removeProperty('--accent-border');
      document.documentElement.style.removeProperty('--shadow-glow');
      localStorage.setItem('atlas-pulse-color', appColor);
    }
  }, [theme, appFont, appColor, appTextColor, customAccentHex, customTextColorHex]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const handleChangeColor = useCallback((colorOrHex) => {
    if (colorOrHex.startsWith('#')) {
      setAppColor('custom');
      setCustomAccentHex(colorOrHex);
    } else {
      setAppColor(colorOrHex);
    }
  }, []);

  const handleChangeTextColor = useCallback((colorOrHex) => {
    if (colorOrHex.startsWith('#')) {
      setAppTextColor('custom');
      setCustomTextColorHex(colorOrHex);
    } else {
      setAppTextColor(colorOrHex);
    }
  }, []);

  const toggleSidebarMode = useCallback(() => {
    setSidebarMode(prev => {
      const next = prev === 'expanded' ? 'icon' : prev === 'icon' ? 'hidden' : 'expanded';
      localStorage.setItem('atlas-pulse-sidebar-mode', next);
      return next;
    });
  }, []);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleAddFeed = useCallback(async (feedUrl, folderId) => {
    try {
      await addFeed(feedUrl, folderId);
      showToast('Feed added successfully!');
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  }, [addFeed, showToast]);

  const handleRemoveFeed = useCallback(async (feedId) => {
    const feed = feeds.find(f => f.id === feedId);
    if (window.confirm(`Remove "${feed?.title || 'this feed'}"? All its articles will be deleted.`)) {
      await removeFeed(feedId);
      showToast('Feed removed');
      bumpArticles();
      if (activeView.type === 'feed' && activeView.id === feedId) setActiveView({ type: 'all' });
    }
  }, [feeds, removeFeed, showToast, bumpArticles, activeView]);

  const handleMoveFeed = useCallback(async (feedId, folderId) => {
    await updateFeedFolder(feedId, folderId);
    const folder = folders.find(f => f.id === folderId);
    showToast(`Moved to ${folder ? folder.name : 'Uncategorized'}`);
  }, [updateFeedFolder, folders, showToast]);

  const handleRefreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      const count = await refreshAllFeeds();
      showToast(`Refreshed! ${count} new article${count !== 1 ? 's' : ''} found.`);
    } catch {
      showToast('Failed to refresh some feeds', 'error');
    } finally {
      setRefreshing(false);
    }
  }, [refreshAllFeeds, showToast]);

  // Auto-refresh interval — re-runs whenever feeds load or the user changes the interval
  useEffect(() => {
    if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    if (feeds.length === 0 || autoRefreshMinutes === 0) return;
    refreshIntervalRef.current = setInterval(() => {
      refreshAllFeeds().catch(console.error);
    }, autoRefreshMinutes * 60 * 1000);
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [feeds.length, autoRefreshMinutes, refreshAllFeeds]);

  const handleSelectArticle = useCallback((article) => {
    setSelectedArticle(article);
  }, []);

  const handleNavigateArticle = useCallback((direction) => {
    if (!selectedArticle || visibleArticles.length === 0) return;
    const currentIndex = visibleArticles.findIndex(a => a.id === selectedArticle.id);
    if (currentIndex === -1) return;
    const newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < visibleArticles.length) {
      setSelectedArticle(visibleArticles[newIndex]);
    }
  }, [selectedArticle, visibleArticles]);

  const handleDeleteFolder = useCallback(async (folderId) => {
    await deleteFolder(folderId);
    showToast('Folder deleted — feeds moved to Uncategorized');
    if (activeView.type === 'folder' && activeView.id === folderId) setActiveView({ type: 'all' });
  }, [deleteFolder, showToast, activeView]);

  const handleDeleteFolderAndFeeds = useCallback(async (folderId) => {
    await deleteFolderAndFeeds(folderId);
    showToast('Folder and all its feeds deleted');
    bumpArticles();
    if (activeView.type === 'folder' && activeView.id === folderId) setActiveView({ type: 'all' });
  }, [deleteFolderAndFeeds, showToast, bumpArticles, activeView]);

  const handleOpenArticleFromLibrary = useCallback((article) => {
    setActiveView({ type: 'all' });
    setSelectedArticle(article);
  }, []);

  const handleTriggerBatch = useCallback(async () => {
    const count = await triggerBatch();
    if (count > 0) showToast(`Queued ${count} article${count !== 1 ? 's' : ''} for AI analysis`);
    else showToast('All recent articles are already analyzed', 'error');
  }, [triggerBatch, showToast]);

  const handleSidebarResize = useCallback((delta) => {
    setSidebarWidth(prev => {
      const next = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, prev + delta));
      localStorage.setItem('atlas-pulse-sidebar-width', next);
      return next;
    });
  }, []);

  const handleReaderResize = useCallback((delta) => {
    setReaderWidth(prev => {
      const next = Math.min(1200, Math.max(400, prev - delta));
      localStorage.setItem('atlas-pulse-reader-width', next);
      return next;
    });
  }, []);

  const existingFeedUrls = feeds.map(f => f.url);
  const currentArticleIndex = selectedArticle
    ? visibleArticles.findIndex(a => a.id === selectedArticle.id)
    : -1;
  const hasNext = currentArticleIndex >= 0 && currentArticleIndex < visibleArticles.length - 1;
  const hasPrev = currentArticleIndex > 0;

  const isLibraryView = activeView.type === 'library';
  const isHighlightsView = activeView.type === 'highlights';

  return (
    <div className="app-layout">
      <Sidebar
        mode={sidebarMode}
        activeView={activeView}
        onViewChange={(view) => { setActiveView(view); setSelectedArticle(null); }}
        onAddFeed={() => setShowAddFeed(true)}
        onSettings={() => setShowSettings(true)}
        folders={folders}
        feeds={feeds}
        onAddFolder={addFolder}
        onRenameFolder={renameFolder}
        onDeleteFolder={handleDeleteFolder}
        onDeleteFolderAndFeeds={handleDeleteFolderAndFeeds}
        onRemoveFeed={handleRemoveFeed}
        onMoveFeed={handleMoveFeed}
        onRefreshAll={handleRefreshAll}
        theme={theme}
        onToggleTheme={toggleTheme}
        refreshing={refreshing}
        onToggleMode={toggleSidebarMode}
        librarySummaryCount={librarySummaryCount}
        style={{ width: effectiveSidebarWidth, minWidth: effectiveSidebarWidth }}
        refreshKey={countsRefreshKey}
      />

      {sidebarMode === 'expanded' && <ResizableHandle onResize={handleSidebarResize} />}

      {isLibraryView ? (
        <LibraryView onOpenArticle={handleOpenArticleFromLibrary} />
      ) : isHighlightsView ? (
        <HighlightsLibrary onOpenArticle={handleOpenArticleFromLibrary} />
      ) : (
        <ArticleList
          activeView={activeView}
          selectedArticleId={selectedArticle?.id}
          onSelectArticle={handleSelectArticle}
          onArticlesLoaded={setVisibleArticles}
          sidebarHidden={sidebarMode === 'hidden'}
          onShowSidebar={toggleSidebarMode}
          batchProgress={batchProgress}
          batchQueuedCount={batchQueuedCount}
          onTriggerBatch={handleTriggerBatch}
          onOpenAIPanel={(articles, operation) => {
            setMultiPanel({ articles, operation });
            setSelectedArticle(null);
          }}
          refreshKey={articlesRefreshKey}
          onCountChanged={bumpCounts}
        />
      )}

      {!isLibraryView && !isHighlightsView && multiPanel ? (
        <MultiArticlePanel
          articles={multiPanel.articles}
          initialOperation={multiPanel.operation}
          onClose={() => setMultiPanel(null)}
          width={readerWidth}
          onResize={handleReaderResize}
        />
      ) : !isLibraryView && !isHighlightsView && selectedArticle ? (
        <ReaderErrorBoundary width={readerWidth} onClose={() => setSelectedArticle(null)}>
          <ArticleReader
            article={selectedArticle}
            isOpen={!!selectedArticle}
            isModalOpen={showSettings || showAddFeed}
            onClose={() => setSelectedArticle(null)}
            onNavigate={handleNavigateArticle}
            hasPrev={hasPrev}
            hasNext={hasNext}
            currentIndex={currentArticleIndex}
            totalCount={visibleArticles.length}
            width={readerWidth}
            onResize={handleReaderResize}
            onSummarySaved={handleSummarySaved}
            onArticleChanged={bumpCounts}
          />
        </ReaderErrorBoundary>
      ) : null}

      <AddFeedModal
        isOpen={showAddFeed}
        onClose={() => setShowAddFeed(false)}
        onAddFeed={handleAddFeed}
        existingFeedUrls={existingFeedUrls}
        folders={folders}
      />

      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        theme={theme}
        onToggleTheme={toggleTheme}
        appFont={appFont}
        onChangeFont={setAppFont}
        appColor={appColor}
        customAccentHex={customAccentHex}
        onChangeColor={handleChangeColor}
        appTextColor={appTextColor}
        customTextColorHex={customTextColorHex}
        onChangeTextColor={handleChangeTextColor}
        feeds={feeds}
        folders={folders}
        onImportOPML={importFeedsFromOPML}
        onRefreshAll={handleRefreshAll}
        onAutoRefreshChange={setAutoRefreshMinutes}
        availableModels={availableModels}
        onShowToast={showToast}
      />

      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>{toast.message}</div>
        </div>
      )}
    </div>
  );
}

export default App;
