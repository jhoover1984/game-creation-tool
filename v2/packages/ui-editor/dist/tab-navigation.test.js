/**
 * Tab navigation tests -- UI-SHELL-001
 * Verifies tab bar click switching, active state, aria-selected, and initial state.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EditorShellController } from './editor-shell-controller.js';
function makeTabBtn(tab) {
    const attrs = { 'aria-selected': 'false', 'data-tab': tab };
    return {
        dataset: { tab },
        attrs,
        getAttribute: (name) => attrs[name] ?? null,
        setAttribute: (name, value) => { attrs[name] = value; },
    };
}
function makeTabPanel(tab, activeInitially = false) {
    const classes = new Set(activeInitially ? ['tab', 'tab--active'] : ['tab']);
    return {
        dataset: { tab },
        classList: {
            classes,
            add: (c) => classes.add(c),
            remove: (c) => classes.delete(c),
            contains: (c) => classes.has(c),
        },
    };
}
const TAB_NAMES = ['tasks', 'console', 'story', 'onboarding', 'behavior', 'sprite', 'effects', 'export', 'animation'];
function makeTabFixture() {
    const btns = TAB_NAMES.map(makeTabBtn);
    const panels = TAB_NAMES.map((t, i) => makeTabPanel(t, i === 0));
    // Use a ref so tests can inspect and fire the handler captured by addEventListener
    const handlerRef = { current: null };
    const tabBar = {
        addEventListener: (_type, fn) => { handlerRef.current = fn; },
        removeEventListener: () => undefined,
        querySelectorAll: (sel) => {
            if (sel === '[data-tab]')
                return btns;
            return [];
        },
    };
    const bottomTabs = {
        querySelectorAll: (sel) => {
            if (sel === '.tab[data-tab]')
                return panels;
            return [];
        },
    };
    const shellRoot = {
        getAttribute: () => null,
        setAttribute: () => undefined,
        querySelector: (sel) => {
            if (sel === '.bottom-tabs')
                return bottomTabs;
            return null;
        },
    };
    // Simulate click on a named tab button
    const click = (tab) => {
        const btn = btns.find((b) => b.dataset['tab'] === tab);
        if (!btn || !handlerRef.current)
            return;
        const evt = { target: { closest: (s) => s === '[data-tab]' ? btn : null } };
        handlerRef.current(evt);
    };
    // Simulate click where closest() returns null (outside any button)
    const clickOutside = () => {
        if (!handlerRef.current)
            return;
        const evt = { target: { closest: () => null } };
        handlerRef.current(evt);
    };
    return { btns, panels, tabBar, shellRoot, click, clickOutside };
}
function makeMinimalShellElements(tabBar, shellRoot) {
    const canvas = {
        style: { cursor: '' },
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 320, height: 240 }),
        getContext: () => ({
            clearRect() { },
            beginPath() { },
            moveTo() { },
            lineTo() { },
            stroke() { },
            strokeRect() { },
            fillRect() { },
            fillText() { },
            strokeStyle: '#000',
            lineWidth: 1,
            fillStyle: '#000',
            font: '10px monospace',
        }),
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
        tabBar,
        shellRoot,
        tasksContainer: makeContainer(),
        inspectorContainer: makeContainer(),
        consoleContainer: makeContainer(),
        status: { textContent: '' },
    };
}
test('UI-SHELL-001: initial tab is tasks -- tasks panel active, others hidden', () => {
    const { panels, tabBar, shellRoot } = makeTabFixture();
    const elements = makeMinimalShellElements(tabBar, shellRoot);
    new EditorShellController(elements);
    const tasksPanel = panels.find((p) => p.dataset['tab'] === 'tasks');
    const behaviorPanel = panels.find((p) => p.dataset['tab'] === 'behavior');
    assert.ok(tasksPanel.classList.contains('tab--active'), 'tasks panel should be active');
    assert.ok(!behaviorPanel.classList.contains('tab--active'), 'behavior panel should be hidden');
});
test('UI-SHELL-001: clicking behavior tab activates behavior panel, deactivates others', () => {
    const { panels, tabBar, shellRoot, click } = makeTabFixture();
    const elements = makeMinimalShellElements(tabBar, shellRoot);
    new EditorShellController(elements);
    click('behavior');
    const behaviorPanel = panels.find((p) => p.dataset['tab'] === 'behavior');
    const tasksPanel = panels.find((p) => p.dataset['tab'] === 'tasks');
    assert.ok(behaviorPanel.classList.contains('tab--active'), 'behavior panel should be active');
    assert.ok(!tasksPanel.classList.contains('tab--active'), 'tasks panel should be hidden');
});
test('UI-SHELL-001: only one tab panel is active at a time', () => {
    const { panels, tabBar, shellRoot, click } = makeTabFixture();
    const elements = makeMinimalShellElements(tabBar, shellRoot);
    new EditorShellController(elements);
    for (const tab of ['sprite', 'animation', 'effects', 'console']) {
        click(tab);
        const active = panels.filter((p) => p.classList.contains('tab--active'));
        assert.equal(active.length, 1, `exactly one panel should be active after clicking ${tab}`);
        assert.equal(active[0].dataset['tab'], tab, `active panel should be ${tab}`);
    }
});
test('UI-SHELL-001: aria-selected set to true on active tab button, false on others', () => {
    const { btns, tabBar, shellRoot, click } = makeTabFixture();
    const elements = makeMinimalShellElements(tabBar, shellRoot);
    new EditorShellController(elements);
    click('sprite');
    const spriteBtn = btns.find((b) => b.dataset['tab'] === 'sprite');
    const tasksBtn = btns.find((b) => b.dataset['tab'] === 'tasks');
    assert.equal(spriteBtn.attrs['aria-selected'], 'true', 'sprite button aria-selected should be true');
    assert.equal(tasksBtn.attrs['aria-selected'], 'false', 'tasks button aria-selected should be false');
});
test('UI-SHELL-001: clicking outside a tab button is a no-op', () => {
    const { panels, tabBar, shellRoot, clickOutside } = makeTabFixture();
    const elements = makeMinimalShellElements(tabBar, shellRoot);
    new EditorShellController(elements);
    const activesBefore = panels.filter((p) => p.classList.contains('tab--active')).length;
    clickOutside();
    const activesAfter = panels.filter((p) => p.classList.contains('tab--active')).length;
    assert.equal(activesBefore, activesAfter, 'panel count should not change on outside click');
    assert.equal(activesAfter, 1, 'exactly one panel should still be active');
});
//# sourceMappingURL=tab-navigation.test.js.map