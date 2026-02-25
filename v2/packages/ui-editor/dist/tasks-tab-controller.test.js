import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TasksTabController } from './tasks-tab-controller.js';
class FakeContainer {
    innerHTML = '';
    listeners = [];
    addEventListener(type, listener) {
        if (type === 'click')
            this.listeners.push(listener);
    }
    removeEventListener(type, listener) {
        if (type !== 'click')
            return;
        this.listeners = this.listeners.filter((l) => l !== listener);
    }
    emitClick(taskId) {
        const event = {
            target: taskId ? { dataset: { taskId } } : {},
        };
        for (const listener of this.listeners) {
            listener(event);
        }
    }
}
function makeTask(id, fix = false) {
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
    const app = {
        getTasks: () => tasks,
        applyFix: () => false,
    };
    const container = new FakeContainer();
    new TasksTabController(app, container);
    assert.match(container.innerHTML, /Task one/);
});
test('TasksTabController applies fix by task id and refreshes', () => {
    const tasks = [makeTask('one', true)];
    let applyCount = 0;
    const app = {
        getTasks: () => tasks,
        applyFix: () => {
            applyCount += 1;
            tasks.length = 0;
            return true;
        },
    };
    const container = new FakeContainer();
    const controller = new TasksTabController(app, container);
    container.emitClick('one');
    assert.equal(applyCount, 1);
    assert.match(container.innerHTML, /No diagnostics/);
    controller.dispose();
});
test('TasksTabController ignores unknown task id', () => {
    const tasks = [makeTask('one', true)];
    let applyCount = 0;
    const app = {
        getTasks: () => tasks,
        applyFix: () => {
            applyCount += 1;
            return true;
        },
    };
    const container = new FakeContainer();
    const controller = new TasksTabController(app, container);
    container.emitClick('missing');
    assert.equal(applyCount, 0);
    controller.dispose();
});
test('TasksTabController stops handling clicks after dispose', () => {
    const tasks = [makeTask('one', true)];
    let applyCount = 0;
    const app = {
        getTasks: () => tasks,
        applyFix: () => {
            applyCount += 1;
            return true;
        },
    };
    const container = new FakeContainer();
    const controller = new TasksTabController(app, container);
    controller.dispose();
    container.emitClick('one');
    assert.equal(applyCount, 0);
});
//# sourceMappingURL=tasks-tab-controller.test.js.map