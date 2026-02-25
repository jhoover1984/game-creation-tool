/**
 * Keyboard shortcut tests -- UI-HOTKEY-001
 * Verifies S/P/E tool switch + cursor, Ctrl+Z/Y/Shift+Z undo/redo,
 * Space playtest step, and form-element guard (no shortcuts when typing in inputs).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EditorShellController } from './editor-shell-controller.js';

// ---------------------------------------------------------------------------
// Keydown target mock -- captures the handler so tests can fire key events
// ---------------------------------------------------------------------------

type KeydownTarget = {
  addEventListener(type: string, fn: (e: Event) => void): void;
  removeEventListener(type?: string, fn?: (e: Event) => void): void;
  fire(key: string, opts?: Partial<{ ctrlKey: boolean; shiftKey: boolean; altKey: boolean; metaKey: boolean; target: unknown }>): void;
};

function makeKeydownTarget(): KeydownTarget {
  const handlers: Record<string, ((e: Event) => void)[]> = {};
  const t: KeydownTarget = {
    addEventListener(type: string, fn: (e: Event) => void) {
      if (!handlers[type]) handlers[type] = [];
      handlers[type].push(fn);
    },
    removeEventListener() { /* no-op for mock */ },
    fire(key: string, opts: Partial<{ ctrlKey: boolean; shiftKey: boolean; altKey: boolean; metaKey: boolean; target: unknown }> = {}) {
      const evt = {
        key,
        ctrlKey: opts.ctrlKey ?? false,
        shiftKey: opts.shiftKey ?? false,
        altKey: opts.altKey ?? false,
        metaKey: opts.metaKey ?? false,
        target: opts.target ?? null,
        preventDefault() { /* no-op */ },
      };
      for (const fn of handlers['keydown'] ?? []) {
        fn(evt as unknown as Event);
      }
    },
  };
  return t;
}

// ---------------------------------------------------------------------------
// Minimal shell elements for hotkey tests
// ---------------------------------------------------------------------------

function makeToolSelect(initialValue = 'select') {
  const el = { value: initialValue, _fn: (() => undefined) as () => void };
  return Object.assign(el, {
    addEventListener(_type: string, fn: () => void) { el._fn = fn; },
    triggerChange() { el._fn(); },
  });
}

function makeShellElements(keydownTarget: KeydownTarget, extra: Record<string, unknown> = {}) {
  const canvas = {
    style: { cursor: '' },
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 320, height: 240 }),
    getContext: () => ({
      clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
      strokeRect() {}, fillRect() {}, fillText() {}, strokeStyle: '#000',
      lineWidth: 1, fillStyle: '#000', font: '10px monospace',
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
    keydownTarget,
    tasksContainer: makeContainer(),
    inspectorContainer: makeContainer(),
    consoleContainer: makeContainer(),
    status: { textContent: '' },
    ...extra,
  };
}

// ---------------------------------------------------------------------------
// Tests: tool switches
// ---------------------------------------------------------------------------

test('UI-HOTKEY-001: S key switches to select tool and sets cursor to default', () => {
  const kdt = makeKeydownTarget();
  const toolSelect = makeToolSelect('paint');
  const elements = makeShellElements(kdt, { toolSelect });
  new EditorShellController(elements as never);

  kdt.fire('s');

  assert.equal(toolSelect.value, 'select', 'toolSelect should switch to select');
  assert.equal((elements.canvas.style as { cursor: string }).cursor, 'default', 'cursor should be default for select');
});

test('UI-HOTKEY-001: P key switches to paint tool and sets cursor to crosshair', () => {
  const kdt = makeKeydownTarget();
  const toolSelect = makeToolSelect('select');
  const elements = makeShellElements(kdt, { toolSelect });
  new EditorShellController(elements as never);

  kdt.fire('p');

  assert.equal(toolSelect.value, 'paint', 'toolSelect should switch to paint');
  assert.equal((elements.canvas.style as { cursor: string }).cursor, 'crosshair', 'cursor should be crosshair for paint');
});

test('UI-HOTKEY-001: E key switches to erase tool and sets cursor to crosshair', () => {
  const kdt = makeKeydownTarget();
  const toolSelect = makeToolSelect('select');
  const elements = makeShellElements(kdt, { toolSelect });
  new EditorShellController(elements as never);

  kdt.fire('e');

  assert.equal(toolSelect.value, 'erase', 'toolSelect should switch to erase');
  assert.equal((elements.canvas.style as { cursor: string }).cursor, 'crosshair', 'cursor should be crosshair for erase');
});

test('UI-HOTKEY-001: uppercase S/P/E work the same as lowercase', () => {
  const kdt = makeKeydownTarget();
  const toolSelect = makeToolSelect('select');
  const elements = makeShellElements(kdt, { toolSelect });
  new EditorShellController(elements as never);

  kdt.fire('P'); // uppercase
  assert.equal(toolSelect.value, 'paint');
  kdt.fire('E'); // uppercase
  assert.equal(toolSelect.value, 'erase');
  kdt.fire('S'); // uppercase
  assert.equal(toolSelect.value, 'select');
});

// ---------------------------------------------------------------------------
// Tests: undo / redo
// ---------------------------------------------------------------------------

test('UI-HOTKEY-001: Ctrl+Z triggers undo', () => {
  const kdt = makeKeydownTarget();
  const elements = makeShellElements(kdt);
  const shell = new EditorShellController(elements as never);

  shell.app.createEntity('Hero', 0, 0);
  assert.ok(shell.app.canUndo(), 'canUndo should be true after entity create');

  kdt.fire('z', { ctrlKey: true });

  assert.ok(!shell.app.canUndo(), 'canUndo should be false after Ctrl+Z');
});

test('UI-HOTKEY-001: Ctrl+Y triggers redo', () => {
  const kdt = makeKeydownTarget();
  const elements = makeShellElements(kdt);
  const shell = new EditorShellController(elements as never);

  shell.app.createEntity('Hero', 0, 0);
  kdt.fire('z', { ctrlKey: true }); // undo
  assert.ok(shell.app.canRedo(), 'canRedo should be true after undo');

  kdt.fire('y', { ctrlKey: true }); // redo

  assert.ok(!shell.app.canRedo(), 'canRedo should be false after Ctrl+Y');
});

test('UI-HOTKEY-001: Ctrl+Shift+Z triggers redo', () => {
  const kdt = makeKeydownTarget();
  const elements = makeShellElements(kdt);
  const shell = new EditorShellController(elements as never);

  shell.app.createEntity('Hero', 0, 0);
  kdt.fire('z', { ctrlKey: true }); // undo
  assert.ok(shell.app.canRedo());

  kdt.fire('z', { ctrlKey: true, shiftKey: true }); // redo via Ctrl+Shift+Z

  assert.ok(!shell.app.canRedo(), 'canRedo should be false after Ctrl+Shift+Z');
});

// ---------------------------------------------------------------------------
// Tests: Space (playtest step)
// ---------------------------------------------------------------------------

test('UI-HOTKEY-001: Space enables pan mode when playtest is stopped (sets cursor to grab)', () => {
  const kdt = makeKeydownTarget();
  const elements = makeShellElements(kdt);
  const shell = new EditorShellController(elements as never);

  // Playtest is stopped by default; Space should enable space-pan mode, not step
  kdt.fire(' ');

  // isSpacePanning is private but its effect is cursor change
  assert.equal(
    (elements.canvas.style as { cursor: string }).cursor,
    'grab',
    'cursor should be grab when Space is held (not in playtest)',
  );
  // Console should NOT change (no step triggered)
  assert.ok(shell.viewport.zoom > 0, 'viewport should still be valid');
});

// ---------------------------------------------------------------------------
// Tests: form element guard
// ---------------------------------------------------------------------------

test('UI-HOTKEY-001: tool hotkeys are no-ops when focus is in an INPUT element', () => {
  const kdt = makeKeydownTarget();
  const toolSelect = makeToolSelect('select');
  const elements = makeShellElements(kdt, { toolSelect });
  new EditorShellController(elements as never);

  // Fire 'p' but with target.tagName === 'INPUT' (simulates typing in a text field)
  kdt.fire('p', { target: { tagName: 'INPUT' } });

  assert.equal(toolSelect.value, 'select', 'tool should not change when hotkey fired from INPUT');
});

test('UI-HOTKEY-001: tool hotkeys are no-ops when focus is in a TEXTAREA', () => {
  const kdt = makeKeydownTarget();
  const toolSelect = makeToolSelect('select');
  const elements = makeShellElements(kdt, { toolSelect });
  new EditorShellController(elements as never);

  kdt.fire('p', { target: { tagName: 'TEXTAREA' } });

  assert.equal(toolSelect.value, 'select', 'tool should not change when hotkey fired from TEXTAREA');
});

test('UI-HOTKEY-001: undo hotkey is a no-op when focus is in a SELECT element', () => {
  const kdt = makeKeydownTarget();
  const elements = makeShellElements(kdt);
  const shell = new EditorShellController(elements as never);

  shell.app.createEntity('Hero', 0, 0);
  assert.ok(shell.app.canUndo());

  kdt.fire('z', { ctrlKey: true, target: { tagName: 'SELECT' } });

  assert.ok(shell.app.canUndo(), 'canUndo should still be true -- Ctrl+Z blocked by SELECT guard');
});
