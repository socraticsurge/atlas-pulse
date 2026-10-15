import {
  HiOutlineArrowLeft, HiOutlineArrowRight, HiOutlineArrowTopRightOnSquare, HiOutlineArrowsPointingIn,
  HiOutlineArrowsPointingOut, HiOutlineBookmark, HiOutlineEye, HiOutlineEyeSlash, HiOutlineSparkles, HiOutlineXMark,
} from 'react-icons/hi2';
import { BsBookmarkFill } from 'react-icons/bs';
import ReaderSettings from '../ReaderSettings.jsx';
import ShareMenu from './ShareMenu.jsx';

function NavControls({ nav }) {
  return (
    <div className="reader-nav-controls">
      <button className="btn btn-ghost btn-icon reader-nav-btn" onClick={() => nav.onNavigate(-1)} disabled={!nav.hasPrev} title="Previous article (k / ↑)">
        <HiOutlineArrowLeft />
      </button>
      <span className="reader-nav-counter">{nav.currentIndex + 1} of {nav.totalCount}</span>
      <button className="btn btn-ghost btn-icon reader-nav-btn" onClick={() => nav.onNavigate(1)} disabled={!nav.hasNext} title="Next article (j / ↓)">
        <HiOutlineArrowRight />
      </button>
    </div>
  );
}

function ExtractionStatus({ extraction }) {
  if (extraction.extracting) {
    return (
      <span className="reader-status extracting">
        <span className="spinner" style={{ width: 12, height: 12 }} /> Loading…
      </span>
    );
  }
  if (extraction.content) return <span className="reader-status extracted">✓ Full article</span>;
  if (extraction.error) return <span className="reader-status error">Feed content only</span>;
  return null;
}

function ArticleActions({ current, live }) {
  return (
    <>
      <button className="btn btn-ghost btn-icon" onClick={live.toggleBookmark} title={current.isBookmarked ? 'Remove bookmark (b)' : 'Bookmark (b)'}>
        {current.isBookmarked ? <BsBookmarkFill style={{ color: 'var(--accent)' }} /> : <HiOutlineBookmark />}
      </button>
      <button className="btn btn-ghost btn-icon" onClick={live.toggleRead} title={current.isRead ? 'Mark as unread' : 'Mark as read'}>
        {current.isRead ? <HiOutlineEyeSlash /> : <HiOutlineEye />}
      </button>
    </>
  );
}

/** Reader toolbar: close/navigation/bookmark/read on the left; AI, focus, settings, share, open on the right. */
export default function ReaderToolbar({ article, live, extraction, nav, zen, ai, settings }) {
  const current = live.current;
  return (
    <div className="reader-toolbar">
      <div className="reader-toolbar-left">
        <button className="btn btn-ghost btn-icon" onClick={zen.on ? zen.exit : nav.onClose} title={zen.on ? 'Exit focus mode (Esc)' : 'Close reader (Esc)'}>
          <HiOutlineXMark />
        </button>
        {!zen.on && <NavControls nav={nav} />}
        <ArticleActions current={current} live={live} />
        <ExtractionStatus extraction={extraction} />
      </div>

      <div className="reader-toolbar-right">
        <button className={`btn btn-ghost btn-sm ${ai.open ? 'active' : ''}`} onClick={ai.toggle} title="AI Assistant — summary & chat">
          <HiOutlineSparkles /> AI
        </button>
        <button className={`btn btn-ghost btn-icon ${zen.on ? 'active' : ''}`} onClick={zen.toggle} title={zen.on ? 'Exit focus mode (f)' : 'Focus mode (f)'}>
          {zen.on ? <HiOutlineArrowsPointingIn /> : <HiOutlineArrowsPointingOut />}
        </button>
        <ReaderSettings settings={settings.value} onSettingsChange={settings.onChange} />
        <ShareMenu link={article.link} title={article.title} />
        <a href={article.link} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" title="Open in new tab (o)">
          <HiOutlineArrowTopRightOnSquare /> Open
        </a>
      </div>
    </div>
  );
}
