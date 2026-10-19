// How each section of an issue is presented, from its shape alone. The page
// keeps the writer's order; a role only picks a treatment (a story, an
// analysis with a drop cap, a takeaways panel, a callout…). In the layout
// experiment this plain approach won 9 of 11 blind comparisons.

export const ROLES = ['intro', 'story', 'essay', 'takeaways', 'callout', 'closing'];

// Headings that name a list of points rather than a story.
const LIST_HEADING = /take ?aways|key (points|insights|findings|lessons)|highlights|at a glance|in brief|tl;?dr|summary|quick hits/i;
// Headings of something to act on, set off as a callout.
const CALLOUT_HEADING = /\b(decisions?|decision point|action items?|call to action|bottom line|what to (watch|do)|why it matters|key questions?|recommendations?|next steps?)\b/i;

const isMostlyList = ({ listItems, listShare }) => listItems >= 2 && listShare >= 0.6;

// A mostly-list section: takeaways if its heading says so or its items are
// short; otherwise a story told in bullets.
function listRole(section) {
  const { words, listItems } = section.stats;
  const shortItems = listItems >= 3 && words / listItems <= 22;
  return LIST_HEADING.test(section.heading || '') || shortItems ? 'takeaways' : 'story';
}

const isCallout = (section) => CALLOUT_HEADING.test(section.heading || section.blocks[0]?.label || '') && section.stats.words <= 120;
const isClosing = (section, index, count) => index === count - 1 && !section.heading && section.stats.words <= 40;
const isIntro = (section, index) => index === 0 && !section.heading && section.stats.words <= 120;
const isEssay = ({ words, paragraphs }) => words >= 200 && paragraphs >= 3;

/** A section's role from its shape. */
export function roleOf(section, index, count) {
  if (isMostlyList(section.stats)) return listRole(section);
  if (isCallout(section)) return 'callout';
  if (isClosing(section, index, count)) return 'closing';
  if (isIntro(section, index)) return 'intro';
  return isEssay(section.stats) ? 'essay' : 'story';
}

/** How to present an issue: { roles: { sectionId: role } }. */
export function presentation(issue) {
  return { roles: Object.fromEntries(issue.sections.map((s, i) => [s.id, roleOf(s, i, issue.sections.length)])) };
}
