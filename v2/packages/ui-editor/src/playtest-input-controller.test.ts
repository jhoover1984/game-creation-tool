import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PlaytestInputController } from './playtest-input-controller.js';

function makeTarget() {
  const handlers = new Map<string, Array<(e: Event) => void>>();
  return {
    addEventListener(type: string, fn: (e: Event) => void) {
      const list = handlers.get(type) ?? [];
      list.push(fn);
      handlers.set(type, list);
    },
    removeEventListener(type: string, fn: (e: Event) => void) {
      const list = handlers.get(type) ?? [];
      handlers.set(type, list.filter((h) => h !== fn));
    },
    fire(type: string, key: string) {
      const evt = {
        key,
        preventDefault() {},
      } as unknown as Event;
      for (const fn of handlers.get(type) ?? []) fn(evt);
    },
  };
}

test('playtest input controller maps arrow key movement while running', () => {
  const target = makeTarget();
  let running = true;
  const controller = new PlaytestInputController({
    target,
    isRunning: () => running,
  });

  target.fire('keydown', 'ArrowRight');
  assert.deepEqual(controller.getInput(), { moveX: 1, moveY: 0 });
  target.fire('keydown', 'ArrowUp');
  assert.deepEqual(controller.getInput(), { moveX: 1, moveY: -1 });
  target.fire('keyup', 'ArrowRight');
  assert.deepEqual(controller.getInput(), { moveX: 0, moveY: -1 });
  target.fire('keyup', 'ArrowUp');
  assert.deepEqual(controller.getInput(), { moveX: 0, moveY: 0 });

  running = false;
  target.fire('keydown', 'ArrowLeft');
  assert.deepEqual(controller.getInput(), { moveX: 0, moveY: 0 });
  controller.dispose();
});

test('playtest input controller reset clears held movement', () => {
  const target = makeTarget();
  const controller = new PlaytestInputController({
    target,
    isRunning: () => true,
  });

  target.fire('keydown', 'a');
  target.fire('keydown', 'w');
  assert.deepEqual(controller.getInput(), { moveX: -1, moveY: -1 });
  controller.reset();
  assert.deepEqual(controller.getInput(), { moveX: 0, moveY: 0 });
  controller.dispose();
});
