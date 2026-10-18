import { useState } from 'react';
import { HiChevronRight, HiOutlineFolderOpen } from 'react-icons/hi2';
import { cn } from '@/lib/utils';
import FeedFavicon from '../FeedFavicon.jsx';
import { InlineInput, NavRow } from './NavRow.jsx';
import { folderUnread, isActive } from './sidebarModel.js';

// Opens the context menu at the pointer (right-click or the "…" button).
const menuOpener = (openMenu, type, id) => (e) => {
  e.preventDefault();
  e.stopPropagation();
  openMenu({ type, id, x: e.clientX, y: e.clientY });
};

const feedIcon = (feed) => <FeedFavicon src={feed.favicon} imgClass="size-4 rounded-sm object-contain" iconClass="flex size-4 [&_svg]:size-4" />;

function FeedRow({ feed, unread, active, onViewChange, openMenu, nested }) {
  return (
    <NavRow
      active={active}
      onClick={() => onViewChange({ type: 'feed', id: feed.id, name: feed.title })}
      onMenu={menuOpener(openMenu, 'feed', feed.id)}
      menuTitle="Feed options"
      icon={feedIcon(feed)}
      label={feed.title}
      count={unread}
      className={cn(nested && 'pl-8 text-[12.5px]')}
    />
  );
}

function RenameInput({ initial, onSubmit, onCancel }) {
  const [value, setValue] = useState(initial);
  const submit = () => { if (value.trim()) onSubmit(value.trim()); };
  return (
    <InlineInput
      value={value}
      aria-label="Folder name"
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onCancel(); }}
      onClick={(e) => e.stopPropagation()}
      autoFocus
    />
  );
}

function FolderRow({ folder, feeds, counts, open, renaming, tree }) {
  const toggle = (
    <span
      role="button"
      aria-label={open ? 'Collapse folder' : 'Expand folder'}
      onClick={(e) => { e.stopPropagation(); tree.toggleFolder(folder.id); }}
      className={cn('absolute left-0 flex size-5 items-center justify-center text-[var(--text-tertiary)] transition-transform', open && 'rotate-90')}
    >
      <HiChevronRight className="size-3" />
    </span>
  );
  return (
    <div>
      {renaming ? (
        <div className="flex h-8 items-center gap-2 pl-6"><RenameInput initial={folder.name} onSubmit={(name) => tree.finishRename(folder.id, name)} onCancel={tree.cancelRename} /></div>
      ) : (
        <NavRow
          active={isActive(tree.activeView, 'folder', folder.id)}
          onClick={() => tree.onViewChange({ type: 'folder', id: folder.id, name: folder.name })}
          onMenu={menuOpener(tree.openMenu, 'folder', folder.id)}
          menuTitle="Folder options"
          icon={<HiOutlineFolderOpen />}
          label={folder.name}
          count={folderUnread(feeds, counts.byFeed)}
          className="pl-5"
        >
          {toggle}
        </NavRow>
      )}
      {open && feeds.map((feed) => (
        <FeedRow key={feed.id} feed={feed} unread={counts.byFeed[feed.id]} active={isActive(tree.activeView, 'feed', feed.id)} onViewChange={tree.onViewChange} openMenu={tree.openMenu} nested />
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
        <FeedRow key={feed.id} feed={feed} unread={counts.byFeed[feed.id]} active={isActive(tree.activeView, 'feed', feed.id)} onViewChange={tree.onViewChange} openMenu={tree.openMenu} />
      ))}
    </>
  );
}
