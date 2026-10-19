// Checks Studio requests before they reach the database. Each parser returns
// { value } with only the known fields, or { error } with a message for a 400.

export const STUDIO_KINDS = ['newsletter'];
export const LIMITS = { title: 200, body: 500_000, sources: 50, sourceField: 2_000 };

const isText = (value, max) => typeof value === 'string' && value.length <= max;
const optionalText = (value, max) => (value === undefined || value === null ? null : isText(value, max) ? value : undefined);

function parseSource(raw) {
  if (!raw || typeof raw !== 'object') return undefined;
  const source = {
    articleId: Number.isInteger(raw.articleId) ? raw.articleId : null,
    url: optionalText(raw.url, LIMITS.sourceField),
    title: optionalText(raw.title, LIMITS.sourceField),
    source: optionalText(raw.source, LIMITS.sourceField),
  };
  return Object.values(source).includes(undefined) ? undefined : source;
}

function parseSources(raw = []) {
  if (!Array.isArray(raw) || raw.length > LIMITS.sources) return undefined;
  const sources = raw.map(parseSource);
  return sources.includes(undefined) ? undefined : sources;
}

// The AI settings snapshot is stored as JSON for reference; keep it small.
function parseSettings(raw) {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  return JSON.stringify(raw).length <= LIMITS.sourceField * 5 ? raw : undefined;
}

const titleOk = (title) => isText(title, LIMITS.title) && title.trim() !== '';

/** A new item: { kind, title, bodyMd, style?, model?, aiSettings?, sources? }. */
export function parseNewItem(body = {}) {
  if (!STUDIO_KINDS.includes(body.kind)) return { error: `kind must be one of: ${STUDIO_KINDS.join(', ')}` };
  if (!titleOk(body.title)) return { error: `title is required (at most ${LIMITS.title} characters)` };
  if (!isText(body.bodyMd, LIMITS.body)) return { error: 'bodyMd must be text (at most 500 KB)' };
  const value = {
    kind: body.kind,
    title: body.title.trim(),
    bodyMd: body.bodyMd,
    style: optionalText(body.style, 50),
    model: optionalText(body.model, 200),
    aiSettings: parseSettings(body.aiSettings),
    sources: parseSources(body.sources),
  };
  const bad = Object.entries(value).find(([, v]) => v === undefined);
  return bad ? { error: `invalid ${bad[0]}` } : { value };
}

// A design id: lower-case letters, digits and dashes. The client knows the designs.
const isDesignId = (value) => typeof value === 'string' && /^[a-z0-9-]{1,40}$/.test(value);

// Each editable field: its check and the message when the check fails.
const EDIT_FIELDS = {
  title: [titleOk, `title must be 1–${LIMITS.title} characters`],
  bodyMd: [(v) => isText(v, LIMITS.body), 'bodyMd must be text (at most 500 KB)'],
  template: [isDesignId, 'template must be a design id'],
};

function editProblem(body) {
  const given = Object.keys(EDIT_FIELDS).filter((key) => body[key] !== undefined);
  if (given.length === 0) return 'nothing to change';
  const bad = given.find((key) => !EDIT_FIELDS[key][0](body[key]));
  return bad ? EDIT_FIELDS[bad][1] : null;
}

/** An edit: { title?, bodyMd?, template? }, at least one of them. */
export function parseEdit(body = {}) {
  const error = editProblem(body);
  if (error) return { error };
  return { value: { title: body.title?.trim(), bodyMd: body.bodyMd, template: body.template } };
}
