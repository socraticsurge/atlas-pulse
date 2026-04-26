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

function markdownToDocxChildren(markdown) {
  const lines = markdown.split('\n');
  const children = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trimEnd();

    if (!trimmed) {
      children.push(new Paragraph({}));
    } else if (trimmed.startsWith('### ')) {
      children.push(new Paragraph({ text: trimmed.slice(4), heading: HeadingLevel.HEADING_3 }));
    } else if (trimmed.startsWith('## ')) {
      children.push(new Paragraph({ text: trimmed.slice(3), heading: HeadingLevel.HEADING_2 }));
    } else if (trimmed.startsWith('# ')) {
      children.push(new Paragraph({ text: trimmed.slice(2), heading: HeadingLevel.HEADING_1 }));
    } else if (/^(\*|-) /.test(trimmed)) {
      children.push(new Paragraph({ children: parseInline(trimmed.slice(2)), bullet: { level: 0 } }));
    } else if (/^\d+\. /.test(trimmed)) {
      const text = trimmed.replace(/^\d+\. /, '');
      children.push(new Paragraph({ children: parseInline(text), numbering: { reference: 'default', level: 0 } }));
    } else if (/^---+$/.test(trimmed)) {
      children.push(new Paragraph({ border: { bottom: { color: '999999', size: 6, space: 1, style: 'single' } } }));
    } else {
      children.push(new Paragraph({ children: parseInline(trimmed) }));
    }
    i++;
  }
  return children;
}

export async function downloadAsDocx(filename, markdownText) {
  const doc = new Document({
    numbering: {
      config: [{ reference: 'default', levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.LEFT }] }],
    },
    sections: [{ properties: {}, children: markdownToDocxChildren(markdownText) }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.replace(/[^a-z0-9\-_]/gi, '_').toLowerCase() + '.docx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadAsMarkdown(filename, text) {
  const blob = new Blob([text], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.replace(/[^a-z0-9\-_]/gi, '_').toLowerCase() + '.md';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
