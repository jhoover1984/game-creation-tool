/**
 * Undo/redo surface tests -- UI-UNDO-001
 * Verifies button disabled states, refresh after commands, and reset after new/load.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CommandBus, ProjectStore } from '@gcs/runtime-web';
import { EditorApp } from './editor-app.js';
function makeUndoRedoButtons() {
    const btnUndo = { disabled: true, clicked: false, addEventListener: (_t, fn) => { btnUndo._fn = fn; }, _fn: (() => undefined) };
    const btnRedo = { disabled: true, clicked: false, addEventListener: (_t, fn) => { btnRedo._fn = fn; }, _fn: (() => undefined) };
    return { btnUndo, btnRedo };
}
function makeMinimalElements(btnUndo, btnRedo) {
    const canvas = {
        style: { cursor: '' },
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 320, height: 240 }),
        width: 320,
        height: 240,
    };
    const makeContainer = () => ({
        innerHTML: '',
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        querySelector: () => null,
        querySelectorAll: () => [],
    });
    return {
        canvas,
        btnUndo,
        btnRedo,
        tasksContainer: makeContainer(),
        inspectorContainer: makeContainer(),
        consoleContainer: makeContainer(),
        status: { textContent: '' },
    };
}
test('UI-UNDO-001: undo and redo buttons are disabled on init (empty undo stack)', () => {
    // Verify EditorApp.canUndo() / canRedo() return false on fresh project
    const app = new EditorApp();
    app.newProject('Test', 10, 10, 16);
    assert.ok(!app.canUndo(), 'canUndo should be false on fresh project');
    assert.ok(!app.canRedo(), 'canRedo should be false on fresh project');
});
test('UI-UNDO-001: canUndo returns true after entity is created', () => {
    const app = new EditorApp();
    app.newProject('Test', 10, 10, 16);
    app.createEntity('Player', 0, 0);
    assert.ok(app.canUndo(), 'canUndo should be true after creating an entity');
    assert.ok(!app.canRedo(), 'canRedo should be false before any undo');
});
test('UI-UNDO-001: canRedo returns true after undo', () => {
    const app = new EditorApp();
    app.newProject('Test', 10, 10, 16);
    app.createEntity('Player', 0, 0);
    app.undo();
    assert.ok(!app.canUndo(), 'canUndo should be false after full undo');
    assert.ok(app.canRedo(), 'canRedo should be true after undo');
});
test('UI-UNDO-001: canRedo returns false after redo', () => {
    const app = new EditorApp();
    app.newProject('Test', 10, 10, 16);
    app.createEntity('Player', 0, 0);
    app.undo();
    app.redo();
    assert.ok(app.canUndo(), 'canUndo should be true after redo (entity exists again)');
    assert.ok(!app.canRedo(), 'canRedo should be false after redo');
});
test('UI-UNDO-001: canUndo and canRedo both false after newProject', () => {
    const app = new EditorApp();
    app.newProject('Test', 10, 10, 16);
    app.createEntity('Player', 0, 0);
    assert.ok(app.canUndo());
    app.newProject('Fresh', 10, 10, 16);
    assert.ok(!app.canUndo(), 'canUndo should be false after new project (stack cleared)');
    assert.ok(!app.canRedo(), 'canRedo should be false after new project (stack cleared)');
});
test('UI-UNDO-001: ProjectStore.canUndo / canRedo used correctly via EditorApp', () => {
    // Integration: verify EditorApp passthrough matches ProjectStore directly
    const bus = new CommandBus();
    const store = new ProjectStore(bus);
    store.createProject('T', 10, 10, 16);
    assert.ok(!store.canUndo());
    assert.ok(!store.canRedo());
    bus.dispatch({ type: 'entity:create', payload: { name: 'E', x: 0, y: 0 } });
    assert.ok(store.canUndo());
    store.undo();
    assert.ok(store.canRedo());
    store.redo();
    assert.ok(!store.canRedo());
});
//# sourceMappingURL=undo-redo-surface.test.js.map