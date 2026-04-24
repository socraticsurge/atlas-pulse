import { useState, useCallback, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar.jsx';
import ArticleList from './components/ArticleList.jsx';
import ArticleReader from './components/ArticleReader.jsx';
import AddFeedModal from './components/AddFeedModal.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import { useFeeds } from './hooks/useFeeds.js';
import { useFolders } from './hooks/useFolders.js';
import { DEFAULT_REFRESH_INTERVAL } from './utils/constants.js';

function App() {
  const [activeView, setActiveView] = useState({ type: 'all' });
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [showAddFeed, setShowAddFeed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('feedflow-theme') || 'dark');

  const { feeds, addFeed, removeFeed, updateFeedFolder, refreshFeed, refreshAllFeeds } = useFeeds();
  const { folders, addFolder, renameFolder, deleteFolder } = useFolders();

  const refreshIntervalRef = useRef(null);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('feedflow-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  // Show toast notification
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Handle adding a feed
  const handleAddFeed = useCallback(async (feedUrl, folderId) => {
    try {
      await addFeed(feedUrl, folderId);
      showToast('Feed added successfully!');
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  }, [addFeed, showToast]);

  // Handle removing a feed
  const handleRemoveFeed = useCallback(async (feedId) => {
    const feed = feeds.find(f => f.id === feedId);
    if (window.confirm(`Remove "${feed?.title || 'this feed'}"? All its articles will be deleted.`)) {
      await removeFeed(feedId);
      showToast('Feed removed');
      if (activeView.type === 'feed' && activeView.id === feedId) {
        setActiveView({ type: 'all' });
      }
    }
  }, [feeds, removeFeed, showToast, activeView]);

  // Handle moving a feed to a different folder
  const handleMoveFeed = useCallback(async (feedId, folderId) => {
    await updateFeedFolder(feedId, folderId);
    const folder = folders.find(f => f.id === folderId);
    showToast(`Moved to ${folder ? folder.name : 'Uncategorized'}`);
  }, [updateFeedFolder, folders, showToast]);

  // Handle refresh all
  const handleRefreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      const count = await refreshAllFeeds();
      showToast(`Refreshed! ${count} new article${count !== 1 ? 's' : ''} found.`);
    } catch (err) {
      showToast('Failed to refresh some feeds', 'error');
    } finally {
      setRefreshing(false);
    }
  }, [refreshAllFeeds, showToast]);

  // Auto-refresh
  useEffect(() => {
    if (feeds.length === 0) return;

    refreshIntervalRef.current = setInterval(() => {
      refreshAllFeeds().catch(console.error);
    }, DEFAULT_REFRESH_INTERVAL);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [feeds.length, refreshAllFeeds]);

  // Select article
  const handleSelectArticle = useCallback((article) => {
    setSelectedArticle(article);
  }, []);

  // Handle folder delete
  const handleDeleteFolder = useCallback(async (folderId) => {
    const folder = folders.find(f => f.id === folderId);
    if (window.confirm(`Delete folder "${folder?.name}"? Feeds will be moved to uncategorized.`)) {
      await deleteFolder(folderId);
      showToast('Folder deleted');
      if (activeView.type === 'folder' && activeView.id === folderId) {
        setActiveView({ type: 'all' });
      }
    }
  }, [folders, deleteFolder, showToast, activeView]);

  const existingFeedUrls = feeds.map(f => f.url);

  return (
    <div className="app-layout">
      <Sidebar
        activeView={activeView}
        onViewChange={(view) => {
          setActiveView(view);
          setSelectedArticle(null);
        }}
        onAddFeed={() => setShowAddFeed(true)}
        onSettings={() => setShowSettings(true)}
        folders={folders}
        feeds={feeds}
        onAddFolder={addFolder}
        onRenameFolder={renameFolder}
        onDeleteFolder={handleDeleteFolder}
        onRemoveFeed={handleRemoveFeed}
        onMoveFeed={handleMoveFeed}
        onRefreshAll={handleRefreshAll}
        theme={theme}
        onToggleTheme={toggleTheme}
        refreshing={refreshing}
      />

      <ArticleList
        activeView={activeView}
        selectedArticleId={selectedArticle?.id}
        onSelectArticle={handleSelectArticle}
      />

      <ArticleReader
        article={selectedArticle}
      />

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
      />

      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
