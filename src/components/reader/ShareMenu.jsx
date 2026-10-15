import { useCallback, useState } from 'react';
import { HiOutlineArrowUpOnSquare, HiOutlineCheck, HiOutlineClipboardDocument, HiOutlineEnvelope } from 'react-icons/hi2';
import { SiX } from 'react-icons/si';
import { FaLinkedinIn } from 'react-icons/fa';
import { useClickOutside } from '../../hooks/useClickOutside.js';
import { canShareNatively, shareByEmail, shareNatively, shareOnLinkedIn, shareOnX } from '../../utils/share.js';

/** Share popover: LinkedIn, X, email, native share, copy link. */
export default function ShareMenu({ link, title }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useClickOutside(open, close);

  const shareWith = useCallback((share) => () => { share(); setOpen(false); }, []);

  const copyLink = useCallback(() => {
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [link]);

  return (
    <div className="share-popover-anchor" ref={ref}>
      <button className={`btn btn-ghost btn-sm ${open ? 'active' : ''}`} onClick={() => setOpen((s) => !s)} title="Share">
        <HiOutlineArrowUpOnSquare /> Share
      </button>
      {open && (
        <div className="share-popover">
          <button className="share-option" onClick={shareWith(() => shareOnLinkedIn(link))}>
            <FaLinkedinIn style={{ color: '#0a66c2' }} /> LinkedIn
          </button>
          <button className="share-option" onClick={shareWith(() => shareOnX(link, title))}>
            <SiX /> X / Twitter
          </button>
          <button className="share-option" onClick={shareWith(() => shareByEmail(link, title))}>
            <HiOutlineEnvelope /> Email
          </button>
          {canShareNatively() && (
            <button className="share-option" onClick={shareWith(() => shareNatively(link, title))}>
              <HiOutlineArrowUpOnSquare /> More…
            </button>
          )}
          <div className="share-divider" />
          <button className="share-option" onClick={copyLink}>
            {copied ? <HiOutlineCheck style={{ color: 'var(--accent)' }} /> : <HiOutlineClipboardDocument />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
      )}
    </div>
  );
}
