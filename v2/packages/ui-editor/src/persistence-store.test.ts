import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPersistenceStore } from './persistence-store.js';

class FakeStorage {
  private readonly map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }
}

test('persistence store saves and loads current project', () => {
  const storage = new FakeStorage();
  const persistence = createPersistenceStore(storage);
  persistence.saveProject('{"id":"p1"}');
  assert.equal(persistence.loadProject(), '{"id":"p1"}');
});

test('persistence store falls back to latest backup when current missing', () => {
  const storage = new FakeStorage();
  const persistence = createPersistenceStore(storage);
  persistence.saveProject('{"id":"v1"}');
  persistence.saveProject('{"id":"v2"}');
  storage.removeItem('gcs-v2-project');
  assert.equal(persistence.loadProject(), '{"id":"v1"}');
});

test('persistence store prunes old backups', () => {
  const storage = new FakeStorage();
  const persistence = createPersistenceStore(storage);
  for (let i = 0; i < 8; i++) {
    persistence.saveProject(`{"id":"v${i}"}`);
  }

  let backupCount = 0;
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i) ?? '';
    if (k.startsWith('gcs-v2-backup-')) backupCount++;
  }
  assert.ok(backupCount <= 5);
});
