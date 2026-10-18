import { HiOutlineEllipsisHorizontal } from 'react-icons/hi2';
import { cn } from '@/lib/utils';

/**
 * One sidebar entry: icon, label, unread count, and (optionally) a "…"
 * button that replaces the count on hover. Right-click opens the same menu.
 */
export function NavRow({ active, onClick, onMenu, menuTitle, icon, label, count, className, children }) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
      onContextMenu={onMenu}
      className={cn(
        'group/nav relative flex h-8 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-[13px] select-none transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring',
        active ? 'bg-[var(--bg-active)] text-foreground' : 'text-muted-foreground hover:bg-[var(--bg-hover)] hover:text-foreground',
        className,
      )}
    >
      {children}
      <span className={cn('flex size-4 shrink-0 items-center justify-center [&_svg]:size-4', active && 'text-primary')}>{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count > 0 && <span className={cn('font-mono text-[11.5px] text-[var(--text-tertiary)]', onMenu && 'group-hover/nav:invisible')}>{count}</span>}
      {onMenu && (
        <button
          type="button"
          title={menuTitle}
          aria-label={menuTitle}
          onClick={onMenu}
          className="absolute right-1.5 flex size-6 cursor-pointer items-center justify-center rounded border-0 bg-transparent text-muted-foreground opacity-0 group-hover/nav:opacity-100 hover:bg-[var(--bg-tertiary)] hover:text-foreground focus-visible:opacity-100"
        >
          <HiOutlineEllipsisHorizontal className="size-4" />
        </button>
      )}
    </div>
  );
}

/** Small inline text field (new folder, rename). */
export function InlineInput({ className, ...props }) {
  return (
    <input
      className={cn('h-7 min-w-0 flex-1 rounded-md border border-border bg-[var(--bg-primary)] px-2 font-sans text-[12.5px] text-foreground outline-none focus:border-primary', className)}
      {...props}
    />
  );
}
