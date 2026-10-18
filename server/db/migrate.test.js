import { test } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { migrate, getSchemaVersion, validateMigrations } from './migrate.js';
import { MIGRATIONS as READER } from './migrations/reader.js';
import { MIGRATIONS as SUMMARIES } from './migrations/summaries.js';
import { MIGRATIONS as HIGHLIGHTS } from './migrations/highlights.js';

const createNotes = { version: 1, up: (db) => db.exec('CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT)') };
const addTitle = { version: 2, up: (db) => db.exec('ALTER TABLE notes ADD COLUMN title TEXT') };

test('applies pending migrations in order and records the version', () => {
  const db = new Database(':memory:');
  assert.deepEqual(migrate(db, [createNotes, addTitle]), [1, 2]);
  assert.equal(getSchemaVersion(db), 2);
  db.prepare('INSERT INTO notes (body, title) VALUES (?, ?)').run('b', 't');
});

test('runs each migration only once', () => {
  const db = new Database(':memory:');
  migrate(db, [createNotes]);
  assert.deepEqual(migrate(db, [createNotes, addTitle]), [2]);
  assert.deepEqual(migrate(db, [createNotes, addTitle]), []);
});

test('rolls back a failing migration and keeps the last good version', () => {
  const db = new Database(':memory:');
  const broken = {
    version: 2,
    up: (d) => { d.exec('ALTER TABLE notes ADD COLUMN title TEXT'); d.exec('NOT VALID SQL'); },
  };
  assert.throws(() => migrate(db, [createNotes, broken]));
  assert.equal(getSchemaVersion(db), 1);
  const columns = db.prepare('PRAGMA table_info(notes)').all().map((c) => c.name);
  assert.deepEqual(columns, ['id', 'body'], 'partial changes were rolled back');
});

test('rejects gaps or missing up() functions', () => {
  assert.throws(() => validateMigrations([createNotes, { version: 3, up: () => {} }]), /consecutive/);
  assert.throws(() => validateMigrations([{ version: 1 }]), /up\(\)/);
});

test('app schemas adopt an existing pre-migration database without data loss', () => {
  for (const migrations of [READER, SUMMARIES, HIGHLIGHTS]) {
    // A database created before migrations existed: the v1 schema with user_version 0.
    const legacy = new Database(':memory:');
    migrations[0].up(legacy);
    const [{ name: table }] = legacy.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all();
    const before = legacy.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;

    assert.deepEqual(migrate(legacy, migrations), migrations.map((m) => m.version));
    assert.equal(getSchemaVersion(legacy), migrations.length);
    assert.equal(legacy.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n, before);
  }
});

test('reader migration 2 backfills plain-text excerpts for existing articles', () => {
  const db = new Database(':memory:');
  migrate(db, READER.slice(0, 1));
  db.prepare("INSERT INTO feeds (title, url, created_at) VALUES ('F', 'https://f.example/rss', 'now')").run();
  const insert = db.prepare(
    "INSERT INTO articles (feed_id, guid, summary, content, created_at) VALUES (1, ?, ?, ?, 'now')"
  );
  insert.run('a', '<p>Short &amp; <b>sweet</b></p>', '<p>ignored when summary exists</p>');
  insert.run('b', null, `<div>${'long '.repeat(200)}</div>`);
  insert.run('c', null, null);

  migrate(db, READER);
  const excerpts = db.prepare('SELECT guid, excerpt FROM articles ORDER BY guid').all();
  assert.equal(excerpts[0].excerpt, 'Short & sweet');
  assert.equal(excerpts[1].excerpt.length, 300);
  assert.equal(excerpts[2].excerpt, '');
});

test('reader migration 4 adds the favicon cache and points Google favicon URLs at the local route', () => {
  const db = new Database(':memory:');
  migrate(db, READER.slice(0, 3));
  const insert = db.prepare("INSERT INTO feeds (title, url, favicon, created_at) VALUES ('F', ?, ?, 'now')");
  insert.run('https://a.example/rss', 'https://www.google.com/s2/favicons?domain=www.theverge.com&sz=32');
  insert.run('https://b.example/rss', 'https://cdn.example.com/icon.png');
  insert.run('https://c.example/rss', null);

  migrate(db, READER);
  const icons = db.prepare('SELECT favicon FROM feeds ORDER BY id').all().map((r) => r.favicon);
  assert.deepEqual(icons, ['/api/favicon/www.theverge.com', 'https://cdn.example.com/icon.png', null]);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM favicons').get().n, 0);
});

test('reader migration 5 adds the last refresh error to feeds', () => {
  const db = new Database(':memory:');
  migrate(db, READER);
  db.prepare("INSERT INTO feeds (title, url, created_at, last_error, last_error_at) VALUES ('F', 'https://f.example/rss', 'now', 'Bad XML', '2026-10-19')").run();
  assert.deepEqual(db.prepare('SELECT last_error, last_error_at FROM feeds').get(), { last_error: 'Bad XML', last_error_at: '2026-10-19' });
  assert.equal(db.pragma('user_version', { simple: true }), 5);
});
