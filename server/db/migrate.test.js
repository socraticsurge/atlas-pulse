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
    const fresh = new Database(':memory:');
    migrate(fresh, migrations);
    const schemaSql = fresh.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all();

    // Simulate a database created by v1.4.0 (tables present, user_version 0).
    const legacy = new Database(':memory:');
    for (const { sql } of schemaSql) legacy.exec(sql);
    const [table] = schemaSql.map(({ sql }) => sql.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/)[1]);
    const before = legacy.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;

    assert.deepEqual(migrate(legacy, migrations), [1]);
    assert.equal(getSchemaVersion(legacy), migrations.length);
    assert.equal(legacy.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n, before);
  }
});
