import { cn } from '@/lib/utils';
import { styleLabel } from '../../ai/newsletter.js';
import { editedLabel } from './studioModel.js';

function ItemRow({ item, active, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'block w-full cursor-pointer border-0 border-b border-border bg-transparent px-4 py-3 text-left hover:bg-[var(--bg-hover)]',
        active && 'bg-[var(--bg-active)] shadow-[inset_2px_0_0_var(--accent)] hover:bg-[var(--bg-active)]',
      )}
    >
      <div className="flex items-baseline gap-2">
        <span className="line-clamp-2 min-w-0 flex-1 text-[14px] font-medium leading-snug text-foreground">{item.title}</span>
        <span className="shrink-0 font-mono text-[11px] text-[var(--text-tertiary)]">{editedLabel(item.updatedAt)}</span>
      </div>
      <div className="mt-1 truncate font-mono text-[11px] text-[var(--text-tertiary)]">
        {styleLabel(item.style) || 'Newsletter'} · {item.sourceCount} {item.sourceCount === 1 ? 'article' : 'articles'}
      </div>
    </button>
  );
}

/** The saved items, most recently edited first. */
export default function StudioList({ items, selectedId, onSelect }) {
  return (
    <nav aria-label="Saved newsletters" className="w-72 shrink-0 overflow-y-auto border-r border-border bg-[var(--bg-secondary)]">
      {items.map((item) => <ItemRow key={item.id} item={item} active={item.id === selectedId} onSelect={onSelect} />)}
    </nav>
  );
}
