/**
 * Context menu controller tests -- UI-CTX-001
 * Verifies show/hide, item visibility by selection state, action callbacks,
 * click-away dismissal, and Escape dismissal.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ContextMenuController } from './context-menu-controller.js';
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeMenuElement() {
    const attrs = { hidden: '' };
    const style = {};
    const clickListeners = [];
    const itemDelete = makeMenuItem('ctx-delete');
    const itemDeselect = makeMenuItem('ctx-deselect');
    const itemProperties = makeMenuItem('ctx-properties');
    const items = [itemDelete, itemDeselect, itemProperties];
    const menu = {
        attrs,
        style,
        getAttribute: (n) => attrs[n] ?? null,
        setAttribute: (n, v) => { attrs[n] = v; },
        removeAttribute: (n) => { delete attrs[n]; },
        hasAttribute: (n) => n in attrs,
        contains: (node) => items.some((i) => i === node),
        addEventListener: (type, fn) => {
            if (type === 'click')
                clickListeners.push(fn);
        },
        querySelector: (sel) => {
            const action = sel.match(/\[data-action="([^"]+)"\]/)?.[1];
            if (action === 'ctx-delete')
                return itemDelete;
            if (action === 'ctx-deselect')
                return itemDeselect;
            if (action === 'ctx-properties')
                return itemProperties;
            return null;
        },
        fireClick(target) {
            clickListeners.forEach((fn) => fn({ target }));
        },
    };
    return { menu, itemDelete, itemDeselect, itemProperties };
}
function makeMenuItem(action) {
    const attrs = {};
    return {
        action,
        attrs,
        getAttribute: (n) => (n === 'data-action' ? action : attrs[n] ?? null),
        setAttribute: (n, v) => { attrs[n] = v; },
        removeAttribute: (n) => { delete attrs[n]; },
        hasAttribute: (n) => n in attrs,
        closest: (sel) => sel === '[data-action]' ? { getAttribute: (n) => n === 'data-action' ? action : null } : null,
    };
}
function makeGlobalTarget() {
    const t = {
        listeners: {},
        addEventListener(type, fn) {
            (t.listeners[type] ??= []).push(fn);
        },
        removeEventListener(type, fn) {
            t.listeners[type] = (t.listeners[type] ?? []).filter((f) => f !== fn);
        },
        fire(type, key) {
            const evt = key
                ? { key, target: null }
                : { target: null };
            (t.listeners[type] ?? []).forEach((fn) => fn(evt));
        },
    };
    return t;
}
function makeCallbacks(selectedId = null) {
    const calls = { delete: 0, deselect: 0, focusInspector: 0 };
    return {
        calls,
        callbacks: {
            getSelectedEntityId: () => selectedId,
            deleteSelected: () => { calls.delete++; },
            deselectAll: () => { calls.deselect++; },
            focusInspector: () => { calls.focusInspector++; },
        },
    };
}
// ---------------------------------------------------------------------------
// Tests: show / hide / isOpen
// ---------------------------------------------------------------------------
test('UI-CTX-001: show removes hidden attribute and sets position', () => {
    const { menu } = makeMenuElement();
    const { callbacks } = makeCallbacks();
    const ctrl = new ContextMenuController(menu, callbacks);
    ctrl.show(50, 80);
    assert.ok(!menu.hasAttribute('hidden'), 'menu should not have hidden attribute after show');
    assert.equal(menu.style.left, '50px');
    assert.equal(menu.style.top, '80px');
    assert.ok(ctrl.isOpen);
});
test('UI-CTX-001: hide sets hidden attribute and closes menu', () => {
    const { menu } = makeMenuElement();
    const { callbacks } = makeCallbacks();
    const ctrl = new ContextMenuController(menu, callbacks);
    ctrl.show(10, 10);
    ctrl.hide();
    assert.ok(menu.hasAttribute('hidden'), 'menu should have hidden attribute after hide');
    assert.ok(!ctrl.isOpen);
});
test('UI-CTX-001: hide is a no-op when menu is already closed', () => {
    const { menu } = makeMenuElement();
    const { callbacks } = makeCallbacks();
    const ctrl = new ContextMenuController(menu, callbacks);
    // Should not throw
    ctrl.hide();
    assert.ok(!ctrl.isOpen);
});
// ---------------------------------------------------------------------------
// Tests: item visibility based on selection state
// ---------------------------------------------------------------------------
test('UI-CTX-001: Delete and Deselect items are visible when entity is selected', () => {
    const { menu, itemDelete, itemDeselect } = makeMenuElement();
    const { callbacks } = makeCallbacks('entity-1');
    const ctrl = new ContextMenuController(menu, callbacks);
    ctrl.show(0, 0);
    assert.ok(!itemDelete.hasAttribute('hidden'), 'Delete should be visible when entity selected');
    assert.ok(!itemDeselect.hasAttribute('hidden'), 'Deselect should be visible when entity selected');
});
test('UI-CTX-001: Delete and Deselect items are hidden when no entity is selected', () => {
    const { menu, itemDelete, itemDeselect } = makeMenuElement();
    const { callbacks } = makeCallbacks(null);
    const ctrl = new ContextMenuController(menu, callbacks);
    ctrl.show(0, 0);
    assert.ok(itemDelete.hasAttribute('hidden'), 'Delete should be hidden when no entity selected');
    assert.ok(itemDeselect.hasAttribute('hidden'), 'Deselect should be hidden when no entity selected');
});
// ---------------------------------------------------------------------------
// Tests: action callbacks
// ---------------------------------------------------------------------------
test('UI-CTX-001: clicking ctx-delete calls deleteSelected and closes menu', () => {
    const { menu, itemDelete } = makeMenuElement();
    const { callbacks, calls } = makeCallbacks('entity-1');
    const ctrl = new ContextMenuController(menu, callbacks);
    ctrl.show(0, 0);
    menu.fireClick(itemDelete);
    assert.equal(calls.delete, 1, 'deleteSelected should be called once');
    assert.ok(!ctrl.isOpen, 'menu should close after delete');
});
test('UI-CTX-001: clicking ctx-deselect calls deselectAll and closes menu', () => {
    const { menu, itemDeselect } = makeMenuElement();
    const { callbacks, calls } = makeCallbacks('entity-1');
    const ctrl = new ContextMenuController(menu, callbacks);
    ctrl.show(0, 0);
    menu.fireClick(itemDeselect);
    assert.equal(calls.deselect, 1, 'deselectAll should be called once');
    assert.ok(!ctrl.isOpen);
});
test('UI-CTX-001: clicking ctx-properties calls focusInspector and closes menu', () => {
    const { menu, itemProperties } = makeMenuElement();
    const { callbacks, calls } = makeCallbacks(null);
    const ctrl = new ContextMenuController(menu, callbacks);
    ctrl.show(0, 0);
    menu.fireClick(itemProperties);
    assert.equal(calls.focusInspector, 1, 'focusInspector should be called once');
    assert.ok(!ctrl.isOpen);
});
// ---------------------------------------------------------------------------
// Tests: dismissal
// ---------------------------------------------------------------------------
test('UI-CTX-001: click-away closes the menu', () => {
    const { menu } = makeMenuElement();
    const { callbacks } = makeCallbacks();
    const globalTarget = makeGlobalTarget();
    const ctrl = new ContextMenuController(menu, callbacks, globalTarget);
    ctrl.show(0, 0);
    assert.ok(ctrl.isOpen);
    // Fire click on an element outside the menu
    globalTarget.fire('click');
    assert.ok(!ctrl.isOpen, 'click-away should close the menu');
});
test('UI-CTX-001: Escape key closes the menu', () => {
    const { menu } = makeMenuElement();
    const { callbacks } = makeCallbacks();
    const globalTarget = makeGlobalTarget();
    const ctrl = new ContextMenuController(menu, callbacks, globalTarget);
    ctrl.show(0, 0);
    globalTarget.fire('keydown', 'Escape');
    assert.ok(!ctrl.isOpen, 'Escape should close the menu');
});
test('UI-CTX-001: non-Escape keydown does not close the menu', () => {
    const { menu } = makeMenuElement();
    const { callbacks } = makeCallbacks();
    const globalTarget = makeGlobalTarget();
    const ctrl = new ContextMenuController(menu, callbacks, globalTarget);
    ctrl.show(0, 0);
    globalTarget.fire('keydown', 'Enter');
    assert.ok(ctrl.isOpen, 'Enter keydown should not close the menu');
});
test('UI-CTX-001: global listeners are removed after hide', () => {
    const { menu } = makeMenuElement();
    const { callbacks } = makeCallbacks();
    const globalTarget = makeGlobalTarget();
    const ctrl = new ContextMenuController(menu, callbacks, globalTarget);
    ctrl.show(0, 0);
    ctrl.hide();
    const clickCount = globalTarget.listeners['click']?.length ?? 0;
    const keydownCount = globalTarget.listeners['keydown']?.length ?? 0;
    assert.equal(clickCount, 0, 'click listener should be removed after hide');
    assert.equal(keydownCount, 0, 'keydown listener should be removed after hide');
});
//# sourceMappingURL=context-menu.test.js.map