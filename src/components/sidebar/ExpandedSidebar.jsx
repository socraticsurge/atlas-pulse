import { useState } from 'react';
import {
  HiOutlineArrowPath, HiOutlineBars3, HiOutlineCog6Tooth, HiOutlineFolderPlus, HiOutlineMagnifyingGlass, HiOutlinePlus,
} from 'react-icons/hi2';
import { emit } from '../../lib/appEvents.js';
import { ContextMenu } from './ContextMenu.jsx';
import { FolderTree } from './FolderTree.jsx';
import { ThemeButton } from './IconSidebar.jsx';
import { isActive, NAV_ITEMS } from './sidebarModel.js';

function NewFolderInput({ onAdd, onCancel }) {
  const [name, setName] = useState('');
  const submit = () => { if (name.trim()) onAdd(name.trim()); };
  return (
    <div className="inline-input-wrapper">
      <input
        className="input"
        placeholder="Folder name..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onCancel(); }}
        autoFocus
      />
      <button className="btn btn-primary btn-sm" onClick={submit}>Add</button>
    </div>
  );
}

function MainNav({ activeView, onViewChange, counts }) {
  return (
    <div className="sidebar-section">
      {NAV_ITEMS.map(({ type, label, Icon, count }) => {
        const n = count(counts);
        return (
          <div key={type} className={`nav-item ${isActive(activeView, type) ? 'active' : ''}`} onClick={() => onViewChange({ type })}>
            <span className="nav-icon"><Icon /></span>
            <span className="nav-label">{label}</span>
            {n > 0 && <span className="badge">{n}</span>}
          </div>
        );
      })}
    </div>
  );
}

function SidebarHeader({ actions }) {
  return (
    <div className="sidebar-header">
      <button className="btn btn-ghost btn-icon sidebar-toggle-btn" onClick={actions.onToggleMode} title="Collapse sidebar">
        <HiOutlineBars3 />
      </button>
      <div className="sidebar-logo">
        <img src="/atlas-pulse-icon.svg" alt="Atlas Pulse" className="sidebar-logo-img" />
        <h1>Atlas Pulse</h1>
      </div>
      <div className="sidebar-header-actions">
        <ThemeButton theme={actions.theme} onToggle={actions.onToggleTheme} />
        <button className="btn btn-ghost btn-icon" onClick={actions.onSettings} title="Settings"><HiOutlineCog6Tooth /></button>
      </div>
    </div>
  );
}

// Folder UI state: open folders, inline rename, context menu.
function useFolderTreeState(actions) {
  const [openFolders, setOpenFolders] = useState(() => new Set());
  const [renamingId, setRenamingId] = useState(null);
  const [menu, setMenu] = useState(null);
  return {
    openFolders, renamingId, menu,
    openMenu: setMenu,
    closeMenu: () => setMenu(null),
    toggleFolder: (id) => setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    }),
    startRename: setRenamingId,
    cancelRename: () => setRenamingId(null),
    finishRename: (id, name) => { actions.onRenameFolder(id, name); setRenamingId(null); },
  };
}

/** Full sidebar: header, the ⌘K bar and Add Feed, navigation, folders and feeds, refresh. */
export function ExpandedSidebar({ style, activeView, onViewChange, counts, folders, feeds, grouped, actions }) {
  const [addingFolder, setAddingFolder] = useState(false);
  const tree = { ...useFolderTreeState(actions), activeView, onViewChange };
  const addFolder = (name) => { actions.onAddFolder(name); setAddingFolder(false); };

  return (
    <aside className="sidebar" style={style}>
      <SidebarHeader actions={actions} />
      <div className="sidebar-add-wrapper">
        <button className="sidebar-command-btn" onClick={() => emit('open-palette')} title="Search, jump to a feed, run a command (⌘K)">
          <HiOutlineMagnifyingGlass />
          <span className="sidebar-command-label">Search or jump to…</span>
          <kbd>⌘K</kbd>
        </button>
        <button className="btn btn-ghost btn-icon sidebar-add-btn" onClick={actions.onAddFeed} title="Add feed"><HiOutlinePlus /></button>
      </div>
      <nav className="sidebar-nav">
        <MainNav activeView={activeView} onViewChange={onViewChange} counts={counts} />
        <div className="sidebar-section">
          <div className="sidebar-section-header">
            <span className="sidebar-section-title">Folders</span>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setAddingFolder(true)} title="New folder">
              <HiOutlineFolderPlus style={{ fontSize: 14 }} />
            </button>
          </div>
          {addingFolder && <NewFolderInput onAdd={addFolder} onCancel={() => setAddingFolder(false)} />}
          <FolderTree folders={folders} grouped={grouped} counts={counts} tree={tree} />
        </div>
      </nav>
      <div className="sidebar-footer">
        <button className="btn btn-ghost btn-icon" onClick={actions.onRefreshAll} disabled={actions.refreshing} title="Refresh all feeds">
          <HiOutlineArrowPath className={actions.refreshing ? 'spinning' : ''} />
        </button>
      </div>
      <ContextMenu
        menu={tree.menu}
        feeds={feeds}
        folders={folders}
        actions={{ ...actions, startRename: tree.startRename }}
        onClose={tree.closeMenu}
      />
    </aside>
  );
}
