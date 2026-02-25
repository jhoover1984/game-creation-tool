import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DiagnosticStore, resolveFixAction } from './diagnostic-store.js';
import type { Diagnostic, SemanticDiagnostic } from '@gcs/contracts';

test('DiagnosticStore starts empty', () => {
  const store = new DiagnosticStore();
  assert.equal(store.getAll().length, 0);
  assert.equal(store.generateTasks().length, 0);
});

test('add and remove diagnostic', () => {
  const store = new DiagnosticStore();
  const diag: Diagnostic = {
    id: 'test-1',
    code: 'TEST',
    severity: 'warning',
    source: 'editor',
    path: '/test',
    message: 'Test diagnostic',
    actions: [],
  };

  store.add(diag);
  assert.equal(store.getAll().length, 1);
  assert.equal(store.getAll()[0].id, 'test-1');

  store.remove('test-1');
  assert.equal(store.getAll().length, 0);
});

test('clearSource removes only diagnostics from that source', () => {
  const store = new DiagnosticStore();
  store.add({ id: 'd1', code: 'A', severity: 'error', source: 'schema', path: '/', message: 'A', actions: [] });
  store.add({ id: 'd2', code: 'B', severity: 'warning', source: 'semantic', path: '/', message: 'B', actions: [] });
  store.add({ id: 'd3', code: 'C', severity: 'info', source: 'schema', path: '/', message: 'C', actions: [] });

  store.clearSource('schema');
  assert.equal(store.getAll().length, 1);
  assert.equal(store.getAll()[0].id, 'd2');
});

test('clearAll removes everything', () => {
  const store = new DiagnosticStore();
  store.add({ id: 'd1', code: 'A', severity: 'error', source: 'schema', path: '/', message: 'A', actions: [] });
  store.add({ id: 'd2', code: 'B', severity: 'warning', source: 'semantic', path: '/', message: 'B', actions: [] });

  store.clearAll();
  assert.equal(store.getAll().length, 0);
});

test('getBySeverity filters correctly', () => {
  const store = new DiagnosticStore();
  store.add({ id: 'd1', code: 'A', severity: 'error', source: 'schema', path: '/', message: 'A', actions: [] });
  store.add({ id: 'd2', code: 'B', severity: 'warning', source: 'semantic', path: '/', message: 'B', actions: [] });
  store.add({ id: 'd3', code: 'C', severity: 'error', source: 'runtime', path: '/', message: 'C', actions: [] });

  const errors = store.getBySeverity('error');
  assert.equal(errors.length, 2);
  assert.ok(errors.every((d) => d.severity === 'error'));
});

test('getBySource filters correctly', () => {
  const store = new DiagnosticStore();
  store.add({ id: 'd1', code: 'A', severity: 'error', source: 'schema', path: '/', message: 'A', actions: [] });
  store.add({ id: 'd2', code: 'B', severity: 'warning', source: 'semantic', path: '/', message: 'B', actions: [] });

  const semantic = store.getBySource('semantic');
  assert.equal(semantic.length, 1);
  assert.equal(semantic[0].source, 'semantic');
});

test('ingestSemanticDiagnostics converts and replaces by source', () => {
  const store = new DiagnosticStore();

  const semDiags: SemanticDiagnostic[] = [
    { code: 'QUEST_NODE_UNREACHABLE', severity: 'warning', path: '/nodes/2', message: 'Node unreachable' },
    { code: 'QUEST_START_NODE_MISSING', severity: 'error', path: '/nodes', message: 'No start node' },
  ];

  store.ingestSemanticDiagnostics(semDiags, 'project-load');
  assert.equal(store.getAll().length, 2);
  assert.ok(store.getAll()[0].id.startsWith('project-load:'));
  assert.equal(store.getAll()[0].source, 'project-load');

  // Re-ingest clears previous from same source
  store.ingestSemanticDiagnostics([semDiags[0]], 'project-load');
  assert.equal(store.getAll().length, 1);
});

test('ingestSemanticDiagnostics attaches fix actions for known codes', () => {
  const store = new DiagnosticStore();

  store.ingestSemanticDiagnostics(
    [{ code: 'QUEST_START_NODE_MISSING', severity: 'error', path: '/nodes', message: 'Missing start' }],
    'semantic',
  );

  const diag = store.getAll()[0];
  assert.equal(diag.actions.length, 1);
  assert.equal(diag.actions[0].deterministic, false);
  assert.equal(diag.actions[0].label, 'Add start node');
  assert.equal(diag.category, 'topology');
});

test('ingestSemanticDiagnostics attaches fix actions for edit-time codes', () => {
  const store = new DiagnosticStore();

  store.ingestSemanticDiagnostics(
    [{ code: 'EDIT_TILE_OUT_OF_BOUNDS', severity: 'error', path: '/tileLayers/layer-0/tiles', message: 'Out of bounds' }],
    'editor',
  );

  const diag = store.getAll()[0];
  assert.equal(diag.actions.length, 1);
  assert.equal(diag.actions[0].deterministic, true);
  assert.equal(diag.actions[0].label, 'Use in-bounds tile coordinates');
});

test('generateTasks creates one task per diagnostic', () => {
  const store = new DiagnosticStore();
  store.add({ id: 'd1', code: 'QUEST_NODE_UNREACHABLE', severity: 'warning', source: 'semantic', path: '/nodes/0', message: 'Unreachable', actions: [{ label: 'Fix', deterministic: false }] });
  store.add({ id: 'd2', code: 'QUEST_START_NODE_MISSING', severity: 'error', source: 'semantic', path: '/nodes', message: 'Missing start', actions: [{ label: 'Add', deterministic: false }] });

  const tasks = store.generateTasks();
  assert.equal(tasks.length, 2);

  const task1 = tasks.find((t) => t.diagnosticId === 'd1');
  assert.ok(task1);
  assert.equal(task1?.label, 'Connect unreachable node');
  assert.equal(task1?.fixAction?.deterministic, false);
  assert.equal(task1?.category, 'topology');

  const task2 = tasks.find((t) => t.diagnosticId === 'd2');
  assert.ok(task2);
  assert.equal(task2?.label, 'Add missing start node');
  assert.equal(task2?.fixAction?.deterministic, false);
});

test('generateTasks sorts by severity before category/label', () => {
  const store = new DiagnosticStore();
  store.add({ id: 'd-info', code: 'A', severity: 'info', source: 'editor', path: '/', message: 'Info', actions: [] });
  store.add({ id: 'd-error', code: 'EDIT_ENTITY_MISSING', severity: 'error', source: 'editor', path: '/', message: 'Error', actions: [] });
  store.add({ id: 'd-warning', code: 'QUEST_NODE_UNREACHABLE', severity: 'warning', source: 'semantic', path: '/', message: 'Warn', actions: [] });

  const tasks = store.generateTasks();
  assert.equal(tasks[0].severity, 'error');
  assert.equal(tasks[1].severity, 'warning');
  assert.equal(tasks[2].severity, 'info');
});

test('generateTasks uses explicit labels for edit-time diagnostics', () => {
  const store = new DiagnosticStore();
  store.add({
    id: 'd-edit',
    code: 'EDIT_ENTITY_MISSING',
    severity: 'error',
    source: 'editor',
    path: '/entities/ent-missing',
    message: 'Entity not found',
    actions: [{ label: 'Select an existing entity', deterministic: false }],
  });

  const tasks = store.generateTasks();
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].label, 'Select an entity that exists');
  assert.equal(tasks[0].fixAction?.label, 'Select an existing entity');
});

test('generateTasks labels invalid asset refs for editor fixes', () => {
  const store = new DiagnosticStore();
  store.add({
    id: 'd-asset',
    code: 'EDIT_ASSET_REF_INVALID',
    severity: 'error',
    source: 'editor',
    path: '/entities/ent_1/spriteId',
    message: 'Invalid sprite asset reference format.',
    actions: [{ label: 'Use a valid asset reference (asset_...)', deterministic: false }],
  });

  const tasks = store.generateTasks();
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].label, 'Fix invalid asset reference');
});

test('removeByCodeAndPath removes only matching diagnostics', () => {
  const store = new DiagnosticStore();
  store.add({ id: 'd1', code: 'EDIT_TILE_OUT_OF_BOUNDS', severity: 'error', source: 'editor', path: '/tileLayers/layer-0/tiles', message: 'OOB', actions: [] });
  store.add({ id: 'd2', code: 'EDIT_ENTITY_MISSING', severity: 'error', source: 'editor', path: '/entities/ent-1', message: 'Missing', actions: [] });
  store.add({ id: 'd3', code: 'EDIT_TILE_OUT_OF_BOUNDS', severity: 'error', source: 'editor', path: '/tileLayers/layer-1/tiles', message: 'OOB2', actions: [] });

  store.removeByCodeAndPath('EDIT_TILE_OUT_OF_BOUNDS', '/tileLayers/layer-0');
  assert.equal(store.getAll().length, 2);
  assert.ok(store.getAll().some((d) => d.id === 'd2'));
  assert.ok(store.getAll().some((d) => d.id === 'd3'));
});

test('removeByCodeAndPath notifies subscribers', () => {
  const store = new DiagnosticStore();
  let callCount = 0;
  store.subscribe(() => { callCount++; });

  store.add({ id: 'd1', code: 'X', severity: 'error', source: 'editor', path: '/a', message: 'A', actions: [] });
  assert.equal(callCount, 1);

  store.removeByCodeAndPath('X', '/a');
  assert.equal(callCount, 2);

  // No-op removal should not notify
  store.removeByCodeAndPath('X', '/a');
  assert.equal(callCount, 2);
});

test('resolveFixAction returns deterministic=true for EDIT_ENTITY_OUT_OF_BOUNDS', () => {
  const action = resolveFixAction('EDIT_ENTITY_OUT_OF_BOUNDS');
  assert.ok(action);
  assert.equal(action!.deterministic, true);
  assert.equal(action!.label, 'Clamp entity to canvas bounds');
});

test('resolveFixAction returns deterministic=true for EDIT_DUPLICATE_ENTITY_NAME', () => {
  const action = resolveFixAction('EDIT_DUPLICATE_ENTITY_NAME');
  assert.ok(action);
  assert.equal(action!.deterministic, true);
  assert.equal(action!.label, 'Rename to a unique name');
});

test('resolveFixAction returns deterministic=true for EDIT_LAYER_MISSING', () => {
  const action = resolveFixAction('EDIT_LAYER_MISSING');
  assert.ok(action);
  assert.equal(action!.deterministic, true);
  assert.equal(action!.label, 'Use fallback layer');
});

test('subscribe notifies on changes', () => {
  const store = new DiagnosticStore();
  let callCount = 0;
  const unsub = store.subscribe(() => { callCount++; });

  store.add({ id: 'd1', code: 'A', severity: 'info', source: 'editor', path: '/', message: 'A', actions: [] });
  assert.equal(callCount, 1);

  store.remove('d1');
  assert.equal(callCount, 2);

  store.add({ id: 'd2', code: 'B', severity: 'info', source: 'editor', path: '/', message: 'B', actions: [] });
  unsub();

  store.remove('d2');
  assert.equal(callCount, 3, 'should not increment after unsubscribe');
});
