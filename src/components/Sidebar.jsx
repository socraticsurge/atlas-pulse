import { useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  HiOutlineNewspaper,
  HiOutlineCalendar,
  HiOutlineBookmark,
  HiOutlineFolderOpen,
  HiOutlinePlus,
  HiOutlineCog6Tooth,
  HiChevronRight,
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlineArrowPath,
  HiOutlineTrash,
  HiOutlinePencil,
  HiOutlineFolderPlus,
  HiOutlineArrowRightCircle,
  HiOutlineBars3,
} from 'react-icons/hi2';
import db from '../db/database.js';

export default function Sidebar({
  mode = 'expanded',
  activeView,
  onViewChange,
  onAddFeed,
  onSettings,
  folders,
  feeds,
  onAddFolder,
  onRenameFolder,
  onDeleteFolder,
  onRemoveFeed,
  onMoveFeed,
  onRefreshAll,
  theme,
  onToggleTheme,
  refreshing,
  onToggleMode,
  style,
}) {
  const isIcon = mode === 'icon' || mode === 'hidden';

  const [openFolders, setOpenFolders] = useState(new Set());
  const [newFolderName, setNewFolderName] = useState('');
  const [addingFolder, setAddingFolder] = useState(false);
  const [renamingFolderId, setRenamingFolderId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [contextMenu, setContextMenu] = useState(null);

  const unreadCounts = useLiveQuery(async () => {
    const articles = await db.articles.toArray();
    const counts = {};
    let total = 0;
    for (const a of articles) {
      if (!a.isRead) {
        counts[a.feedId] = (counts[a.feedId] || 0) + 1;
        total++;
      }
    }
    return { byFeed: counts, total };
  }) || { byFeed: {}, total: 0 };

  const savedCount = useLiveQuery(
    () => db.articles.where('isBookmarked').equals(1).count()
  ) || 0;

  const todayCount = useLiveQuery(async () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const all = await db.articles.toArray();
    return all.filter(a => new Date(a.publishedAt) >= start).length;
  }) || 0;

  const toggleFolder = useCallback((folderId) => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }, []);

  const handleAddFolder = useCallback(() => {
    if (newFolderName.trim()) {
      onAddFolder(newFolderName.trim());
      setNewFolderName('');
      setAddingFolder(false);
    }
  }, [newFolderName, onAddFolder]);

  const handleRenameFolder = useCallback(() => {
    if (renameValue.trim() && renamingFolderId) {
      onRenameFolder(renamingFolderId, renameValue.trim());
      setRenamingFolderId(null);
      setRenameValue('');
    }
  }, [renameValue, renamingFolderId, onRenameFolder]);

  const uncategorizedFeeds = feeds.filter((f) => !f.folderId);

  const getFolderUnread = (folderId) => {
    const folderFeeds = feeds.filter(f => f.folderId === folderId);
    return folderFeeds.reduce((sum, f) => sum + (unreadCounts.byFeed[f.id] || 0), 0);
  };

  const capBadge = (n) => (n > 99 ? '99+' : n);

  // ── Icon / hidden mode ──────────────────────────────────────────────────────
  if (isIcon) {
    return (
      <aside className="sidebar sidebar-icon" style={style}>
        <div className="sidebar-header-icon">
          <button
            className="btn btn-ghost btn-icon sidebar-toggle-btn"
            onClick={onToggleMode}
            title="Expand sidebar"
          >
            <HiOutlineBars3 />
          </button>
        </div>

        <nav className="sidebar-icon-nav">
          <button
            className="sidebar-icon-add btn btn-ghost btn-icon"
            onClick={onAddFeed}
            title="Add Content"
          >
            <HiOutlinePlus />
          </button>

          <div className="sidebar-icon-divider" />

          <div
            className={`sidebar-icon-item ${activeView.type === 'all' ? 'active' : ''}`}
            onClick={() => onViewChange({ type: 'all' })}
            title="All Articles"
          >
            <HiOutlineNewspaper />
            {unreadCounts.total > 0 && (
              <span className="sidebar-icon-badge">{capBadge(unreadCounts.total)}</span>
            )}
          </div>
          <div
            className={`sidebar-icon-item ${activeView.type === 'today' ? 'active' : ''}`}
            onClick={() => onViewChange({ type: 'today' })}
            title="Today"
          >
            <HiOutlineCalendar />
            {todayCount > 0 && (
              <span className="sidebar-icon-badge">{capBadge(todayCount)}</span>
            )}
          </div>
          <div
            className={`sidebar-icon-item ${activeView.type === 'saved' ? 'active' : ''}`}
            onClick={() => onViewChange({ type: 'saved' })}
            title="Saved"
          >
            <HiOutlineBookmark />
            {savedCount > 0 && (
              <span className="sidebar-icon-badge">{capBadge(savedCount)}</span>
            )}
          </div>

          {(folders.length > 0 || uncategorizedFeeds.length > 0) && (
            <div className="sidebar-icon-divider" />
          )}

          {folders.map((folder) => {
            const folderUnread = getFolderUnread(folder.id);
            return (
              <div
                key={folder.id}
                className={`sidebar-icon-item ${activeView.type === 'folder' && activeView.id === folder.id ? 'active' : ''}`}
                onClick={() => onViewChange({ type: 'folder', id: folder.id, name: folder.name })}
                title={folder.name}
              >
                <HiOutlineFolderOpen />
                {folderUnread > 0 && (
                  <span className="sidebar-icon-badge">{capBadge(folderUnread)}</span>
                )}
              </div>
            );
          })}

          {uncategorizedFeeds.map((feed) => (
            <div
              key={feed.id}
              className={`sidebar-icon-item ${activeView.type === 'feed' && activeView.id === feed.id ? 'active' : ''}`}
              onClick={() => onViewChange({ type: 'feed', id: feed.id, name: feed.title })}
              title={feed.title}
            >
              {feed.favicon ? (
                <img src={feed.favicon} alt="" style={{ width: 16, height: 16, borderRadius: 3 }} />
              ) : (
                <HiOutlineNewspaper />
              )}
              {unreadCounts.byFeed[feed.id] > 0 && (
                <span className="sidebar-icon-badge">{capBadge(unreadCounts.byFeed[feed.id])}</span>
              )}
            </div>
          ))}
        </nav>

        <div className="sidebar-icon-footer">
          <button
            className="btn btn-ghost btn-icon"
            onClick={onRefreshAll}
            disabled={refreshing}
            title="Refresh all feeds"
          >
            <HiOutlineArrowPath className={refreshing ? 'spinning' : ''} />
          </button>
          <button
            className="btn btn-ghost btn-icon"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <HiOutlineSun /> : <HiOutlineMoon />}
          </button>
          <button
            className="btn btn-ghost btn-icon"
            onClick={onSettings}
            title="Settings"
          >
            <HiOutlineCog6Tooth />
          </button>
        </div>
      </aside>
    );
  }

  // ── Expanded mode ───────────────────────────────────────────────────────────
  return (
    <aside className="sidebar" style={style}>
      <div className="sidebar-header">
        <button
          className="btn btn-ghost btn-icon sidebar-toggle-btn"
          onClick={onToggleMode}
          title="Collapse sidebar"
        >
          <HiOutlineBars3 />
        </button>
        <div className="sidebar-logo">
          <img src="/atlas-pulse-icon.png" alt="Atlas Pulse" className="sidebar-logo-img" />
          <h1>Atlas Pulse</h1>
        </div>
        <div className="sidebar-header-actions">
          <button
            className="btn btn-ghost btn-icon"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <HiOutlineSun /> : <HiOutlineMoon />}
          </button>
          <button
            className="btn btn-ghost btn-icon"
            onClick={onSettings}
            title="Settings"
          >
            <HiOutlineCog6Tooth />
          </button>
        </div>
      </div>

      <div className="sidebar-add-wrapper">
        <button className="btn btn-primary sidebar-add-btn" onClick={onAddFeed}>
          <HiOutlinePlus /> Add Feed
        </button>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section">
          <div
            className={`nav-item ${activeView.type === 'all' ? 'active' : ''}`}
            onClick={() => onViewChange({ type: 'all' })}
          >
            <span className="nav-icon"><HiOutlineNewspaper /></span>
            <span className="nav-label">All Articles</span>
            {unreadCounts.total > 0 && <span className="badge">{unreadCounts.total}</span>}
          </div>
          <div
            className={`nav-item ${activeView.type === 'today' ? 'active' : ''}`}
            onClick={() => onViewChange({ type: 'today' })}
          >
            <span className="nav-icon"><HiOutlineCalendar /></span>
            <span className="nav-label">Today</span>
            {todayCount > 0 && <span className="badge">{todayCount}</span>}
          </div>
          <div
            className={`nav-item ${activeView.type === 'saved' ? 'active' : ''}`}
            onClick={() => onViewChange({ type: 'saved' })}
          >
            <span className="nav-icon"><HiOutlineBookmark /></span>
            <span className="nav-label">Saved</span>
            {savedCount > 0 && <span className="badge">{savedCount}</span>}
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-header">
            <span className="sidebar-section-title">Folders</span>
            <button
              className="btn btn-ghost btn-icon btn-sm"
              onClick={() => setAddingFolder(true)}
              title="New folder"
            >
              <HiOutlineFolderPlus style={{ fontSize: 14 }} />
            </button>
          </div>

          {addingFolder && (
            <div className="inline-input-wrapper">
              <input
                className="input"
                placeholder="Folder name..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddFolder();
                  if (e.key === 'Escape') setAddingFolder(false);
                }}
                autoFocus
              />
              <button className="btn btn-primary btn-sm" onClick={handleAddFolder}>Add</button>
            </div>
          )}

          {folders.map((folder) => {
            const folderFeeds = feeds.filter((f) => f.folderId === folder.id);
            const isOpen = openFolders.has(folder.id);
            const folderUnread = getFolderUnread(folder.id);
            return (
              <div key={folder.id}>
                <div
                  className={`nav-item ${activeView.type === 'folder' && activeView.id === folder.id ? 'active' : ''}`}
                  onClick={() => onViewChange({ type: 'folder', id: folder.id, name: folder.name })}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ type: 'folder', id: folder.id, x: e.clientX, y: e.clientY });
                  }}
                >
                  <span
                    className={`folder-toggle ${isOpen ? 'open' : ''}`}
                    onClick={(e) => { e.stopPropagation(); toggleFolder(folder.id); }}
                  >
                    <HiChevronRight style={{ fontSize: 12 }} />
                  </span>
                  {renamingFolderId === folder.id ? (
                    <input
                      className="input"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameFolder();
                        if (e.key === 'Escape') setRenamingFolderId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      style={{ padding: '2px 6px', fontSize: '12px' }}
                    />
                  ) : (
                    <>
                      <span className="nav-icon"><HiOutlineFolderOpen /></span>
                      <span className="nav-label">{folder.name}</span>
                      {folderUnread > 0 && <span className="badge">{folderUnread}</span>}
                    </>
                  )}
                </div>

                {isOpen && folderFeeds.map((feed) => (
                  <div
                    key={feed.id}
                    className={`nav-item nav-item-feed ${activeView.type === 'feed' && activeView.id === feed.id ? 'active' : ''}`}
                    onClick={() => onViewChange({ type: 'feed', id: feed.id, name: feed.title })}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ type: 'feed', id: feed.id, x: e.clientX, y: e.clientY });
                    }}
                  >
                    {feed.favicon ? (
                      <img className="feed-favicon" src={feed.favicon} alt="" />
                    ) : (
                      <span className="nav-icon"><HiOutlineNewspaper /></span>
                    )}
                    <span className="nav-label">{feed.title}</span>
                    {unreadCounts.byFeed[feed.id] > 0 && (
                      <span className="badge">{unreadCounts.byFeed[feed.id]}</span>
                    )}
                  </div>
                ))}
              </div>
            );
          })}

          {uncategorizedFeeds.map((feed) => (
            <div
              key={feed.id}
              className={`nav-item nav-item-feed ${activeView.type === 'feed' && activeView.id === feed.id ? 'active' : ''}`}
              onClick={() => onViewChange({ type: 'feed', id: feed.id, name: feed.title })}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ type: 'feed', id: feed.id, x: e.clientX, y: e.clientY });
              }}
            >
              {feed.favicon ? (
                <img className="feed-favicon" src={feed.favicon} alt="" />
              ) : (
                <span className="nav-icon"><HiOutlineNewspaper /></span>
              )}
              <span className="nav-label">{feed.title}</span>
              {unreadCounts.byFeed[feed.id] > 0 && (
                <span className="badge">{unreadCounts.byFeed[feed.id]}</span>
              )}
            </div>
          ))}
        </div>
      </nav>

      <div className="sidebar-footer">
        <button
          className="btn btn-ghost btn-icon"
          onClick={onRefreshAll}
          disabled={refreshing}
          title="Refresh all feeds"
        >
          <HiOutlineArrowPath className={refreshing ? 'spinning' : ''} />
        </button>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 499 }}
            onClick={() => setContextMenu(null)}
          />
          <div
            className="context-menu"
            style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y }}
          >
            {contextMenu.type === 'folder' && (
              <>
                <button
                  className="context-menu-item"
                  onClick={() => {
                    const folder = folders.find(f => f.id === contextMenu.id);
                    setRenamingFolderId(contextMenu.id);
                    setRenameValue(folder?.name || '');
                    setContextMenu(null);
                  }}
                >
                  <HiOutlinePencil /> Rename Folder
                </button>
                <div className="context-menu-divider" />
                <button
                  className="context-menu-item danger"
                  onClick={() => { onDeleteFolder(contextMenu.id); setContextMenu(null); }}
                >
                  <HiOutlineTrash /> Delete Folder
                </button>
              </>
            )}
            {contextMenu.type === 'feed' && (
              <>
                <div className="context-menu-label">
                  <HiOutlineArrowRightCircle /> Move to folder
                </div>
                <button
                  className={`context-menu-item ${!feeds.find(f => f.id === contextMenu.id)?.folderId ? 'active' : ''}`}
                  onClick={() => { onMoveFeed(contextMenu.id, null); setContextMenu(null); }}
                >
                  Uncategorized
                </button>
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    className={`context-menu-item ${feeds.find(f => f.id === contextMenu.id)?.folderId === folder.id ? 'active' : ''}`}
                    onClick={() => { onMoveFeed(contextMenu.id, folder.id); setContextMenu(null); }}
                  >
                    <HiOutlineFolderOpen style={{ fontSize: 13 }} /> {folder.name}
                  </button>
                ))}
                <div className="context-menu-divider" />
                <button
                  className="context-menu-item danger"
                  onClick={() => { onRemoveFeed(contextMenu.id); setContextMenu(null); }}
                >
                  <HiOutlineTrash /> Remove Feed
                </button>
              </>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
