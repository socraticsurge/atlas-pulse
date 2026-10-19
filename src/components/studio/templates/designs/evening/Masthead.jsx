/** Evening Edition masthead: a red banner with the name in heavy condensed capitals. */
export default function Masthead({ meta }) {
  return (
    <header className="nl-masthead">
      <div className="ev-banner">
        <h1 className="ev-title">{meta.name.replace(/^the\s+/i, '')}</h1>
        <div className="ev-ears">
          <div className="ev-edition">{meta.edition}</div>
          <div>{meta.date}</div>
          <div>{meta.sourceLine}</div>
        </div>
      </div>
      <div className="ev-bar" />
    </header>
  );
}
