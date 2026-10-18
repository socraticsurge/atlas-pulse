import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planBoot } from './sync.js';

const local = (entries) => (key) => entries[key] ?? null;

test('the server wins once it has settings; only differing values are copied', () => {
  const plan = planBoot(
    { 'atlas-pulse-theme': 'light', 'atlas-pulse-font': 'plex' },
    local({ 'atlas-pulse-theme': 'dark', 'atlas-pulse-font': 'plex' }),
  );
  assert.deepEqual(plan, { toLocal: { 'atlas-pulse-theme': 'light' }, toServer: {} });
});

test('an empty server file is seeded from this browser', () => {
  const plan = planBoot({}, local({ 'atlas-pulse-theme': 'dark', 'atlas-pulse-sidebar-width': '300' }));
  assert.deepEqual(plan, { toLocal: {}, toServer: { 'atlas-pulse-theme': 'dark' } });
});

test('unknown keys in the file are ignored', () => {
  const plan = planBoot({ 'something-else': 'x' }, local({}));
  assert.deepEqual(plan, { toLocal: {}, toServer: {} });
});
