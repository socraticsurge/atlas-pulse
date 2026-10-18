import { test } from 'node:test';
import assert from 'node:assert/strict';
import { markdownLineKind } from './docx.js';

test('markdownLineKind classifies lines in the documented order', () => {
  const cases = {
    '': 'blank', '   ': 'blank',
    '# Title': 'h1', '## Section': 'h2', '### Sub': 'h3', '#### Deeper': 'text',
    '- item': 'bullet', '* item': 'bullet', '*emphasis*': 'text',
    '1. first': 'numbered', '12. twelfth': 'numbered',
    '---': 'rule', '-----': 'rule', '--- not a rule': 'text',
    'Plain **bold** text': 'text',
  };
  for (const [line, kind] of Object.entries(cases)) assert.equal(markdownLineKind(line), kind, JSON.stringify(line));
});
