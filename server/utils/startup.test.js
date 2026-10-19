import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appUrl, listenFailure, readyMessage } from './startup.js';

test('appUrl shows localhost for loopback and all-interfaces hosts', () => {
  assert.equal(appUrl('127.0.0.1', 3001), 'http://localhost:3001');
  assert.equal(appUrl('0.0.0.0', 4317), 'http://localhost:4317');
  assert.equal(appUrl('192.168.1.5', 3001), 'http://192.168.1.5:3001');
});

test('readyMessage points at the address that serves the app', () => {
  const url = 'http://localhost:3001';
  assert.match(readyMessage({ url, dev: true, built: false }), /Open the app at http:\/\/localhost:5173$/);
  assert.equal(readyMessage({ url, dev: false, built: true }), 'Atlas Pulse is running. Open http://localhost:3001');
  assert.match(readyMessage({ url, dev: false, built: false }), /no built app to serve.*npm start/);
});

test('listenFailure names a taken port and how to get past it', () => {
  const message = listenFailure(Object.assign(new Error('listen EADDRINUSE'), { code: 'EADDRINUSE' }), 3001);
  assert.match(message, /Port 3001 is already in use/);
  assert.match(message, /lsof -i :3001/);
  assert.match(message, /PORT=3002 npm run dev/);
  assert.match(listenFailure(Object.assign(new Error('x'), { code: 'EACCES' }), 80), /isn't allowed to use port 80/);
  assert.equal(listenFailure(new Error('boom'), 3001), "Atlas Pulse couldn't start: boom");
});
