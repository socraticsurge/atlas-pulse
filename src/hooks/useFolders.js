import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../db/database.js';

/**
 * Hook for folder CRUD operations.
 */
export function useFolders() {
  const folders = useLiveQuery(() => db.folders.orderBy('order').toArray()) || [];

  const addFolder = useCallback(async (name) => {
    const maxOrder = folders.length > 0 ? Math.max(...folders.map((f) => f.order || 0)) : 0;
    return db.folders.add({
      name,
      order: maxOrder + 1,
      createdAt: new Date().toISOString(),
    });
  }, [folders]);

  const renameFolder = useCallback(async (folderId, newName) => {
    await db.folders.update(folderId, { name: newName });
  }, []);

  const deleteFolder = useCallback(async (folderId) => {
    await db.transaction('rw', db.folders, db.feeds, async () => {
      await db.feeds.where('folderId').equals(folderId).modify({ folderId: null });
      await db.folders.delete(folderId);
    });
  }, []);

  const deleteFolderAndFeeds = useCallback(async (folderId) => {
    await db.transaction('rw', db.folders, db.feeds, db.articles, async () => {
      const folderFeeds = await db.feeds.where('folderId').equals(folderId).toArray();
      for (const feed of folderFeeds) {
        await db.articles.where('feedId').equals(feed.id).delete();
      }
      await db.feeds.where('folderId').equals(folderId).delete();
      await db.folders.delete(folderId);
    });
  }, []);

  return {
    folders,
    addFolder,
    renameFolder,
    deleteFolder,
    deleteFolderAndFeeds,
  };
}
