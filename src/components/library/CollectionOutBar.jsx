import { useCallback, useState } from 'react';
import { HiOutlineArrowDownTray, HiOutlineArrowTopRightOnSquare, HiOutlineChevronDown, HiOutlineClipboardDocumentList, HiOutlineLink, HiOutlinePaintBrush } from 'react-icons/hi2';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useLibrary } from '../../app/LibraryContext.jsx';
import { useToast } from '../../app/ToastContext.jsx';
import { useClickOutside } from '../../hooks/useClickOutside.js';
import { useMenuKeys } from '../../hooks/useMenuKeys.js';
import { emit } from '../../lib/appEvents.js';
import { STUDIO_QUERY_KEY } from '../../lib/queryClient.js';
import { createStudioItem, fetchArticlePage, getCollectionExportURL } from '../../utils/api.js';
import { copyReferences } from './citationClipboard.js';
import { articleReferences } from './citationModel.js';
import { collectionDraft } from './collectionDraft.js';
import { useCollections } from './useCollections.js';

const NOTEBOOKLM_URL = 'https://notebooklm.google.com/';
const MENU_ITEM = 'flex w-full cursor-pointer items-center gap-2 rounded border-0 bg-transparent px-2.5 py-1.5 text-left text-[12.5px] text-foreground hover:bg-[var(--bg-hover)] [&_svg]:size-3.5 [&_svg]:text-muted-foreground';

// Every article in the collection (list rows, newest save first).
const collectionArticles = async (id) => (await fetchArticlePage('collection', id, { limit: 500 })).articles;

function download(url) {
  const a = document.createElement('a');
  a.href = url;
  a.download = '';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// Sending a collection to NotebookLM: a Markdown file of its articles to
// upload, its links to paste as website sources, or NotebookLM itself.
function useNotebookLM(id) {
  const showToast = useToast();
  return {
    downloadSources: () => {
      download(getCollectionExportURL(id));
      showToast('Downloaded. In NotebookLM: create a notebook, then Add source → Upload, and pick the .md file.', 'info');
    },
    copyLinks: async () => {
      try {
        const links = (await collectionArticles(id)).map((a) => a.link).filter(Boolean);
        await navigator.clipboard.writeText(links.join('\n'));
        showToast(`Copied ${links.length} link${links.length === 1 ? '' : 's'}. In NotebookLM: Add source → Website, and paste.`, 'info');
      } catch (err) {
        showToast(`Couldn't copy the links: ${err.message}`, 'error');
      }
    },
    open: () => window.open(NOTEBOOKLM_URL, '_blank', 'noopener,noreferrer'),
  };
}

function NotebookLMMenu({ id }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useClickOutside(open, close);
  const [menuRef, onMenuKeyDown] = useMenuKeys(open, close);
  const actions = useNotebookLM(id);
  const pick = (run) => () => { close(); run(); };
  return (
    <div className="relative" ref={ref}>
      <Button size="sm" variant="outline" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>
        Send to NotebookLM <HiOutlineChevronDown className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </Button>
      {open && (
        <div role="menu" aria-label="Send to NotebookLM" tabIndex={-1} ref={menuRef} onKeyDown={onMenuKeyDown} className="absolute left-0 top-full z-30 mt-1.5 min-w-60 rounded-md border border-border bg-[var(--bg-modal)] p-1 shadow-lg">
          <button type="button" role="menuitem" className={MENU_ITEM} onClick={pick(actions.downloadSources)}><HiOutlineArrowDownTray /> Download sources (.md) to upload</button>
          <button type="button" role="menuitem" className={MENU_ITEM} onClick={pick(actions.copyLinks)}><HiOutlineLink /> Copy links to paste as websites</button>
          <button type="button" role="menuitem" className={MENU_ITEM} onClick={pick(actions.open)}><HiOutlineArrowTopRightOnSquare /> Open NotebookLM</button>
        </div>
      )}
    </div>
  );
}

// Each article's feed (removed feeds included: their saves stay).
function useFeedOf() {
  const { sourceFeeds: feeds } = useLibrary();
  return useCallback((article) => feeds.find((f) => f.id === article.feedId), [feeds]);
}

// Copies every article in the collection as an APA reference list.
function useCopyCitations(id) {
  const feedOf = useFeedOf();
  const showToast = useToast();
  return async () => {
    try {
      const articles = await collectionArticles(id);
      await copyReferences(articleReferences(articles, feedOf));
      showToast(`Copied ${articles.length} APA citation${articles.length === 1 ? '' : 's'}, in reference-list order.`, 'info');
    } catch (err) {
      showToast(`Couldn't copy the citations: ${err.message}`, 'error');
    }
  };
}

// A Studio draft from the collection, opened in Studio once saved.
function useStartDraft(collection) {
  const feedOf = useFeedOf();
  const queryClient = useQueryClient();
  const showToast = useToast();
  const [busy, setBusy] = useState(false);
  const start = async () => {
    setBusy(true);
    try {
      const item = await createStudioItem(collectionDraft(collection, await collectionArticles(collection.id), feedOf));
      queryClient.invalidateQueries({ queryKey: [STUDIO_QUERY_KEY] });
      emit('open-studio', item.id);
    } catch (err) {
      showToast(`Couldn't start the draft: ${err.message}`, 'error');
    } finally {
      setBusy(false);
    }
  };
  return { busy, start };
}

/** Under a collection's list header: send it to NotebookLM, start a Studio draft from it, or copy its citations. */
export default function CollectionOutBar({ id }) {
  const collection = useCollections().find((c) => c.id === id);
  const draft = useStartDraft(collection);
  const copyCitations = useCopyCitations(id);
  if (!collection || collection.count === 0) return null;
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-4 py-2">
      <NotebookLMMenu id={id} />
      <Button size="sm" variant="ghost" onClick={draft.start} disabled={draft.busy} title="A newsletter draft in Studio: one section per article, with your notes and a reference list">
        <HiOutlinePaintBrush /> {draft.busy ? 'Starting…' : 'Start a Studio draft'}
      </Button>
      <Button size="sm" variant="ghost" onClick={copyCitations} title="Every article as an APA 7 reference, A to Z, ready to paste into a document">
        <HiOutlineClipboardDocumentList /> Copy citations
      </Button>
    </div>
  );
}
