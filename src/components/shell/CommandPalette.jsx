import { useState } from 'react';
import { HiOutlineDocumentText } from 'react-icons/hi2';
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut,
} from '@/components/ui/command';
import { useArticleSearch } from '../../hooks/useArticleSearch.js';
import { commandFilter } from './commands.js';

const ARTICLE_LIMIT = 8;

function CommandRow({ item, onSelect }) {
  const { Icon } = item;
  return (
    <CommandItem value={`${item.label} ${item.hint ?? ''} ${item.id}`} onSelect={onSelect}>
      <Icon />
      <span className="truncate">{item.label}</span>
      {item.hint && <span className="text-xs text-muted-foreground">{item.hint}</span>}
      {item.shortcut && <CommandShortcut className="font-mono">{item.shortcut}</CommandShortcut>}
    </CommandItem>
  );
}

// Articles are matched here (not by cmdk), so they're always rendered.
function ArticleResults({ articles, sourceOf, onOpen }) {
  if (articles.length === 0) return null;
  return (
    <CommandGroup heading="Articles" forceMount>
      {articles.map((article) => (
        <CommandItem key={article.id} value={`article-${article.id}`} forceMount onSelect={() => onOpen(article)}>
          <HiOutlineDocumentText />
          <span className="truncate">{article.title}</span>
          <span className="ml-auto max-w-[35%] shrink-0 truncate text-xs text-muted-foreground">{sourceOf(article)}</span>
        </CommandItem>
      ))}
    </CommandGroup>
  );
}

/**
 * ⌘K palette: go to a view, folder or feed; run an action; switch the list
 * view; or open an article from the current list (ranked like the list's own
 * search: title, source and excerpt, then full text).
 */
export default function CommandPalette({ open, onOpenChange, groups, articles, sourceOf, onOpenArticle }) {
  const [query, setQuery] = useState('');
  const ranked = useArticleSearch(articles, query, sourceOf);
  const found = query.trim() ? ranked.slice(0, ARTICLE_LIMIT) : [];
  const close = () => { onOpenChange(false); setQuery(''); };
  const runAndClose = (run) => () => { close(); run(); };

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      title="Command palette"
      description="Go to a view or feed, run an action, or find an article"
      className="top-[18%] translate-y-0 border-border bg-[var(--bg-modal)] sm:max-w-xl"
      showCloseButton={false}
      commandProps={{ filter: commandFilter }}
    >
      <CommandInput placeholder="Type a command, feed or article…" value={query} onValueChange={setQuery} />
      <CommandList className="max-h-[min(460px,60vh)]">
        <CommandEmpty>Nothing matches.</CommandEmpty>
        {groups.map((group) => (
          <CommandGroup key={group.heading} heading={group.heading}>
            {group.items.map((item) => <CommandRow key={item.id} item={item} onSelect={runAndClose(item.run)} />)}
          </CommandGroup>
        ))}
        <ArticleResults articles={found} sourceOf={sourceOf} onOpen={(article) => runAndClose(() => onOpenArticle(article))()} />
      </CommandList>
    </CommandDialog>
  );
}
