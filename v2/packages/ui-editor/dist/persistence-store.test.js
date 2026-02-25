import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPersistenceStore } from './persistence-store.js';
class FakeStorage {
    map = new Map();
    get length() {
        return this.map.size;
    }
    getItem(key) {
        return this.map.get(key) ?? null;
    }
    setItem(key, value) {
        this.map.set(key, value);
    }
    removeItem(key) {
        this.map.delete(key);
    }
    key(index) {
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
        if (k.startsWith('gcs-v2-backup-'))
            backupCount++;
    }
    assert.ok(backupCount <= 5);
});
//# sourceMappingURL=persistence-store.test.js.map