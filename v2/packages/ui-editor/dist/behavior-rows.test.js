/**
 * Tests for BEHAV-ROW-001: Behavior row authoring (CRUD + undo/redo + entity delete parity).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CommandBus, ProjectStore } from '@gcs/runtime-web';
import { renderBehaviorPanel } from './behavior-panel.js';
function setup() {
    const bus = new CommandBus();
    const store = new ProjectStore(bus);
    store.createProject('Test', 10, 10, 16);
    // Create an entity to attach behaviors to
    bus.dispatch({ type: 'entity:create', payload: { name: 'Player', x: 0, y: 0 } });
    const entityId = store.entities[0].id;
    return { bus, store, entityId };
}
function makeRow(overrides = {}) {
    return {
        id: `row-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        label: 'Test Row',
        enabled: true,
        trigger: { type: 'on:tick' },
        conditions: [{ id: 'c1', type: 'always', target: { type: 'this' } }],
        actions: [{ id: 'a1', type: 'log', target: { type: 'this' }, params: {} }],
        ...overrides,
    };
}
test('BEHAV-ROW-001: dispatch behavior:row:add stores row', () => {
    const { bus, store, entityId } = setup();
    const row = makeRow({ label: 'OnTick Log' });
    bus.dispatch({ type: 'behavior:row:add', payload: { entityId, row } });
    assert.equal(store.getBehaviors(entityId).length, 1);
    assert.equal(store.getBehaviors(entityId)[0].label, 'OnTick Log');
});
test('BEHAV-ROW-001: dispatch behavior:row:remove removes row', () => {
    const { bus, store, entityId } = setup();
    const row = makeRow();
    bus.dispatch({ type: 'behavior:row:add', payload: { entityId, row } });
    bus.dispatch({ type: 'behavior:row:remove', payload: { entityId, rowId: row.id } });
    assert.equal(store.getBehaviors(entityId).length, 0);
});
test('BEHAV-ROW-001: dispatch behavior:row:update patches label', () => {
    const { bus, store, entityId } = setup();
    const row = makeRow({ label: 'Old' });
    bus.dispatch({ type: 'behavior:row:add', payload: { entityId, row } });
    bus.dispatch({ type: 'behavior:row:update', payload: { entityId, rowId: row.id, patch: { label: 'New' } } });
    assert.equal(store.getBehaviors(entityId)[0].label, 'New');
});
test('BEHAV-ROW-001: undo behavior:row:add removes row', () => {
    const { bus, store, entityId } = setup();
    const row = makeRow();
    bus.dispatch({ type: 'behavior:row:add', payload: { entityId, row } });
    assert.equal(store.getBehaviors(entityId).length, 1);
    store.undo();
    assert.equal(store.getBehaviors(entityId).length, 0);
});
test('BEHAV-ROW-001: redo behavior:row:add restores row', () => {
    const { bus, store, entityId } = setup();
    const row = makeRow({ label: 'Redoable' });
    bus.dispatch({ type: 'behavior:row:add', payload: { entityId, row } });
    store.undo();
    assert.equal(store.getBehaviors(entityId).length, 0);
    store.redo();
    assert.equal(store.getBehaviors(entityId).length, 1);
    assert.equal(store.getBehaviors(entityId)[0].label, 'Redoable');
});
test('BEHAV-ROW-001: undo behavior:row:update restores before snapshot', () => {
    const { bus, store, entityId } = setup();
    const row = makeRow({ label: 'Before' });
    bus.dispatch({ type: 'behavior:row:add', payload: { entityId, row } });
    bus.dispatch({ type: 'behavior:row:update', payload: { entityId, rowId: row.id, patch: { label: 'After' } } });
    store.undo();
    assert.equal(store.getBehaviors(entityId)[0].label, 'Before');
});
test('BEHAV-ROW-001: entity:delete cleans up behaviors', () => {
    const { bus, store, entityId } = setup();
    bus.dispatch({ type: 'behavior:row:add', payload: { entityId, row: makeRow() } });
    bus.dispatch({ type: 'entity:delete', payload: { entityId } });
    assert.equal(store.getBehaviors(entityId).length, 0);
    assert.equal(store.entities.length, 0);
});
test('BEHAV-ROW-001: undo entity:delete restores entity AND its behaviors', () => {
    const { bus, store, entityId } = setup();
    const row = makeRow({ label: 'Preserved' });
    bus.dispatch({ type: 'behavior:row:add', payload: { entityId, row } });
    bus.dispatch({ type: 'entity:delete', payload: { entityId } });
    store.undo(); // undo delete
    store.undo(); // undo row add
    store.redo(); // redo row add
    store.redo(); // redo delete... actually let's just test undo of delete
    // Reset and redo just the delete undo
    const bus2 = new CommandBus();
    const store2 = new ProjectStore(bus2);
    store2.createProject('Test', 10, 10, 16);
    bus2.dispatch({ type: 'entity:create', payload: { name: 'Ent', x: 0, y: 0 } });
    const eid = store2.entities[0].id;
    const r = makeRow({ label: 'Kept' });
    bus2.dispatch({ type: 'behavior:row:add', payload: { entityId: eid, row: r } });
    bus2.dispatch({ type: 'entity:delete', payload: { entityId: eid } });
    assert.equal(store2.entities.length, 0);
    store2.undo();
    assert.equal(store2.entities.length, 1);
    assert.equal(store2.getBehaviors(eid).length, 1);
    assert.equal(store2.getBehaviors(eid)[0].label, 'Kept');
});
test('BEHAV-ROW-001: rendered panel HTML includes row label and Add Row button', () => {
    const { bus, store, entityId } = setup();
    const row = makeRow({ label: 'MyBehavior' });
    bus.dispatch({ type: 'behavior:row:add', payload: { entityId, row } });
    const rows = store.getBehaviors(entityId);
    const html = renderBehaviorPanel(entityId, rows, 'edit', []);
    assert.ok(html.includes('MyBehavior'));
    assert.ok(html.includes('behavior:row:add'));
    assert.ok(!html.includes('<script>'));
});
//# sourceMappingURL=behavior-rows.test.js.map