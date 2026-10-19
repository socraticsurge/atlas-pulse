import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createStudioItem } from '../../utils/api.js';
import { STUDIO_QUERY_KEY } from '../../lib/queryClient.js';

const IDLE = { status: 'idle', id: null, error: null };

/**
 * Saves a generated newsletter to Studio. status: 'idle' | 'saving' | 'saved'
 * (id is the new item's) | 'error'. reset() forgets it, for a new generation.
 */
export function useSaveToStudio() {
  const queryClient = useQueryClient();
  const [state, setState] = useState(IDLE);
  const save = useCallback(async (item) => {
    setState({ ...IDLE, status: 'saving' });
    try {
      const saved = await createStudioItem(item);
      queryClient.invalidateQueries({ queryKey: [STUDIO_QUERY_KEY] });
      setState({ ...IDLE, status: 'saved', id: saved.id });
    } catch (err) {
      setState({ ...IDLE, status: 'error', error: err.message });
    }
  }, [queryClient]);
  const reset = useCallback(() => setState(IDLE), []);
  return { ...state, save, reset };
}
