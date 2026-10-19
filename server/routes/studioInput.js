import { localOrigin } from '../utils/loopback.js';

// Checks Studio requests before they reach the database. Each parser returns
// { value } with only the known fields, or { error } with a message for a 400.

export const STUDIO_KINDS = ['newsletter'];
export const LIMITS = { title: 200, body: 500_000, sources: 50, sourceField: 2_000 };

const isText = (value, max) => typeof value === 'string' && value.length <= max;
// Absent is fine (null); present must be valid, else undefined marks it bad.
function optionalText(value, max) {
  if (value === undefined || value === null) return null;
  return isText(value, max) ? value : undefined;
}

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
const isPlainObject = (v) => typeof v === 'object' && !Array.isArray(v);
function parseSettings(raw) {
  if (raw === undefined || raw === null) return null;
  return isPlainObject(raw) && JSON.stringify(raw).length <= LIMITS.sourceField * 5 ? raw : undefined;
}

const titleOk = (title) => isText(title, LIMITS.title) && title.trim() !== '';

// A new item's required fields: the check and the message when it fails.
const NEW_REQUIRED = [
  ['kind', (v) => STUDIO_KINDS.includes(v), `kind must be one of: ${STUDIO_KINDS.join(', ')}`],
  ['title', titleOk, `title is required (at most ${LIMITS.title} characters)`],
  ['bodyMd', (v) => isText(v, LIMITS.body), 'bodyMd must be text (at most 500 KB)'],
];
// Its optional fields: each parser returns null when absent, undefined when invalid.
const NEW_OPTIONAL = {
  style: (v) => optionalText(v, 50),
  model: (v) => optionalText(v, 200),
  aiSettings: parseSettings,
  sources: parseSources,
};

/** A new item: { kind, title, bodyMd, style?, model?, aiSettings?, sources? }. */
export function parseNewItem(body = {}) {
  const missing = NEW_REQUIRED.find(([key, ok]) => !ok(body[key]));
  if (missing) return { error: missing[2] };
  const optional = Object.fromEntries(Object.entries(NEW_OPTIONAL).map(([key, parse]) => [key, parse(body[key])]));
  const bad = Object.keys(optional).find((key) => optional[key] === undefined);
  if (bad) return { error: `invalid ${bad}` };
  return { value: { kind: body.kind, title: body.title.trim(), bodyMd: body.bodyMd, ...optional } };
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

export const EXPORT_FORMATS = ['png', 'pdf'];

/**
 * An export: { format: 'png' | 'pdf', design?, origin } — origin is where this
 * app is served (the export renders its print page), and must be this machine.
 */
export function parseExport(body = {}) {
  if (!EXPORT_FORMATS.includes(body.format)) return { error: `format must be one of: ${EXPORT_FORMATS.join(', ')}` };
  if (body.design !== undefined && !isDesignId(body.design)) return { error: 'design must be a design id' };
  const origin = localOrigin(body.origin);
  if (!origin) return { error: 'origin must be this app on this machine' };
  return { value: { format: body.format, design: body.design, origin } };
}
