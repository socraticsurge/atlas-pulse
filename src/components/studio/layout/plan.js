import { quoteCandidates } from './parseIssue.js';

// A layout plan says how one issue is laid out in a design system:
// { layout, roles: { sectionId: role }, lead: sectionId | null,
//   quote: { text, sectionId } | null, by: 'rules' | 'library' | 'nano' }.
// Roles and layouts are the design system's vocabulary; the renderer turns a
// plan into the page. A plan from Nano goes through checkPlan before use.

export const ROLES = ['intro', 'story', 'essay', 'takeaways', 'callout', 'closing'];
export const LAYOUTS = ['flow', 'front', 'digest', 'longform', 'briefing'];

const CALLOUT_HEADING = /\b(decisions?|decision point|action items?|call to action|bottom line|what to (watch|do)|why it matters|key questions?|recommendations?|next steps?)\b/i;
// Headings that name a list of points rather than a story.
export const GENERIC_LIST_HEADING = /take ?aways|key (points|insights|findings|lessons)|highlights|at a glance|in brief|tl;?dr|summary|quick hits/i;

// A mostly-list section: takeaways if its heading says so or its items are
// short; otherwise a story told in bullets.
function listRole(section) {
  const { words, listItems } = section.stats;
  return GENERIC_LIST_HEADING.test(section.heading || '') || (listItems >= 3 && words / listItems <= 22) ? 'takeaways' : 'story';
}

/** A section's role from its shape alone. */
export function heuristicRole(section, index, count) {
  const { words, paragraphs, listItems, listShare } = section.stats;
  const firstLabel = section.blocks[0]?.label;
  if (listItems >= 2 && listShare >= 0.6) return listRole(section);
  if (CALLOUT_HEADING.test(section.heading || firstLabel || '') && words <= 120) return 'callout';
  if (index === count - 1 && words <= 40) return 'closing';
  if (index === 0 && !section.heading && words <= 120) return 'intro';
  if (words >= 200 && paragraphs >= 3) return 'essay';
  return 'story';
}

export const heuristicRoles = (issue) => Object.fromEntries(
  issue.sections.map((s, i) => [s.id, heuristicRole(s, i, issue.sections.length)]),
);

const isArticle = (role) => role === 'story' || role === 'essay';

/** The lead: the first story or essay, preferring the longest of the first three. */
export function heuristicLead(issue, roles) {
  const articles = issue.sections.filter((s) => isArticle(roles[s.id]));
  const early = articles.slice(0, 3);
  return early.reduce((best, s) => (!best || s.stats.words > best.stats.words ? s : best), null)?.id ?? null;
}

/** A pull quote: a blockquote the writer gave, else the lead's sentence closest to 90 characters. */
export function heuristicQuote(issue, lead) {
  const candidates = quoteCandidates(issue);
  const given = candidates.find((c) => c.given);
  if (given) return given;
  const pool = candidates.filter((c) => c.sectionId === lead);
  return (pool.length ? pool : candidates)
    .reduce((best, c) => (!best || Math.abs(c.text.length - 90) < Math.abs(best.text.length - 90) ? c : best), null);
}

// How well each layout fits the issue's roles and lengths (higher is better).
// Takeaways attached to a story count as part of it.
function counts(issue, roles, attach = {}) {
  const by = (role) => issue.sections.filter((s) => roles[s.id] === role && !attach[s.id]);
  const stories = by('story');
  return {
    n: issue.sections.length - Object.keys(attach).length,
    stories: stories.length,
    essays: by('essay').length,
    takeaways: by('takeaways').length,
    callouts: by('callout').length,
    avgStoryWords: stories.length ? stories.reduce((sum, s) => sum + s.stats.words, 0) / stories.length : 0,
    takeawaysEarly: issue.sections.slice(0, 2).some((s) => roles[s.id] === 'takeaways'),
  };
}

const SCORES = {
  front: (c) => (c.stories + c.essays >= 1 && c.takeaways + c.callouts >= 1 ? 3 + Math.min(c.n, 6) / 6 - (c.stories >= 5 ? 1.5 : 0) : 1),
  digest: (c) => (c.stories >= 4 && c.avgStoryWords < 170 ? 4.5 : c.stories >= 3 ? 2.5 : 0),
  longform: (c) => (c.n <= 1 ? 5 : c.essays >= 1 && c.stories + c.takeaways <= 1 && c.n <= 3 ? 4 : 0.5),
  briefing: (c) => (c.takeaways >= 1 && c.takeawaysEarly ? 3.5 + (c.callouts ? 0.5 : 0) : 0),
};

/** Every library layout with its fit score, best first. */
export function scoreLayouts(issue, roles, attach) {
  const c = counts(issue, roles, attach);
  return Object.entries(SCORES).map(([layout, score]) => ({ layout, score: score(c) })).sort((a, b) => b.score - a.score);
}

/**
 * Takeaways that belong to the story before them ("## Story" then "## Key
 * Takeaways"): { takeawaysId: storyId }. They are drawn under that story.
 */
export function heuristicAttach(issue, roles) {
  const attach = {};
  issue.sections.forEach((s, i) => {
    const before = issue.sections[i - 1];
    if (roles[s.id] === 'takeaways' && before && isArticle(roles[before.id]) && GENERIC_LIST_HEADING.test(s.heading || '')) attach[s.id] = before.id;
  });
  return attach;
}

/** R: one fixed layout; only the writer's own blockquote becomes a pull quote. */
export function rulesPlan(issue) {
  const roles = heuristicRoles(issue);
  return { by: 'rules', layout: 'flow', roles, attach: {}, lead: null, quote: quoteCandidates(issue).find((c) => c.given) ?? null };
}

/** L: the best-fitting library layout, from heuristic roles (or given ones). */
export function libraryPlan(issue, decisions = {}) {
  const roles = { ...heuristicRoles(issue), ...decisions.roles };
  const attach = heuristicAttach(issue, roles);
  const lead = decisions.lead ?? heuristicLead(issue, roles);
  const quote = decisions.quote === undefined ? heuristicQuote(issue, lead) : decisions.quote;
  return { by: decisions.by ?? 'library', layout: scoreLayouts(issue, roles, attach)[0].layout, roles, attach, lead, quote };
}

/** A plan with anything invalid replaced by the heuristic choice; never throws. */
export function checkPlan(issue, plan) {
  const ids = new Set(issue.sections.map((s) => s.id));
  const fallback = libraryPlan(issue);
  const roles = Object.fromEntries(issue.sections.map((s) => [s.id, ROLES.includes(plan.roles?.[s.id]) ? plan.roles[s.id] : fallback.roles[s.id]]));
  const lead = ids.has(plan.lead) && isArticle(roles[plan.lead]) ? plan.lead : heuristicLead(issue, roles);
  const candidates = quoteCandidates(issue, 50);
  const quote = plan.quote && candidates.some((c) => c.text === plan.quote.text) ? plan.quote : null;
  const attach = heuristicAttach(issue, roles);
  return { ...plan, layout: LAYOUTS.includes(plan.layout) ? plan.layout : scoreLayouts(issue, roles, attach)[0].layout, roles, attach, lead, quote };
}
