/** Broadsheet masthead: ears, a blackletter name and a ruled dateline. */
export default function Masthead({ meta }) {
  return (
    <header className="nl-masthead">
      <div className="bs-ears"><span>{meta.issueLabel}</span><span>{meta.edition}</span><span>{meta.sourceLine}</span></div>
      <h1 className="bs-title">{meta.name}</h1>
      <div className="bs-dateline"><span>{meta.date}</span><span>{meta.byline}</span></div>
    </header>
  );
}
