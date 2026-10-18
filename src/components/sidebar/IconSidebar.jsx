import {
  HiOutlineArrowPath, HiOutlineBars3, HiOutlineCog6Tooth, HiOutlineFolderOpen, HiOutlineMoon,
  HiOutlineNewspaper, HiOutlinePlus, HiOutlineSun,
} from 'react-icons/hi2';
import FeedFavicon from '../FeedFavicon.jsx';
import { capBadge, folderUnread, isActive, NAV_ITEMS } from './sidebarModel.js';

function IconItem({ active, title, onClick, count, children }) {
  return (
    <div className={`sidebar-icon-item ${active ? 'active' : ''}`} onClick={onClick} title={title}>
      {children}
      {count > 0 && <span className="sidebar-icon-badge">{capBadge(count)}</span>}
    </div>
  );
}

function FeedIcon({ feed }) {
  return <FeedFavicon src={feed.favicon} style={{ width: 16, height: 16, borderRadius: 3 }} />;
}

/** Collapsed (icon-only) sidebar. */
export function IconSidebar({ style, activeView, onViewChange, counts, folders, grouped, actions }) {
  const showDivider = folders.length > 0 || grouped.uncategorized.length > 0;
  return (
    <aside className="sidebar sidebar-icon" style={style}>
      <div className="sidebar-header-icon">
        <button className="btn btn-ghost btn-icon sidebar-toggle-btn" onClick={actions.onToggleMode} title="Expand sidebar">
          <HiOutlineBars3 />
        </button>
      </div>
      <nav className="sidebar-icon-nav">
        <button className="sidebar-icon-add btn btn-ghost btn-icon" onClick={actions.onAddFeed} title="Add Content">
          <HiOutlinePlus />
        </button>
        <div className="sidebar-icon-divider" />
        {NAV_ITEMS.map(({ type, label, iconTitle, Icon, count }) => (
          <IconItem key={type} active={isActive(activeView, type)} title={iconTitle || label} onClick={() => onViewChange({ type })} count={count(counts)}>
            <Icon />
          </IconItem>
        ))}
        {showDivider && <div className="sidebar-icon-divider" />}
        {folders.map((folder) => (
          <IconItem
            key={folder.id}
            active={isActive(activeView, 'folder', folder.id)}
            title={folder.name}
            onClick={() => onViewChange({ type: 'folder', id: folder.id, name: folder.name })}
            count={folderUnread(grouped.byFolder[folder.id], counts.byFeed)}
          >
            <HiOutlineFolderOpen />
          </IconItem>
        ))}
        {grouped.uncategorized.map((feed) => (
          <IconItem
            key={feed.id}
            active={isActive(activeView, 'feed', feed.id)}
            title={feed.title}
            onClick={() => onViewChange({ type: 'feed', id: feed.id, name: feed.title })}
            count={counts.byFeed[feed.id]}
          >
            <FeedIcon feed={feed} />
          </IconItem>
        ))}
      </nav>
      <div className="sidebar-icon-footer">
        <button className="btn btn-ghost btn-icon" onClick={actions.onRefreshAll} disabled={actions.refreshing} title="Refresh all feeds">
          <HiOutlineArrowPath className={actions.refreshing ? 'spinning' : ''} />
        </button>
        <ThemeButton theme={actions.theme} onToggle={actions.onToggleTheme} />
        <button className="btn btn-ghost btn-icon" onClick={actions.onSettings} title="Settings"><HiOutlineCog6Tooth /></button>
      </div>
    </aside>
  );
}

export function ThemeButton({ theme, onToggle }) {
  const dark = theme === 'dark';
  return (
    <button className="btn btn-ghost btn-icon" onClick={onToggle} title={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
      {dark ? <HiOutlineSun /> : <HiOutlineMoon />}
    </button>
  );
}
