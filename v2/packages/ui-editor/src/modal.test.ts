/**
 * Modal controller tests -- UI-SHELL-002
 * Verifies show/hide, callbacks, aria-hidden, focus management, and keyboard handling.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ModalController } from './modal-controller.js';

type FocusableEl = {
  focus: () => void;
  wasFocused: boolean;
  dataset?: Record<string, string>;
  hasAttribute?: (name: string) => boolean;
  disabled?: boolean;
};

function makeFocusable(): FocusableEl {
  const el: FocusableEl = { focus: () => { el.wasFocused = true; }, wasFocused: false };
  return el;
}

function makeButton(id: string) {
  const listeners: Record<string, ((e: Event) => void)[]> = {};
  const el = {
    id,
    style: { display: '' },
    wasFocused: false,
    disabled: false,
    textContent: '',
    dataset: {} as Record<string, string>,
    hasAttribute: (name: string) => name === 'disabled' ? el.disabled : false,
    focus: () => { el.wasFocused = true; },
    addEventListener: (type: string, fn: (e: Event) => void) => {
      listeners[type] = listeners[type] ?? [];
      listeners[type].push(fn);
    },
    click: () => { listeners['click']?.forEach((fn) => fn({} as Event)); },
  };
  return el;
}

function makeOverlay() {
  const attrs: Record<string, string> = { 'aria-hidden': 'true' };
  const keydownListeners: ((e: KeyboardEvent) => void)[] = [];
  const titleEl = { textContent: '' };
  const messageEl = { textContent: '' };
  const btnConfirm = makeButton('modal-confirm');
  const btnCancel = makeButton('modal-cancel');

  const idMap: Record<string, unknown> = {
    'modal-title': titleEl,
    'modal-message': messageEl,
    'modal-confirm': btnConfirm,
    'modal-cancel': btnCancel,
  };

  const focusable = [btnCancel, btnConfirm];

  const overlay = {
    attrs,
    getAttribute: (name: string) => attrs[name] ?? null,
    setAttribute: (name: string, value: string) => { attrs[name] = value; },
    querySelector: (sel: string) => {
      const id = sel.replace('#', '');
      return idMap[id] ?? null;
    },
    querySelectorAll: (sel: string) => {
      if (sel.includes('button')) return focusable.filter((el) => !el.disabled);
      return [];
    },
    addEventListener: (type: string, fn: (e: KeyboardEvent) => void) => {
      if (type === 'keydown') keydownListeners.push(fn);
    },
    fireKeydown: (key: string, opts: Partial<KeyboardEvent> = {}) => {
      const evt = { key, preventDefault: () => undefined, shiftKey: false, ...opts } as KeyboardEvent;
      keydownListeners.forEach((fn) => fn(evt));
    },
  };

  return { overlay, titleEl, messageEl, btnConfirm, btnCancel };
}

test('UI-SHELL-002: showConfirm sets title, message, opens modal', () => {
  const { overlay, titleEl, messageEl } = makeOverlay();
  const modal = new ModalController(overlay as never);

  modal.showConfirm('My Title', 'My message', () => undefined);

  assert.equal(titleEl.textContent, 'My Title');
  assert.equal(messageEl.textContent, 'My message');
  assert.equal(overlay.attrs['aria-hidden'], 'false');
  assert.ok(modal.isOpen);
});

test('UI-SHELL-002: isOpen reflects open/closed state', () => {
  const { overlay } = makeOverlay();
  const modal = new ModalController(overlay as never);

  assert.ok(!modal.isOpen);
  modal.showConfirm('T', 'M', () => undefined);
  assert.ok(modal.isOpen);
  modal.hide();
  assert.ok(!modal.isOpen);
});

test('UI-SHELL-002: onConfirm called when confirm button clicked', () => {
  const { overlay, btnConfirm } = makeOverlay();
  const modal = new ModalController(overlay as never);

  let confirmed = false;
  modal.showConfirm('T', 'M', () => { confirmed = true; });
  btnConfirm.click();

  assert.ok(confirmed, 'onConfirm should be called');
  assert.ok(!modal.isOpen, 'modal should close after confirm');
});

test('UI-SHELL-002: onCancel called when cancel button clicked', () => {
  const { overlay, btnCancel } = makeOverlay();
  const modal = new ModalController(overlay as never);

  let cancelled = false;
  modal.showConfirm('T', 'M', () => undefined, () => { cancelled = true; });
  btnCancel.click();

  assert.ok(cancelled, 'onCancel should be called');
  assert.ok(!modal.isOpen, 'modal should close after cancel');
});

test('UI-SHELL-002: Escape key cancels modal and calls onCancel', () => {
  const { overlay } = makeOverlay();
  const modal = new ModalController(overlay as never);

  let cancelled = false;
  modal.showConfirm('T', 'M', () => undefined, () => { cancelled = true; });
  overlay.fireKeydown('Escape');

  assert.ok(cancelled, 'Escape should call onCancel');
  assert.ok(!modal.isOpen);
});

test('UI-SHELL-002: Enter key confirms modal', () => {
  const { overlay } = makeOverlay();
  const modal = new ModalController(overlay as never);

  let confirmed = false;
  modal.showConfirm('T', 'M', () => { confirmed = true; });
  overlay.fireKeydown('Enter');

  assert.ok(confirmed, 'Enter should call onConfirm');
});

test('UI-SHELL-002: aria-hidden toggled on open and close', () => {
  const { overlay } = makeOverlay();
  const modal = new ModalController(overlay as never);

  assert.equal(overlay.attrs['aria-hidden'], 'true');
  modal.showConfirm('T', 'M', () => undefined);
  assert.equal(overlay.attrs['aria-hidden'], 'false');
  modal.hide();
  assert.equal(overlay.attrs['aria-hidden'], 'true');
});

test('UI-SHELL-002: showError hides cancel button', () => {
  const { overlay, btnCancel } = makeOverlay();
  const modal = new ModalController(overlay as never);

  modal.showError('Error', 'Something went wrong.');

  assert.equal(btnCancel.style.display, 'none', 'cancel button should be hidden for error modal');
  assert.ok(modal.isOpen);
});

test('UI-SHELL-002: showConfirm restores cancel button visibility after showError', () => {
  const { overlay, btnCancel } = makeOverlay();
  const modal = new ModalController(overlay as never);

  modal.showError('E', 'err');
  modal.hide();
  modal.showConfirm('T', 'M', () => undefined);

  assert.equal(btnCancel.style.display, '', 'cancel button should be visible for confirm modal');
});

test('UI-SHELL-002: confirm button is focused on open', () => {
  const { overlay, btnConfirm } = makeOverlay();
  const modal = new ModalController(overlay as never);

  modal.showConfirm('T', 'M', () => undefined);

  assert.ok(btnConfirm.wasFocused, 'confirm button should receive focus on open');
});

test('UI-SHELL-002: hide is a no-op when modal is already closed', () => {
  const { overlay } = makeOverlay();
  const modal = new ModalController(overlay as never);

  // Should not throw
  modal.hide();
  assert.ok(!modal.isOpen);
});
