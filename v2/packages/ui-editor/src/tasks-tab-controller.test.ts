import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { EditorTask } from '@gcs/contracts';
import { TasksTabController, type TasksTabAppAdapter } from './tasks-tab-controller.js';

type ClickListener = (event: Event) => void;

class FakeContainer {
  innerHTML = '';
  private listeners: ClickListener[] = [];

  addEventListener(type: string, listener: ClickListener): void {
    if (type === 'click') this.listeners.push(listener);
  }

  removeEventListener(type: string, listener: ClickListener): void {
    if (type !== 'click') return;
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  emitClick(taskId?: string): void {
    const event = {
      target: taskId ? { dataset: { taskId } } : {},
    } as unknown as Event;
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

function makeTask(id: string, fix = false): EditorTask {
  return {
    id,
    diagnosticId: `diag:${id}`,
    severity: 'warning',
    label: `Task ${id}`,
    fixAction: fix ? { label: 'Fix', deterministic: true } : undefined,
  };
}

test('TasksTabController renders tasks on init', () => {
  const tasks = [makeTask('one')];
  const app: TasksTabAppAdapter = {
    getTasks: () => tasks,
    applyFix: () => false,
  };
  const container = new FakeContainer() as unknown as HTMLElement;

  new TasksTabController(app, container);
  assert.match((container as unknown as FakeContainer).innerHTML, /Task one/);
});

test('TasksTabController applies fix by task id and refreshes', () => {
  const tasks = [makeTask('one', true)];
  let applyCount = 0;
  const app: TasksTabAppAdapter = {
    getTasks: () => tasks,
    applyFix: () => {
      applyCount += 1;
      tasks.length = 0;
      return true;
    },
  };
  const container = new FakeContainer() as unknown as HTMLElement;
  const controller = new TasksTabController(app, container);

  (container as unknown as FakeContainer).emitClick('one');
  assert.equal(applyCount, 1);
  assert.match((container as unknown as FakeContainer).innerHTML, /No diagnostics/);
  controller.dispose();
});

test('TasksTabController ignores unknown task id', () => {
  const tasks = [makeTask('one', true)];
  let applyCount = 0;
  const app: TasksTabAppAdapter = {
    getTasks: () => tasks,
    applyFix: () => {
      applyCount += 1;
      return true;
    },
  };
  const container = new FakeContainer() as unknown as HTMLElement;
  const controller = new TasksTabController(app, container);

  (container as unknown as FakeContainer).emitClick('missing');
  assert.equal(applyCount, 0);
  controller.dispose();
});

test('TasksTabController stops handling clicks after dispose', () => {
  const tasks = [makeTask('one', true)];
  let applyCount = 0;
  const app: TasksTabAppAdapter = {
    getTasks: () => tasks,
    applyFix: () => {
      applyCount += 1;
      return true;
    },
  };
  const container = new FakeContainer() as unknown as HTMLElement;
  const controller = new TasksTabController(app, container);
  controller.dispose();

  (container as unknown as FakeContainer).emitClick('one');
  assert.equal(applyCount, 0);
});

