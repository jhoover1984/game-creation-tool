/**
 * Tab navigation tests -- UI-SHELL-001
 * Verifies tab bar click switching, active state, aria-selected, and initial state.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EditorShellController } from './editor-shell-controller.js';

type MockBtn = {
  dataset: Record<string, string | undefined>;
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  attrs: Record<string, string>;
};

function makeTabBtn(tab: string): MockBtn {
  const attrs: Record<string, string> = { 'aria-selected': 'false', 'data-tab': tab };
  return {
    dataset: { tab },
    attrs,
    getAttribute: (name: string) => attrs[name] ?? null,
    setAttribute: (name: string, value: string) => { attrs[name] = value; },
  };
}

type MockPanel = {
  dataset: Record<string, string | undefined>;
  classList: { classes: Set<string>; add(c: string): void; remove(c: string): void; contains(c: string): boolean };
};

function makeTabPanel(tab: string, activeInitially = false): MockPanel {
  const classes = new Set<string>(activeInitially ? ['tab', 'tab--active'] : ['tab']);
  return {
    dataset: { tab },
    classList: {
      classes,
      add: (c: string) => classes.add(c),
      remove: (c: string) => classes.delete(c),
      contains: (c: string) => classes.has(c),
    },
  };
}

const TAB_NAMES = ['tasks', 'console', 'story', 'onboarding', 'behavior', 'sprite', 'effects', 'export', 'animation'];

function makeTabFixture() {
  const btns = TAB_NAMES.map(makeTabBtn);
  const panels = TAB_NAMES.map((t, i) => makeTabPanel(t, i === 0));
  // Use a ref so tests can inspect and fire the handler captured by addEventListener
  const handlerRef: { current: ((e: Event) => void) | null } = { current: null };

  const tabBar = {
    addEventListener: (_type: string, fn: (e: Event) => void) => { handlerRef.current = fn; },
    removeEventListener: () => undefined,
    querySelectorAll: (sel: string) => {
      if (sel === '[data-tab]') return btns;
      return [];
    },
  };

  const bottomTabs = {
    querySelectorAll: (sel: string) => {
      if (sel === '.tab[data-tab]') return panels;
      return [];
    },
  };

  const shellRoot = {
    getAttribute: () => null,
    setAttribute: () => undefined,
    querySelector: (sel: string) => {
      if (sel === '.bottom-tabs') return bottomTabs;
      return null;
    },
  };

  // Simulate click on a named tab button
  const click = (tab: string) => {
    const btn = btns.find((b) => b.dataset['tab'] === tab);
    if (!btn || !handlerRef.current) return;
    const evt = { target: { closest: (s: string) => s === '[data-tab]' ? btn : null } };
    handlerRef.current(evt as unknown as Event);
  };

  // Simulate click where closest() returns null (outside any button)
  const clickOutside = () => {
    if (!handlerRef.current) return;
    const evt = { target: { closest: () => null } };
    handlerRef.current(evt as unknown as Event);
  };

  return { btns, panels, tabBar, shellRoot, click, clickOutside };
}

function makeMinimalShellElements(tabBar: unknown, shellRoot: unknown) {
  const canvas = {
    style: { cursor: '' },
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 320, height: 240 }),
    getContext: () => ({
      clearRect() {},
      beginPath() {},
      moveTo() {},
      lineTo() {},
      stroke() {},
      strokeRect() {},
      fillRect() {},
      fillText() {},
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
  new EditorShellController(elements as never);

  const tasksPanel = panels.find((p) => p.dataset['tab'] === 'tasks')!;
  const behaviorPanel = panels.find((p) => p.dataset['tab'] === 'behavior')!;
  assert.ok(tasksPanel.classList.contains('tab--active'), 'tasks panel should be active');
  assert.ok(!behaviorPanel.classList.contains('tab--active'), 'behavior panel should be hidden');
});

test('UI-SHELL-001: clicking behavior tab activates behavior panel, deactivates others', () => {
  const { panels, tabBar, shellRoot, click } = makeTabFixture();
  const elements = makeMinimalShellElements(tabBar, shellRoot);
  new EditorShellController(elements as never);

  click('behavior');

  const behaviorPanel = panels.find((p) => p.dataset['tab'] === 'behavior')!;
  const tasksPanel = panels.find((p) => p.dataset['tab'] === 'tasks')!;
  assert.ok(behaviorPanel.classList.contains('tab--active'), 'behavior panel should be active');
  assert.ok(!tasksPanel.classList.contains('tab--active'), 'tasks panel should be hidden');
});

test('UI-SHELL-001: only one tab panel is active at a time', () => {
  const { panels, tabBar, shellRoot, click } = makeTabFixture();
  const elements = makeMinimalShellElements(tabBar, shellRoot);
  new EditorShellController(elements as never);

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
  new EditorShellController(elements as never);

  click('sprite');

  const spriteBtn = btns.find((b) => b.dataset['tab'] === 'sprite')!;
  const tasksBtn = btns.find((b) => b.dataset['tab'] === 'tasks')!;
  assert.equal(spriteBtn.attrs['aria-selected'], 'true', 'sprite button aria-selected should be true');
  assert.equal(tasksBtn.attrs['aria-selected'], 'false', 'tasks button aria-selected should be false');
});

test('UI-SHELL-001: clicking outside a tab button is a no-op', () => {
  const { panels, tabBar, shellRoot, clickOutside } = makeTabFixture();
  const elements = makeMinimalShellElements(tabBar, shellRoot);
  new EditorShellController(elements as never);

  const activesBefore = panels.filter((p) => p.classList.contains('tab--active')).length;
  clickOutside();
  const activesAfter = panels.filter((p) => p.classList.contains('tab--active')).length;
  assert.equal(activesBefore, activesAfter, 'panel count should not change on outside click');
  assert.equal(activesAfter, 1, 'exactly one panel should still be active');
});
