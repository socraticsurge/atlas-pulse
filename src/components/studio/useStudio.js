import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteStudioItem, fetchStudioItem, fetchStudioItems, updateStudioItem,
} from '../../utils/api.js';
import { STUDIO_QUERY_KEY } from '../../lib/queryClient.js';

const STUDIO_KEY = STUDIO_QUERY_KEY;
const AUTOSAVE_MS = 800;

/** Every Studio item, most recently edited first (no bodies). */
export function useStudioList() {
  return useQuery({ queryKey: [STUDIO_KEY], queryFn: fetchStudioItems });
}

/** One item with its body and sources. */
export function useStudioItem(id) {
  return useQuery({ queryKey: [STUDIO_KEY, id], queryFn: () => fetchStudioItem(id), enabled: Boolean(id) });
}

/** Deletes an item; the list refetches. */
export function useDeleteStudioItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteStudioItem,
    // The deleted item's own cache entry is left to expire: removing it while
    // its editor is still mounted would refetch it (a 404).
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [STUDIO_KEY], exact: true }),
  });
}

// Sends the pending edit, if any, and records the result in the cache.
function useSaveEdits(id, setStatus) {
  const queryClient = useQueryClient();
  const pending = useRef(null);
  const timer = useRef(null);

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    const changes = pending.current;
    if (!changes) return;
    pending.current = null;
    setStatus('saving');
    try {
      const saved = await updateStudioItem(id, changes);
      queryClient.setQueryData([STUDIO_KEY, id], saved);
      queryClient.invalidateQueries({ queryKey: [STUDIO_KEY], exact: true });
      setStatus(pending.current ? 'unsaved' : 'saved');
    } catch {
      pending.current = { ...changes, ...pending.current };
      setStatus('error');
    }
  }, [id, queryClient, setStatus]);

  const queue = useCallback((changes) => {
    pending.current = { ...pending.current, ...changes };
    setStatus('unsaved');
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, AUTOSAVE_MS);
  }, [flush, setStatus]);

  // Leaving the item (or Studio) saves what is still pending.
  useEffect(() => () => { flush(); }, [flush]);
  return { queue, flush };
}

/**
 * The editable draft of an item ({ title, bodyMd }), saved automatically a
 * moment after typing stops. status: 'saved' | 'unsaved' | 'saving' | 'error'.
 */
export function useStudioDraft(item) {
  const [draft, setDraft] = useState(null);
  const [status, setStatus] = useState('saved');
  const [loadedId, setLoadedId] = useState(null);
  // A newly opened item replaces the draft (during render, so there's no stale paint).
  if (item && loadedId !== item.id) {
    setLoadedId(item.id);
    setDraft({ title: item.title, bodyMd: item.bodyMd });
    setStatus('saved');
  }
  const { queue, flush } = useSaveEdits(item?.id, setStatus);

  const edit = useCallback((changes) => {
    setDraft((d) => ({ ...d, ...changes }));
    const title = changes.title?.trim();
    if ('title' in changes && !title) return; // a title can't be empty; keep the last saved one
    queue(title ? { ...changes, title } : changes);
  }, [queue]);

  return { draft: item && draft, status, edit, retry: flush };
}
