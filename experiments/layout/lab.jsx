/* eslint-disable react-refresh/only-export-components -- a dev-only page, not a module */
// Blind judging for the layout experiment. Each newsletter is drawn three ways
// (R rules, L library, Q library + Nano's editorial calls) in an order shuffled
// per newsletter; the judge sees only A/B/C. window.runNano() fills in Q.
import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { fetchStudioItem, fetchStudioItems } from '../../src/utils/api.js';
import { styleLabel } from '../../src/ai/newsletter.js';
import { parseIssue } from '../../src/components/studio/layout/parseIssue.js';
import { libraryPlan, rulesPlan } from '../../src/components/studio/layout/plan.js';
import { nanoPlan } from '../../src/components/studio/layout/nanoQuestions.js';
import Broadsheet from '../../src/components/studio/layout/Broadsheet.jsx';

const NANO_KEY = 'layout-exp-nano';
const VERDICT_KEY = 'layout-exp-verdicts';
const read = (key) => JSON.parse(localStorage.getItem(key) || '{}');
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));

// A fixed shuffle per newsletter, so A/B/C don't move between visits.
function order(id) {
  const all = [['R', 'L', 'Q'], ['L', 'Q', 'R'], ['Q', 'R', 'L'], ['R', 'Q', 'L'], ['L', 'R', 'Q'], ['Q', 'L', 'R']];
  return all[(id * 7 + 3) % all.length];
}

function metaFor(item, issue) {
  const date = issue.meta.find((m) => /date/i.test(m.label))?.md ?? new Date(item.createdAt).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  return {
    issueLabel: `No. ${item.id}`,
    edition: `${styleLabel(item.style) ?? 'Newsletter'} edition`,
    sourceLine: `Curated from ${item.sources.length} articles`,
    date,
    model: item.model ? `Written with ${item.model.split(':')[0]}` : '',
  };
}

async function loadAll() {
  const list = await fetchStudioItems();
  const items = await Promise.all(list.map((i) => fetchStudioItem(i.id)));
  return items.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true })).map((item) => {
    const issue = parseIssue(item.bodyMd, item.title.replace(/^\[c\d+\]\s*/, ''));
    return { item, issue, plans: { R: rulesPlan(issue), L: libraryPlan(issue) } };
  });
}

// Runs Q `times` times for every newsletter (or the ids given) and keeps every run.
window.runNano = async (times = 3, ids) => {
  const corpus = await loadAll();
  const store = read(NANO_KEY);
  for (const { item, issue } of corpus.filter((c) => !ids || ids.includes(c.item.id))) {
    store[item.id] = [];
    for (let run = 0; run < times; run += 1) {
      try { store[item.id].push(await nanoPlan(issue)); } catch (err) { store[item.id].push({ failed: err.message }); }
      write(NANO_KEY, store);
      console.log(`Q #${item.id} run ${run + 1}: ${store[item.id].at(-1).timings?.total ?? 'failed'} ms`);
    }
  }
  return 'done';
};

window.layoutResults = () => ({ nano: read(NANO_KEY), verdicts: read(VERDICT_KEY) });

function Verdict({ id, letter, verdicts, onChange }) {
  const v = verdicts[id] ?? {};
  const bad = v.unacceptable ?? [];
  return (
    <div className="verdict">
      <label><input type="radio" name={`best-${id}`} checked={v.best === letter} onChange={() => onChange({ ...v, best: letter })} /> Best</label>
      <label><input type="checkbox" checked={bad.includes(letter)} onChange={(e) => onChange({ ...v, unacceptable: e.target.checked ? [...bad, letter] : bad.filter((x) => x !== letter) })} /> Unacceptable</label>
    </div>
  );
}

function Lab() {
  const [corpus, setCorpus] = useState(null);
  const [index, setIndex] = useState(0);
  const [compare, setCompare] = useState(true);
  const [verdicts, setVerdicts] = useState(() => read(VERDICT_KEY));
  useEffect(() => { loadAll().then(setCorpus); }, []);
  const current = corpus?.[index];
  const nano = read(NANO_KEY)[current?.item.id]?.find((p) => !p.failed);
  const plans = useMemo(() => current && { ...current.plans, Q: nano ?? current.plans.L }, [current, nano]);
  if (!corpus) return <p style={{ padding: 24 }}>Loading…</p>;

  const id = current.item.id;
  const save = (v) => { const next = { ...verdicts, [id]: v }; setVerdicts(next); write(VERDICT_KEY, next); };
  const v = verdicts[id] ?? {};
  return (
    <>
      <div className="bar">
        <button onClick={() => setIndex((i) => Math.max(0, i - 1))}>← Prev</button>
        <select value={index} onChange={(e) => setIndex(Number(e.target.value))}>
          {corpus.map((c, i) => <option key={c.item.id} value={i}>{verdicts[c.item.id]?.best ? '✓ ' : ''}{c.item.title.slice(0, 60)}</option>)}
        </select>
        <button onClick={() => setIndex((i) => Math.min(corpus.length - 1, i + 1))}>Next →</button>
        <button aria-pressed={compare} onClick={() => setCompare((c) => !c)}>Side by side</button>
        <span>{Object.values(verdicts).filter((x) => x.best).length} / {corpus.length} judged</span>
        <span className="spacer" />
        {!nano && <span style={{ color: '#f0b429' }}>No Nano plan yet for this one</span>}
        <textarea placeholder="Notes (optional)" value={v.notes ?? ''} onChange={(e) => save({ ...v, notes: e.target.value })} />
      </div>
      <div className={compare ? 'pages compare' : 'pages'}>
        {order(id).map((approach, i) => {
          const letter = 'ABC'[i];
          return (
            <div key={letter} className="page">
              <div className="label">{letter}</div>
              <Broadsheet issue={current.issue} plan={plans[approach]} meta={metaFor(current.item, current.issue)} sources={current.item.sources} />
              <Verdict id={id} letter={letter} verdicts={verdicts} onChange={save} />
            </div>
          );
        })}
      </div>
    </>
  );
}

createRoot(document.getElementById('root')).render(<Lab />);
