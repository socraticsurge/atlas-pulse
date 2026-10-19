/** Quarterly masthead: the name in spaced capitals, a large issue number and the edition. */
export default function Masthead({ meta }) {
  return (
    <header className="nl-masthead">
      <div className="qt-top">
        <div className="qt-name">{meta.name}</div>
        <div className="qt-date">{meta.edition} · {meta.date}</div>
      </div>
      <div className="qt-issue">
        <span className="qt-number">{meta.issueLabel.replace(/^No\.\s*/, '').padStart(2, '0')}</span>
        <span className="qt-lines"><span>{meta.sourceLine}</span><span>{meta.byline}</span></span>
      </div>
    </header>
  );
}
