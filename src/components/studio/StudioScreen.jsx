import { useEffect } from 'react';
import { HiOutlineExclamationCircle, HiOutlinePaintBrush } from 'react-icons/hi2';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useOpenInReader } from '../library/useLibraryCollection.js';
import StudioEditor from './StudioEditor.jsx';
import StudioList from './StudioList.jsx';
import { useDeleteStudioItem, useStudioItem, useStudioList } from './useStudio.js';

function Header({ count }) {
  return (
    <header className="flex h-[var(--pane-header-height)] shrink-0 items-center gap-3 border-b border-border px-5">
      <HiOutlinePaintBrush className="size-[18px] shrink-0 text-primary" />
      <h2 className="m-0 truncate text-base font-semibold text-foreground">
        Studio
        {count > 0 && <span className="ml-1.5 font-mono text-xs font-normal text-[var(--text-tertiary)]">{count}</span>}
      </h2>
    </header>
  );
}

function Empty() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
      <HiOutlinePaintBrush className="size-9 text-[var(--text-tertiary)]" />
      <h3 className="m-0 mt-2 text-[15px] font-medium text-foreground">No newsletters yet</h3>
      <p className="m-0 max-w-sm text-[13px] text-muted-foreground">
        Select 3 to 15 articles in the list, choose Newsletter, generate it, then click Save to Studio. You can edit it here.
      </p>
    </div>
  );
}

function Problem({ message, onRetry }) {
  return (
    <div className="flex flex-1 items-center justify-center gap-3 text-[13px] text-foreground">
      <HiOutlineExclamationCircle className="size-4 text-[var(--danger)]" /> {message}
      {onRetry && <Button variant="ghost" size="sm" onClick={onRetry}>Retry</Button>}
    </div>
  );
}

const Loading = () => <div className="flex flex-1 items-center justify-center"><Spinner className="size-6" /></div>;

// The open item, or why it can't be shown.
function EditorArea({ id, onDeleted, onOpenSource }) {
  const item = useStudioItem(id);
  const remove = useDeleteStudioItem();
  if (item.isPending) return <Loading />;
  if (item.isError) return <Problem message={item.error.message} onRetry={item.refetch} />;
  const onDelete = async () => { await remove.mutateAsync(id); onDeleted(); };
  return <StudioEditor key={id} item={item.data} onDelete={onDelete} onOpenSource={onOpenSource} />;
}

// Opens the first item when none (or a deleted one) is selected.
function useDefaultSelection(items, selectedId, onSelect) {
  useEffect(() => {
    if (!items?.length || items.some((i) => i.id === selectedId)) return;
    onSelect(items[0].id);
  }, [items, selectedId, onSelect]);
}

// Which of loading, error, empty or the list to show.
function listState(list) {
  if (list.isPending) return 'loading';
  if (list.isError) return 'error';
  return list.data.length === 0 ? 'empty' : 'items';
}

function Body({ list, selected, onSelect, onOpenSource }) {
  const state = listState(list);
  if (state === 'loading') return <Loading />;
  if (state === 'error') return <Problem message={list.error.message} onRetry={list.refetch} />;
  if (state === 'empty') return <Empty />;
  return (
    <>
      <StudioList items={list.data} selectedId={selected} onSelect={onSelect} />
      {selected && <EditorArea id={selected} onDeleted={() => onSelect(undefined)} onOpenSource={onOpenSource} />}
    </>
  );
}

/** Studio: saved newsletters on the left, the open one in a Markdown editor with a live preview. */
export default function StudioScreen({ selectedId, onSelect, onOpenArticle }) {
  const list = useStudioList();
  const items = list.data;
  useDefaultSelection(items, selectedId, onSelect);
  const openSource = useOpenInReader(onOpenArticle);
  const selected = items?.some((i) => i.id === selectedId) ? selectedId : null;

  return (
    <div className="flex h-screen min-w-0 flex-1 flex-col bg-background">
      <Header count={items?.length ?? 0} />
      <div className="flex min-h-0 flex-1">
        <Body list={list} selected={selected} onSelect={onSelect} onOpenSource={openSource} />
      </div>
    </div>
  );
}
