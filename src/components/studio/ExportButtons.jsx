import { useState } from 'react';
import { HiOutlineArrowDownTray, HiOutlineExclamationCircle } from 'react-icons/hi2';
import { cn } from '@/lib/utils';
import { exportStudioItem } from '../../utils/api.js';
import { saveBlob } from '../../utils/download.js';

const ACTION = 'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border-0 bg-transparent px-2 text-xs text-muted-foreground hover:bg-[var(--bg-hover)] hover:text-foreground disabled:cursor-default disabled:opacity-60 [&_svg]:size-3.5';
const FORMATS = [['png', 'PNG', 'The page as an image, for sharing'], ['pdf', 'PDF', 'The page as A4 pages, with real text']];

/**
 * PNG and PDF of the page in its design. beforeExport saves pending edits
 * first, since the export renders the saved newsletter.
 */
export default function ExportButtons({ itemId, design, beforeExport }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const run = async (format) => {
    setBusy(format);
    setError(null);
    try {
      await beforeExport();
      const { blob, filename } = await exportStudioItem(itemId, { format, design: design ?? undefined });
      saveBlob(blob, filename);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };
  return (
    <>
      {FORMATS.map(([format, label, title]) => (
        <button key={format} type="button" onClick={() => run(format)} disabled={Boolean(busy)} title={title} className={ACTION}>
          <HiOutlineArrowDownTray /> {busy === format ? 'Exporting…' : label}
        </button>
      ))}
      {error && <span role="alert" title={error} className={cn(ACTION, 'cursor-default text-[var(--danger)] hover:bg-transparent hover:text-[var(--danger)]')}><HiOutlineExclamationCircle /> {error.length > 60 ? `${error.slice(0, 60)}…` : error}</span>}
    </>
  );
}
