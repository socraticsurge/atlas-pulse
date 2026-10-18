import { test } from 'node:test';
import assert from 'node:assert/strict';
import { upgradeAppearanceDefaults } from './appearanceUpgrade.js';

const memory = (entries = {}) => {
  const data = new Map(Object.entries(entries));
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), data };
};

test('old defaults move to the Instrument defaults', () => {
  const s = memory({
    'atlas-pulse-font': 'sans',
    'atlas-pulse-color': 'emerald',
    'atlas-pulse-reader-settings': JSON.stringify({ fontFamily: 'sans', fontSize: 18 }),
  });
  upgradeAppearanceDefaults(s);
  assert.equal(s.data.get('atlas-pulse-font'), 'plex');
  assert.equal(s.data.get('atlas-pulse-color'), 'amber');
  assert.deepEqual(JSON.parse(s.data.get('atlas-pulse-reader-settings')), { fontFamily: 'newsreader', fontSize: 18 });
});

test('deliberate choices are kept', () => {
  const s = memory({
    'atlas-pulse-font': 'merriweather',
    'atlas-pulse-color': 'blue',
    'atlas-pulse-reader-settings': JSON.stringify({ fontFamily: 'garamond' }),
  });
  upgradeAppearanceDefaults(s);
  assert.equal(s.data.get('atlas-pulse-font'), 'merriweather');
  assert.equal(s.data.get('atlas-pulse-color'), 'blue');
  assert.equal(JSON.parse(s.data.get('atlas-pulse-reader-settings')).fontFamily, 'garamond');
});

test('runs only once, so a later switch back to Inter sticks', () => {
  const s = memory({ 'atlas-pulse-font': 'sans' });
  upgradeAppearanceDefaults(s);
  s.data.set('atlas-pulse-font', 'sans'); // the user picks Inter again
  upgradeAppearanceDefaults(s);
  assert.equal(s.data.get('atlas-pulse-font'), 'sans');
});

test('a fresh install has nothing to upgrade', () => {
  const s = memory();
  upgradeAppearanceDefaults(s);
  assert.equal(s.data.get('atlas-pulse-font'), undefined);
  assert.equal(s.data.get('atlas-pulse-appearance-version'), '3');
});

test('v3 enlarges reader text still at the old 16px default', () => {
  const s = memory({ 'atlas-pulse-reader-settings': JSON.stringify({ fontFamily: 'garamond', fontSize: 16 }) });
  upgradeAppearanceDefaults(s);
  assert.deepEqual(JSON.parse(s.data.get('atlas-pulse-reader-settings')), { fontFamily: 'garamond', fontSize: 18 });
});

test('from v2, only the v3 step runs, so a chosen Inter stays', () => {
  const s = memory({
    'atlas-pulse-appearance-version': '2',
    'atlas-pulse-font': 'sans',
    'atlas-pulse-reader-settings': JSON.stringify({ fontFamily: 'sans', fontSize: 20 }),
  });
  upgradeAppearanceDefaults(s);
  assert.equal(s.data.get('atlas-pulse-font'), 'sans');
  assert.deepEqual(JSON.parse(s.data.get('atlas-pulse-reader-settings')), { fontFamily: 'sans', fontSize: 20 });
  assert.equal(s.data.get('atlas-pulse-appearance-version'), '3');
});
