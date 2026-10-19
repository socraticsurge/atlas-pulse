import { blockText, quoteCandidates } from './parseIssue.js';
import { checkPlan, heuristicRoles, libraryPlan, ROLES } from './plan.js';

// Q: Gemini Nano makes the editorial calls for a layout by answering small
// multiple-choice questions, each held to a JSON schema. Code makes the
// visual calls (libraryPlan), and checkPlan replaces anything invalid.

const SYSTEM = 'You are the front-page editor of a newspaper. You answer layout questions about a newsletter with one short JSON answer. Judge by meaning and news value, not by length.';

const ROLE_HELP = 'story = a news item or report; essay = a longer piece of analysis, opinion or reflection; takeaways = a list of key points; callout = a short decision, action, recommendation or bottom line to highlight; intro = an opening note to readers; closing = a sign-off.';

const excerpt = (section, chars = 600) => section.blocks.map(blockText).join(' ').slice(0, chars);

// A session per run; low randomness where this Chrome allows setting it.
async function openSession() {
  const base = { initialPrompts: [{ role: 'system', content: SYSTEM }], expectedOutputs: [{ type: 'text', languages: ['en'] }] };
  try {
    return { session: await self.LanguageModel.create({ ...base, temperature: 0.2, topK: 3 }), tuned: true };
  } catch {
    return { session: await self.LanguageModel.create(base), tuned: false };
  }
}

// One question on a fresh copy of the session, so earlier answers don't steer it.
async function ask(session, prompt, schema) {
  const q = session.clone ? await session.clone() : session;
  try {
    const raw = await q.prompt(prompt, { responseConstraint: schema });
    return JSON.parse(raw);
  } finally {
    if (q !== session) q.destroy?.();
  }
}

const enumSchema = (key, values) => ({ type: 'object', properties: { [key]: { type: 'string', enum: values } }, required: [key] });

async function askRole(session, section, index, count) {
  const { words, listItems } = section.stats;
  const prompt = `Section ${index + 1} of ${count}. Heading: ${section.heading ? `"${section.heading}"` : '(none)'}. `
    + `${words} words, ${listItems} list items.\nText: """${excerpt(section)}"""\n\n`
    + `What role should this section play on the page? ${ROLE_HELP}`;
  return (await ask(session, prompt, enumSchema('role', ROLES))).role;
}

async function askLead(session, issue, roles) {
  const articles = issue.sections.filter((s) => roles[s.id] === 'story' || roles[s.id] === 'essay');
  if (articles.length < 2) return articles[0]?.id ?? null;
  const list = articles.map((s, i) => `${i}. ${s.heading ? `"${s.heading}": ` : ''}${excerpt(s, 200)}`).join('\n');
  const prompt = `Newsletter headline: "${issue.headline}".\nWhich of these should lead the front page, as the most important or newsworthy?\n${list}`;
  const { lead } = await ask(session, prompt, enumSchema('lead', articles.map((_, i) => String(i))));
  return articles[Number(lead)]?.id ?? null;
}

async function askQuote(session, issue) {
  const candidates = quoteCandidates(issue);
  if (candidates.length === 0) return null;
  const list = candidates.map((c, i) => `${i}. "${c.text}"`).join('\n');
  const prompt = `Which sentence makes the best pull quote: striking, self-contained, and makes a reader want to read on? Answer "none" if none would work.\n${list}`;
  const { quote } = await ask(session, prompt, enumSchema('quote', [...candidates.map((_, i) => String(i)), 'none']));
  return quote === 'none' ? null : candidates[Number(quote)] ?? null;
}

const timed = async (fn) => {
  const started = performance.now();
  const value = await fn();
  return [value, Math.round(performance.now() - started)];
};

/**
 * Asks Nano for an issue's roles, lead and pull quote and returns the checked
 * plan with { timings: { roles, lead, quote, total } (ms), tuned, errors }.
 */
export async function nanoPlan(issue) {
  const errors = [];
  const guard = (fallback) => (err) => { errors.push(err.message); return fallback; };
  const [{ session, tuned }, openMs] = await timed(openSession);
  const heuristic = heuristicRoles(issue);
  const [roles, rolesMs] = await timed(async () => {
    const out = {};
    for (const [i, s] of issue.sections.entries()) out[s.id] = await askRole(session, s, i, issue.sections.length).catch(guard(heuristic[s.id]));
    return out;
  });
  const [lead, leadMs] = await timed(() => askLead(session, issue, roles).catch(guard(undefined)));
  const [quote, quoteMs] = await timed(() => askQuote(session, issue).catch(guard(undefined)));
  session.destroy?.();
  const plan = checkPlan(issue, libraryPlan(issue, { by: 'nano', roles, lead, quote }));
  return { ...plan, tuned, errors, timings: { open: openMs, roles: rolesMs, lead: leadMs, quote: quoteMs, total: openMs + rolesMs + leadMs + quoteMs } };
}
