import { Document, Paragraph, TextRun, HeadingLevel, Packer, AlignmentType } from 'docx';

function parseInline(text) {
  const runs = [];
  const pattern = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let last = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) runs.push(new TextRun({ text: text.slice(last, match.index) }));
    if (match[2]) runs.push(new TextRun({ text: match[2], bold: true }));
    else if (match[3]) runs.push(new TextRun({ text: match[3], italics: true }));
    last = match.index + match[0].length;
  }
  if (last < text.length) runs.push(new TextRun({ text: text.slice(last) }));
  return runs.length ? runs : [new TextRun({ text })];
}

const HORIZONTAL_RULE = { bottom: { color: '999999', size: 6, space: 1, style: 'single' } };

// Markdown line types, checked in order; the first match wins.
const LINE_RULES = [
  { kind: 'blank', test: (t) => !t, build: () => new Paragraph({}) },
  { kind: 'h3', test: (t) => t.startsWith('### '), build: (t) => new Paragraph({ text: t.slice(4), heading: HeadingLevel.HEADING_3 }) },
  { kind: 'h2', test: (t) => t.startsWith('## '), build: (t) => new Paragraph({ text: t.slice(3), heading: HeadingLevel.HEADING_2 }) },
  { kind: 'h1', test: (t) => t.startsWith('# '), build: (t) => new Paragraph({ text: t.slice(2), heading: HeadingLevel.HEADING_1 }) },
  { kind: 'bullet', test: (t) => /^(\*|-) /.test(t), build: (t) => new Paragraph({ children: parseInline(t.slice(2)), bullet: { level: 0 } }) },
  {
    kind: 'numbered',
    test: (t) => /^\d+\. /.test(t),
    build: (t) => new Paragraph({ children: parseInline(t.replace(/^\d+\. /, '')), numbering: { reference: 'default', level: 0 } }),
  },
  { kind: 'rule', test: (t) => /^---+$/.test(t), build: () => new Paragraph({ border: HORIZONTAL_RULE }) },
  { kind: 'text', test: () => true, build: (t) => new Paragraph({ children: parseInline(t) }) },
];

const ruleFor = (line) => LINE_RULES.find((rule) => rule.test(line.trimEnd()));

/** The markdown type of one line, e.g. 'h2', 'bullet' or 'text'. */
export function markdownLineKind(line) {
  return ruleFor(line).kind;
}

function markdownToDocxChildren(markdown) {
  return markdown.split('\n').map((line) => ruleFor(line).build(line.trimEnd()));
}

function downloadBlob(blob, filename, extension) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.replace(/[^a-z0-9\-_]/gi, '_').toLowerCase() + extension;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadAsDocx(filename, markdownText) {
  const doc = new Document({
    numbering: {
      config: [{ reference: 'default', levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.LEFT }] }],
    },
    sections: [{ properties: {}, children: markdownToDocxChildren(markdownText) }],
  });
  downloadBlob(await Packer.toBlob(doc), filename, '.docx');
}

export function downloadAsMarkdown(filename, text) {
  downloadBlob(new Blob([text], { type: 'text/markdown' }), filename, '.md');
}
