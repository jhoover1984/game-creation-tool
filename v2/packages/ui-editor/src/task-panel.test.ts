import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { EditorTask } from '@gcs/contracts';
import { applyTaskFixById, renderTasksPanel } from './task-panel.js';

test('renderTasksPanel shows empty state when no tasks exist', () => {
  const html = renderTasksPanel([]);
  assert.equal(html, '<p class="empty-state">No diagnostics. Your project looks clean.</p>');
});

test('renderTasksPanel renders severity, label, and fix button when fix exists', () => {
  const tasks: EditorTask[] = [
    {
      id: 'task:1',
      diagnosticId: 'diag:1',
      severity: 'warning',
      category: 'topology',
      label: 'Connect unreachable node',
      fixAction: { label: 'Fix', deterministic: false },
    },
  ];

  const html = renderTasksPanel(tasks);
  assert.ok(html.includes('Warning'));
  assert.ok(html.includes('[Topology]'));
  assert.ok(html.includes('Connect unreachable node'));
  assert.ok(html.includes('data-task-id="task:1"'));
  assert.ok(html.includes('<button data-task-id="task:1">Fix</button>'));
});

test('renderTasksPanel escapes labels to prevent HTML injection', () => {
  const tasks: EditorTask[] = [
    {
      id: 'task:2',
      diagnosticId: 'diag:2',
      severity: 'error',
      label: '<script>alert(1)</script>',
    },
  ];

  const html = renderTasksPanel(tasks);
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
});

test('applyTaskFixById returns false when task does not exist', () => {
  const applied = applyTaskFixById([], 'missing', () => true);
  assert.equal(applied, false);
});

test('applyTaskFixById passes matching task to applyFix callback', () => {
  const tasks: EditorTask[] = [
    {
      id: 'task:ok',
      diagnosticId: 'diag:ok',
      severity: 'info',
      label: 'No-op',
    },
  ];

  let receivedId = '';
  const applied = applyTaskFixById(tasks, 'task:ok', (task) => {
    receivedId = task.id;
    return true;
  });

  assert.equal(applied, true);
  assert.equal(receivedId, 'task:ok');
});
