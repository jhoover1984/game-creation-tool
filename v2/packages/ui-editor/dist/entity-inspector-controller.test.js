import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EntityInspectorController } from './entity-inspector-controller.js';
function makeEntity(overrides = {}) {
    return {
        id: 'ent-1',
        name: 'Hero',
        position: { x: 10, y: 20 },
        size: { w: 16, h: 16 },
        solid: false,
        tags: [],
        ...overrides,
    };
}
/**
 * Minimal DOM container mock.
 * `fields` maps data-path strings to { value?, checked? }.
 */
function makeContainer(fields) {
    let clickListener = null;
    const container = {
        innerHTML: '',
        addEventListener(_type, fn) {
            clickListener = fn;
        },
        removeEventListener(_type, _fn) {
            clickListener = null;
        },
        querySelector(selector) {
            const match = selector.match(/data-path="([^"]+)"/);
            if (!match)
                return null;
            const path = match[1];
            const field = fields[path];
            if (!field)
                return null;
            return { value: field.value ?? '', checked: field.checked ?? false };
        },
        /** Simulate clicking the Apply button (target with the action attribute). */
        fireApply() {
            if (!clickListener)
                return;
            const target = {
                getAttribute(attr) {
                    return attr === 'data-action' ? 'apply-entity-inspector' : null;
                },
            };
            clickListener({ target });
        },
        /** Simulate clicking an element that does NOT have the action attribute. */
        fireOther() {
            if (!clickListener)
                return;
            const target = {
                getAttribute(_attr) {
                    return null;
                },
            };
            clickListener({ target });
        },
    };
    return container;
}
function makeApp(entity = null) {
    const renameCalls = [];
    const moveCalls = [];
    const speedCalls = [];
    return {
        renameCalls,
        moveCalls,
        speedCalls,
        getSelectedEntity() {
            return entity;
        },
        moveEntity(entityId, x, y) {
            moveCalls.push({ entityId, x, y });
        },
        renameEntity(entityId, name) {
            renameCalls.push({ entityId, name });
        },
        updateEntityVisual(_entityId, _visual) {
            return true;
        },
        setEntitySpeed(entityId, speed) {
            speedCalls.push({ entityId, speed });
            return true;
        },
    };
}
test('EntityInspectorController: Apply dispatches renameEntity when name changed', () => {
    const entity = makeEntity({ name: 'Hero' });
    const app = makeApp(entity);
    const container = makeContainer({
        name: { value: 'Villain' },
        'position.x': { value: '10' },
        'position.y': { value: '20' },
        solid: { checked: false },
        spriteId: { value: '' },
        animationClipId: { value: '' },
    });
    new EntityInspectorController(app, container);
    container.fireApply();
    assert.equal(app.renameCalls.length, 1, 'renameEntity should have been called once');
    assert.equal(app.renameCalls[0].entityId, 'ent-1');
    assert.equal(app.renameCalls[0].name, 'Villain');
});
test('EntityInspectorController: Apply does NOT call renameEntity when name is unchanged', () => {
    const entity = makeEntity({ name: 'Hero' });
    const app = makeApp(entity);
    const container = makeContainer({
        name: { value: 'Hero' },
        'position.x': { value: '10' },
        'position.y': { value: '20' },
        solid: { checked: false },
        spriteId: { value: '' },
        animationClipId: { value: '' },
    });
    new EntityInspectorController(app, container);
    container.fireApply();
    assert.equal(app.renameCalls.length, 0, 'renameEntity should not be called when name is unchanged');
});
test('EntityInspectorController: Apply does NOT call renameEntity when name is empty', () => {
    const entity = makeEntity({ name: 'Hero' });
    const app = makeApp(entity);
    const container = makeContainer({
        name: { value: '' },
        'position.x': { value: '10' },
        'position.y': { value: '20' },
        solid: { checked: false },
        spriteId: { value: '' },
        animationClipId: { value: '' },
    });
    new EntityInspectorController(app, container);
    container.fireApply();
    assert.equal(app.renameCalls.length, 0, 'renameEntity should not be called when name is empty');
});
test('EntityInspectorController: click on non-Apply element does nothing', () => {
    const entity = makeEntity();
    const app = makeApp(entity);
    const container = makeContainer({
        name: { value: 'X' },
        'position.x': { value: '0' },
        'position.y': { value: '0' },
        solid: { checked: false },
        spriteId: { value: '' },
        animationClipId: { value: '' },
    });
    new EntityInspectorController(app, container);
    container.fireOther();
    assert.equal(app.renameCalls.length, 0);
    assert.equal(app.moveCalls.length, 0);
});
test('EntityInspectorController: dispose removes click listener', () => {
    const entity = makeEntity();
    const app = makeApp(entity);
    const container = makeContainer({
        name: { value: 'Different' },
        'position.x': { value: '0' },
        'position.y': { value: '0' },
        solid: { checked: false },
        spriteId: { value: '' },
        animationClipId: { value: '' },
    });
    const ctrl = new EntityInspectorController(app, container);
    ctrl.dispose();
    container.fireApply();
    assert.equal(app.renameCalls.length, 0, 'no calls after dispose');
});
test('EntityInspectorController: player entity renders Player Config section with default speed 120', () => {
    const entity = makeEntity({ tags: ['player'] });
    const app = makeApp(entity);
    const container = makeContainer({});
    new EntityInspectorController(app, container);
    const html = container.innerHTML;
    assert.ok(html.includes('Player Config'), 'should render Player Config section');
    assert.ok(html.includes('data-path="speed"'), 'should render speed input');
    assert.ok(html.includes('value="120"'), 'should default speed to 120');
});
test('EntityInspectorController: player entity with explicit speed renders that value', () => {
    const entity = makeEntity({ tags: ['player'], speed: 200 });
    const app = makeApp(entity);
    const container = makeContainer({});
    new EntityInspectorController(app, container);
    const html = container.innerHTML;
    assert.ok(html.includes('value="200"'), 'should show persisted speed value');
});
test('EntityInspectorController: non-player entity does not render Player Config section', () => {
    const entity = makeEntity({ tags: [] });
    const app = makeApp(entity);
    const container = makeContainer({});
    new EntityInspectorController(app, container);
    const html = container.innerHTML;
    assert.ok(!html.includes('Player Config'), 'should not render Player Config for non-player');
    assert.ok(!html.includes('data-path="speed"'), 'should not render speed input for non-player');
});
test('EntityInspectorController: Apply on player entity calls setEntitySpeed with parsed value', () => {
    const entity = makeEntity({ tags: ['player'] });
    const app = makeApp(entity);
    const container = makeContainer({
        name: { value: 'Player' },
        'position.x': { value: '0' },
        'position.y': { value: '0' },
        solid: { checked: true },
        spriteId: { value: '' },
        animationClipId: { value: '' },
        speed: { value: '240' },
    });
    new EntityInspectorController(app, container);
    container.fireApply();
    assert.equal(app.speedCalls.length, 1, 'setEntitySpeed should be called once');
    assert.equal(app.speedCalls[0].entityId, 'ent-1');
    assert.equal(app.speedCalls[0].speed, 240);
});
test('EntityInspectorController: Apply on non-player entity does not call setEntitySpeed', () => {
    const entity = makeEntity({ tags: [] });
    const app = makeApp(entity);
    const container = makeContainer({
        name: { value: 'Wall' },
        'position.x': { value: '0' },
        'position.y': { value: '0' },
        solid: { checked: true },
        spriteId: { value: '' },
        animationClipId: { value: '' },
    });
    new EntityInspectorController(app, container);
    container.fireApply();
    assert.equal(app.speedCalls.length, 0, 'setEntitySpeed should not be called for non-player');
});
// D-007 verification: Apply dispatches moveEntity with updated coordinates.
// This confirms the inspector wiring works correctly; D-007 is a discoverability issue, not a bug.
test('D-007: EntityInspectorController: Apply dispatches moveEntity with updated position', () => {
    const entity = makeEntity({ position: { x: 10, y: 20 } });
    const app = makeApp(entity);
    const container = makeContainer({
        name: { value: 'Hero' },
        'position.x': { value: '50' },
        'position.y': { value: '80' },
        solid: { checked: false },
        spriteId: { value: '' },
        animationClipId: { value: '' },
    });
    new EntityInspectorController(app, container);
    container.fireApply();
    assert.equal(app.moveCalls.length, 1, 'moveEntity should be called once on Apply');
    assert.equal(app.moveCalls[0].entityId, 'ent-1');
    assert.equal(app.moveCalls[0].x, 50);
    assert.equal(app.moveCalls[0].y, 80);
});
//# sourceMappingURL=entity-inspector-controller.test.js.map