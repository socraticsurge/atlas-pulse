import ResizableHandle from '../ResizableHandle.jsx';

const SHORTCUTS = [
  ['j / k', 'next / previous article'],
  ['o', 'open the original'],
  ['b', 'bookmark'],
  ['f', 'focus mode'],
  ['/', 'search the list'],
  ['Esc', 'close the article'],
];

/** The docked reader pane when no article is open: what to do, and the keys for it. */
export default function ReaderPlaceholder({ width, onResize }) {
  return (
    <aside
      aria-label="Reader"
      className="article-reader-panel visible relative flex flex-col items-center justify-center gap-6 px-10 text-center"
      style={{ width: `${width}px` }}
    >
      <ResizableHandle className="overlay-resize-handle" onResize={onResize} />
      <p className="m-0 text-[15px] text-muted-foreground">Select an article to read it here.</p>
      <dl className="m-0 grid grid-cols-[auto_auto] gap-x-4 gap-y-2 text-left text-[13px]">
        {SHORTCUTS.map(([keys, action]) => (
          <div key={keys} className="contents">
            <dt className="justify-self-end font-mono text-foreground">{keys}</dt>
            <dd className="m-0 text-muted-foreground">{action}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
