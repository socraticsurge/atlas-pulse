import { useState, useEffect, useCallback } from 'react';
import * as api from '../utils/api.js';

export function useFolders() {
  const [folders, setFolders] = useState([]);

  const reloadFolders = useCallback(() => api.fetchFolders().then(setFolders).catch(() => {}), []);
  useEffect(() => { reloadFolders(); }, [reloadFolders]);

  const addFolder = useCallback(async (name) => {
    const maxOrder = folders.length > 0 ? Math.max(...folders.map(f => f.order || 0)) : 0;
    const created = await api.createFolder({ name, order: maxOrder + 1 });
    setFolders(prev => [...prev, created]);
    return created.id;
  }, [folders]);

  const renameFolder = useCallback(async (folderId, newName) => {
    const updated = await api.updateFolder(folderId, { name: newName });
    setFolders(prev => prev.map(f => f.id === folderId ? updated : f));
  }, []);

  const deleteFolder = useCallback(async (folderId) => {
    await api.deleteFolder(folderId, false);
    setFolders(prev => prev.filter(f => f.id !== folderId));
  }, []);

  const deleteFolderAndFeeds = useCallback(async (folderId) => {
    await api.deleteFolder(folderId, true);
    setFolders(prev => prev.filter(f => f.id !== folderId));
  }, []);

  return { folders, reloadFolders, addFolder, renameFolder, deleteFolder, deleteFolderAndFeeds };
}
