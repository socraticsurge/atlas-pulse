import {
  HiOutlineArrowPath, HiOutlineArrowRightCircle, HiOutlineCheck, HiOutlineExclamationTriangle, HiOutlineFolderOpen, HiOutlinePencil, HiOutlineTrash,
} from 'react-icons/hi2';
import { cn } from '@/lib/utils';

function Item({ onClick, danger, active, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('flex w-full cursor-pointer items-center gap-2 rounded border-0 bg-transparent px-2.5 py-1.5 text-left text-[12.5px] hover:bg-[var(--bg-hover)] [&_svg]:size-3.5', danger ? 'text-[var(--danger)]' : 'text-foreground')}
    >
      {children}
      {active && <HiOutlineCheck className="ml-auto text-primary" />}
    </button>
  );
}

const Divider = () => <div className="my-1 h-px bg-border" />;

function FolderMenu({ id, actions, done }) {
  return (
    <>
      <Item onClick={() => done(() => actions.startRename(id))}><HiOutlinePencil /> Rename</Item>
      <Divider />
      <Item danger onClick={() => done(() => actions.onDeleteFolder(id))}><HiOutlineTrash /> Delete folder (keep feeds)</Item>
      <Item danger onClick={() => done(() => actions.onDeleteFolderAndFeeds(id))}><HiOutlineTrash /> Delete folder and its feeds</Item>
    </>
  );
}

// Why the feed's last refresh failed, at the top of its menu.
function RefreshError({ feed }) {
  if (!feed?.lastError) return null;
  return (
    <div className="mb-1 flex max-w-72 gap-2 border-b border-border px-2.5 pt-1 pb-2 text-[11.5px] leading-snug text-muted-foreground">
      <HiOutlineExclamationTriangle className="mt-px size-3.5 shrink-0 text-primary" />
      <span><span className="text-foreground">Last refresh failed.</span> {feed.lastError}</span>
    </div>
  );
}

function FeedMenu({ id, feeds, folders, actions, done }) {
  const feed = feeds.find((f) => f.id === id);
  const currentFolder = feed?.folderId;
  return (
    <>
      <RefreshError feed={feed} />
      <Item onClick={() => done(() => actions.onRefreshFeed(id))}><HiOutlineArrowPath /> Refresh feed</Item>
      <Divider />
      <div className="flex items-center gap-2 px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-wider text-[var(--text-tertiary)]"><HiOutlineArrowRightCircle className="size-3.5" /> Move to</div>
      <Item active={!currentFolder} onClick={() => done(() => actions.onMoveFeed(id, null))}>No folder</Item>
      {folders.map((folder) => (
        <Item key={folder.id} active={currentFolder === folder.id} onClick={() => done(() => actions.onMoveFeed(id, folder.id))}>
          <HiOutlineFolderOpen /> {folder.name}
        </Item>
      ))}
      <Divider />
      <Item danger onClick={() => done(() => actions.onRemoveFeed(id))}><HiOutlineTrash /> Remove feed</Item>
    </>
  );
}

function CollectionMenu({ id, actions, done }) {
  return (
    <>
      <Item onClick={() => done(() => actions.startRename(id))}><HiOutlinePencil /> Rename</Item>
      <Divider />
      <Item danger onClick={() => done(() => actions.onDeleteCollection(id))}><HiOutlineTrash /> Delete collection (keep the saves)</Item>
    </>
  );
}

const MENUS = { folder: FolderMenu, feed: FeedMenu, collection: CollectionMenu };

/** Right-click / "…" menu for a folder, feed or collection. menu = { type, id, x, y }. */
export function ContextMenu({ menu, feeds, folders, actions, onClose }) {
  if (!menu) return null;
  const done = (fn) => { fn(); onClose(); };
  const Menu = MENUS[menu.type];
  return (
    <>
      <div className="fixed inset-0 z-[499]" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div role="menu" className="fixed z-[500] min-w-52 rounded-lg border border-border bg-[var(--bg-modal)] p-1 shadow-xl" style={{ left: menu.x, top: menu.y }}>
        <Menu id={menu.id} feeds={feeds} folders={folders} actions={actions} done={done} />
      </div>
    </>
  );
}
