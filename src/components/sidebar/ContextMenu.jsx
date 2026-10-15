import { HiOutlineArrowRightCircle, HiOutlineFolderOpen, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi2';

function FolderMenu({ id, actions, done }) {
  return (
    <>
      <button className="context-menu-item" onClick={() => done(() => actions.startRename(id))}>
        <HiOutlinePencil /> Rename
      </button>
      <div className="context-menu-divider" />
      <button className="context-menu-item danger" onClick={() => done(() => actions.onDeleteFolder(id))}>
        <HiOutlineTrash /> Delete folder (keep feeds)
      </button>
      <button className="context-menu-item danger" onClick={() => done(() => actions.onDeleteFolderAndFeeds(id))}>
        <HiOutlineTrash /> Delete folder + all feeds
      </button>
    </>
  );
}

function FeedMenu({ id, feeds, folders, actions, done }) {
  const currentFolder = feeds.find((f) => f.id === id)?.folderId;
  return (
    <>
      <div className="context-menu-label"><HiOutlineArrowRightCircle /> Move to folder</div>
      <button className={`context-menu-item ${!currentFolder ? 'active' : ''}`} onClick={() => done(() => actions.onMoveFeed(id, null))}>
        Uncategorized
      </button>
      {folders.map((folder) => (
        <button key={folder.id} className={`context-menu-item ${currentFolder === folder.id ? 'active' : ''}`} onClick={() => done(() => actions.onMoveFeed(id, folder.id))}>
          <HiOutlineFolderOpen style={{ fontSize: 13 }} /> {folder.name}
        </button>
      ))}
      <div className="context-menu-divider" />
      <button className="context-menu-item danger" onClick={() => done(() => actions.onRemoveFeed(id))}>
        <HiOutlineTrash /> Remove Feed
      </button>
    </>
  );
}

/** Right-click / "…" menu for a folder or feed. menu = { type, id, x, y }. */
export function ContextMenu({ menu, feeds, folders, actions, onClose }) {
  if (!menu) return null;
  const done = (fn) => { fn(); onClose(); };
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 499 }} onClick={onClose} />
      <div className="context-menu" style={{ position: 'fixed', left: menu.x, top: menu.y }}>
        {menu.type === 'folder'
          ? <FolderMenu id={menu.id} actions={actions} done={done} />
          : <FeedMenu id={menu.id} feeds={feeds} folders={folders} actions={actions} done={done} />}
      </div>
    </>
  );
}
