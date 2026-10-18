import { useState } from 'react';
import { HiChevronRight, HiOutlineEllipsisHorizontal, HiOutlineFolderOpen, HiOutlineNewspaper } from 'react-icons/hi2';
import FeedFavicon from '../FeedFavicon.jsx';
import { folderUnread, isActive } from './sidebarModel.js';

// Opens the context menu at the pointer (right-click or the "…" button).
const menuOpener = (openMenu, type, id) => (e) => {
  e.preventDefault();
  e.stopPropagation();
  openMenu({ type, id, x: e.clientX, y: e.clientY });
};

function FeedRow({ feed, unread, active, onViewChange, openMenu }) {
  const open = menuOpener(openMenu, 'feed', feed.id);
  return (
    <div
      className={`nav-item nav-item-feed ${active ? 'active' : ''}`}
      onClick={() => onViewChange({ type: 'feed', id: feed.id, name: feed.title })}
      onContextMenu={open}
    >
      <FeedFavicon src={feed.favicon} imgClass="feed-favicon" iconClass="nav-icon" />
      <span className="nav-label">{feed.title}</span>
      {unread > 0 && <span className="badge">{unread}</span>}
      <button className="nav-item-menu-btn" title="Feed options" onClick={open}><HiOutlineEllipsisHorizontal /></button>
    </div>
  );
}

function RenameInput({ initial, onSubmit, onCancel }) {
  const [value, setValue] = useState(initial);
  const submit = () => { if (value.trim()) onSubmit(value.trim()); };
  return (
    <input
      className="input"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onCancel(); }}
      onClick={(e) => e.stopPropagation()}
      autoFocus
      style={{ padding: '2px 6px', fontSize: '12px' }}
    />
  );
}

function FolderRow({ folder, feeds, counts, open, renaming, tree }) {
  const openMenu = menuOpener(tree.openMenu, 'folder', folder.id);
  const unread = folderUnread(feeds, counts.byFeed);
  return (
    <div>
      <div
        className={`nav-item ${isActive(tree.activeView, 'folder', folder.id) ? 'active' : ''}`}
        onClick={() => tree.onViewChange({ type: 'folder', id: folder.id, name: folder.name })}
        onContextMenu={openMenu}
      >
        <span className={`folder-toggle ${open ? 'open' : ''}`} onClick={(e) => { e.stopPropagation(); tree.toggleFolder(folder.id); }}>
          <HiChevronRight style={{ fontSize: 12 }} />
        </span>
        {renaming ? (
          <RenameInput initial={folder.name} onSubmit={(name) => tree.finishRename(folder.id, name)} onCancel={tree.cancelRename} />
        ) : (
          <>
            <span className="nav-icon"><HiOutlineFolderOpen /></span>
            <span className="nav-label">{folder.name}</span>
            {unread > 0 && <span className="badge">{unread}</span>}
            <button className="nav-item-menu-btn" title="Folder options" onClick={openMenu}><HiOutlineEllipsisHorizontal /></button>
          </>
        )}
      </div>
      {open && feeds.map((feed) => (
        <FeedRow
          key={feed.id}
          feed={feed}
          unread={counts.byFeed[feed.id]}
          active={isActive(tree.activeView, 'feed', feed.id)}
          onViewChange={tree.onViewChange}
          openMenu={tree.openMenu}
        />
      ))}
    </div>
  );
}

/** Folders (collapsible, with their feeds) followed by uncategorized feeds. */
export function FolderTree({ folders, grouped, counts, tree }) {
  return (
    <>
      {folders.map((folder) => (
        <FolderRow
          key={folder.id}
          folder={folder}
          feeds={grouped.byFolder[folder.id] || []}
          counts={counts}
          open={tree.openFolders.has(folder.id)}
          renaming={tree.renamingId === folder.id}
          tree={tree}
        />
      ))}
      {grouped.uncategorized.map((feed) => (
        <FeedRow
          key={feed.id}
          feed={feed}
          unread={counts.byFeed[feed.id]}
          active={isActive(tree.activeView, 'feed', feed.id)}
          onViewChange={tree.onViewChange}
          openMenu={tree.openMenu}
        />
      ))}
    </>
  );
}
