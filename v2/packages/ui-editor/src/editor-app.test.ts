import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EditorApp } from './editor-app.js';

function createMockCanvas() {
  const ctx = {
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
  } as unknown as CanvasRenderingContext2D;

  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ctx,
  } as unknown as HTMLCanvasElement;

  return { canvas };
}

function storyProjectJson(nodes: object[], edges: object[]) {
  return JSON.stringify({
    manifest: {
      id: 'proj_1',
      name: 'Test',
      version: '0.1.0',
      resolution: { width: 320, height: 240 },
      tileSize: 16,
      createdAt: 'now',
      updatedAt: 'now',
    },
    tileLayers: [],
    entities: [],
    story: {
      questGraph: {
        schemaVersion: '2.0.0',
        nodes,
        edges,
      },
    },
  });
}

// -- Existing editor tests --

test('EditorApp newProject initializes canvas and project state', () => {
  const app = new EditorApp();
  const { canvas } = createMockCanvas();
  app.mount(canvas);

  app.newProject('Demo', 10, 8, 16);

  assert.equal(canvas.width, 160);
  assert.equal(canvas.height, 128);
  assert.equal(app.store.manifest.name, 'Demo');
  assert.equal(app.store.tileLayers.length, 1);
});

test('EditorApp paint and erase tile through command bus', () => {
  const app = new EditorApp();
  const { canvas } = createMockCanvas();
  app.mount(canvas);
  app.newProject('Tiles', 4, 4, 16);

  app.paintTile('layer-0', 1, 2, 7);
  const idx = 2 * 4 + 1;
  assert.equal(app.store.tileLayers[0].data[idx], 7);

  app.eraseTile('layer-0', 1, 2);
  assert.equal(app.store.tileLayers[0].data[idx], 0);
});

test('EditorApp groups paint stroke as a single undo unit', () => {
  const app = new EditorApp();
  const { canvas } = createMockCanvas();
  app.mount(canvas);
  app.newProject('Tiles', 4, 4, 16);

  assert.equal(app.beginPaintStroke(), true);
  app.paintTile('layer-0', 0, 0, 7);
  app.paintTile('layer-0', 1, 0, 8);
  assert.equal(app.endPaintStroke(), true);

  assert.equal(app.store.tileLayers[0].data[0], 7);
  assert.equal(app.store.tileLayers[0].data[1], 8);

  app.undo();
  assert.equal(app.store.tileLayers[0].data[0], 0);
  assert.equal(app.store.tileLayers[0].data[1], 0);

  app.redo();
  assert.equal(app.store.tileLayers[0].data[0], 7);
  assert.equal(app.store.tileLayers[0].data[1], 8);
});

test('EditorApp emits edit-time diagnostic for out-of-bounds tile paint', () => {
  const app = new EditorApp();
  const { canvas } = createMockCanvas();
  app.mount(canvas);
  app.newProject('Tiles', 4, 4, 16);

  app.paintTile('layer-0', 99, 99, 7);
  const diags = app.getDiagnostics();
  const diag = diags.find((d) => d.code === 'EDIT_TILE_OUT_OF_BOUNDS');
  assert.ok(diag, 'should emit out-of-bounds diagnostic');
  const task = app.getTasks().find((t) => t.diagnosticId === diag?.id);
  assert.ok(task, 'should generate task from edit-time diagnostic');
});

test('EditorApp emits deterministic fallback fix when layer is missing', () => {
  const app = new EditorApp();
  const { canvas } = createMockCanvas();
  app.mount(canvas);
  app.newProject('LayerFix', 4, 4, 16);

  app.paintTile('layer-does-not-exist', 2, 1, 9);
  const diag = app.getDiagnostics().find((d) => d.code === 'EDIT_LAYER_MISSING');
  assert.ok(diag, 'should emit layer missing diagnostic');
  assert.equal(diag?.actions[0]?.deterministic, true);
  assert.equal(diag?.actions[0]?.commandType, 'tile:set');

  const task = app.getTasks().find((t) => t.diagnosticId === diag?.id);
  assert.ok(task, 'should expose layer fix task');
  const applied = app.applyFix(task!);
  assert.equal(applied, true, 'should apply deterministic fallback layer fix');
  assert.equal(app.store.tileLayers[0].data[1 * 4 + 2], 9);
});

test('EditorApp emits edit-time diagnostic when moving a missing entity', () => {
  const app = new EditorApp();
  const { canvas } = createMockCanvas();
  app.mount(canvas);
  app.newProject('Entities', 4, 4, 16);

  app.moveEntity('ent-missing', 8, 8);
  const diags = app.getDiagnostics();
  const diag = diags.find((d) => d.code === 'EDIT_ENTITY_MISSING');
  assert.ok(diag, 'should emit missing entity diagnostic');
});

test('EditorApp updates entity visual fields through command path', () => {
  const app = new EditorApp();
  const { canvas } = createMockCanvas();
  app.mount(canvas);
  app.newProject('Entities', 4, 4, 16);

  app.createEntity('Hero', 8, 8);
  const entityId = app.store.entities[0].id;
  const result = app.updateEntityVisual(entityId, {
    solid: true,
    spriteId: 'asset_sprite_hero',
    animationClipId: 'asset_clip_walk',
  });

  assert.equal(result, true);
  assert.equal(app.store.entities[0].solid, true);
  assert.equal(app.store.entities[0].spriteId, 'asset_sprite_hero');
  assert.equal(app.store.entities[0].animationClipId, 'asset_clip_walk');
});

test('EditorApp emits diagnostic for invalid asset reference format', () => {
  const app = new EditorApp();
  const { canvas } = createMockCanvas();
  app.mount(canvas);
  app.newProject('Entities', 4, 4, 16);

  app.createEntity('Hero', 8, 8);
  const entityId = app.store.entities[0].id;
  const result = app.updateEntityVisual(entityId, {
    solid: false,
    spriteId: 'bad ref with spaces',
  });

  assert.equal(result, false);
  const diag = app.getDiagnostics().find((d) => d.code === 'EDIT_ASSET_REF_INVALID');
  assert.ok(diag, 'should emit invalid asset reference diagnostic');
  const task = app.getTasks().find((t) => t.diagnosticId === diag?.id);
  assert.equal(task?.label, 'Fix invalid asset reference');
  assert.equal(task?.fixAction?.deterministic, true);
  assert.equal(task?.fixAction?.commandType, 'entity:updateVisual');
});

test('deterministic invalid sprite reference fix clears spriteId', () => {
  const app = new EditorApp();
  const { canvas } = createMockCanvas();
  app.mount(canvas);
  app.newProject('AssetFixSprite', 4, 4, 16);

  app.createEntity('Hero', 8, 8);
  const entityId = app.store.entities[0].id;
  app.updateEntityVisual(entityId, {
    solid: true,
    spriteId: 'bad sprite ref',
    animationClipId: 'asset_clip_walk',
  });

  const task = app.getTasks().find((t) => t.targetRef === `/entities/${entityId}/spriteId`);
  assert.ok(task, 'should expose sprite reference fix task');
  assert.equal(task?.fixAction?.deterministic, true);

  const result = app.applyFix(task!);
  assert.equal(result, true, 'deterministic fix should apply');
  assert.equal(app.store.entities[0].spriteId, undefined, 'spriteId should be cleared');
  assert.equal(app.store.entities[0].animationClipId, 'asset_clip_walk', 'valid animation ref should be preserved');
});

test('deterministic invalid animation reference fix clears animationClipId', () => {
  const app = new EditorApp();
  const { canvas } = createMockCanvas();
  app.mount(canvas);
  app.newProject('AssetFixAnimation', 4, 4, 16);

  app.createEntity('Hero', 8, 8);
  const entityId = app.store.entities[0].id;
  app.updateEntityVisual(entityId, {
    solid: false,
    spriteId: 'asset_sprite_hero',
    animationClipId: 'bad clip ref',
  });

  const task = app.getTasks().find((t) => t.targetRef === `/entities/${entityId}/animationClipId`);
  assert.ok(task, 'should expose animation reference fix task');
  assert.equal(task?.fixAction?.deterministic, true);

  const result = app.applyFix(task!);
  assert.equal(result, true, 'deterministic fix should apply');
  assert.equal(app.store.entities[0].animationClipId, undefined, 'animationClipId should be cleared');
  assert.equal(app.store.entities[0].spriteId, 'asset_sprite_hero', 'valid sprite ref should be preserved');
});

test('EditorApp create move delete entity flow', () => {
  const app = new EditorApp();
  const { canvas } = createMockCanvas();
  app.mount(canvas);
  app.newProject('Entities', 4, 4, 16);

  app.createEntity('Hero', 8, 8);
  assert.equal(app.store.entities.length, 1);
  const id = app.store.entities[0].id;

  app.moveEntity(id, 20, 24);
  assert.deepEqual(app.store.entities[0].position, { x: 20, y: 24 });

  app.deleteEntity(id);
  assert.equal(app.store.entities.length, 0);
});

test('EditorApp exposes load diagnostics for warning-only story validation', () => {
  const app = new EditorApp();
  const { canvas } = createMockCanvas();
  app.mount(canvas);

  const json = storyProjectJson(
    [
      { nodeId: 'node_start', kind: 'start', name: 'Start' },
      { nodeId: 'node_end', kind: 'end', name: 'End' },
      { nodeId: 'node_orphan', kind: 'reward', name: 'Orphan' },
    ],
    [{ from: 'node_start', to: 'node_end' }],
  );

  app.load(json);
  const diagnostics = app.getLoadDiagnostics();
  assert.ok(diagnostics.some((d) => d.code === 'QUEST_NODE_UNREACHABLE'));
});

// -- UI-TASKS-001: Diagnostic display --

test('UI-TASKS-001: load diagnostics are ingested into diagnostic store', () => {
  const app = new EditorApp();
  const { canvas } = createMockCanvas();
  app.mount(canvas);

  const json = storyProjectJson(
    [
      { nodeId: 'node_start', kind: 'start', name: 'Start' },
      { nodeId: 'node_end', kind: 'end', name: 'End' },
      { nodeId: 'node_orphan', kind: 'reward', name: 'Orphan' },
    ],
    [{ from: 'node_start', to: 'node_end' }],
  );

  app.load(json);
  const diags = app.getDiagnostics();
  assert.ok(diags.length > 0, 'should have at least one diagnostic');
  const unreachable = diags.find((d) => d.code === 'QUEST_NODE_UNREACHABLE');
  assert.ok(unreachable, 'should detect unreachable node');
  assert.equal(unreachable?.severity, 'warning');
  assert.equal(unreachable?.source, 'project-load');
});

test('UI-TASKS-001: diagnostics have required fields (id, severity, message, actions)', () => {
  const app = new EditorApp();
  const { canvas } = createMockCanvas();
  app.mount(canvas);

  // Use a graph that produces warnings (not errors) so validation doesn't throw
  const json = storyProjectJson(
    [
      { nodeId: 'node_start', kind: 'start', name: 'Start' },
      { nodeId: 'node_orphan', kind: 'reward', name: 'Orphan' },
    ],
    [],
  );

  app.load(json);
  const diags = app.getDiagnostics();
  assert.ok(diags.length > 0, 'should have diagnostics');
  for (const d of diags) {
    assert.ok(d.id, 'diagnostic must have id');
    assert.ok(['info', 'warning', 'error', 'fatal'].includes(d.severity), 'valid severity');
    assert.ok(d.message.length > 0, 'message must be non-empty');
    assert.ok(Array.isArray(d.actions), 'actions must be array');
  }
});

test('UI-TASKS-001: newProject clears diagnostics', () => {
  const app = new EditorApp();
  const { canvas } = createMockCanvas();
  app.mount(canvas);

  // Use a graph that produces warnings (not errors)
  const json = storyProjectJson(
    [
      { nodeId: 'node_start', kind: 'start', name: 'Start' },
      { nodeId: 'node_orphan', kind: 'reward', name: 'Orphan' },
    ],
    [],
  );

  app.load(json);
  assert.ok(app.getDiagnostics().length > 0);

  app.newProject('Fresh', 4, 4, 16);
  assert.equal(app.getDiagnostics().length, 0);
});

// -- UI-TASKS-002: Task generation --

test('UI-TASKS-002: tasks are generated from diagnostics with actionable labels', () => {
  const app = new EditorApp();
  const { canvas } = createMockCanvas();
  app.mount(canvas);

  const json = storyProjectJson(
    [
      { nodeId: 'node_start', kind: 'start', name: 'Start' },
      { nodeId: 'node_end', kind: 'end', name: 'End' },
      { nodeId: 'node_orphan', kind: 'reward', name: 'Orphan' },
    ],
    [{ from: 'node_start', to: 'node_end' }],
  );

  app.load(json);
  const tasks = app.getTasks();
  assert.ok(tasks.length > 0, 'should generate at least one task');
  const task = tasks.find((t) => t.label === 'Connect unreachable node');
  assert.ok(task, 'should have task for unreachable node');
  assert.equal(task?.severity, 'warning');
  assert.ok(task?.diagnosticId, 'task must reference diagnostic');
});

test('UI-TASKS-002: missing start node generates task with fix action', () => {
  const app = new EditorApp();

  // Inject diagnostic directly to test task generation (bypasses validation throw)
  app.diagnosticStore.ingestSemanticDiagnostics(
    [{ code: 'QUEST_START_NODE_MISSING', severity: 'error', path: '/nodes', message: 'No start node found.' }],
    'project-load',
  );

  const tasks = app.getTasks();
  const startMissing = tasks.find((t) => t.label === 'Add missing start node');
  assert.ok(startMissing, 'should generate task for missing start node');
  assert.ok(startMissing?.fixAction, 'should have fix action');
  assert.equal(startMissing?.fixAction?.deterministic, false);
});

test('UI-TASKS-002: each task references a valid diagnostic', () => {
  const app = new EditorApp();
  const { canvas } = createMockCanvas();
  app.mount(canvas);

  const json = storyProjectJson(
    [
      { nodeId: 'node_start', kind: 'start', name: 'Start' },
      { nodeId: 'node_orphan', kind: 'reward', name: 'Orphan' },
    ],
    [],
  );

  app.load(json);
  const tasks = app.getTasks();
  const diags = app.getDiagnostics();
  for (const task of tasks) {
    assert.ok(
      diags.some((d) => d.id === task.diagnosticId),
      `task ${task.id} must reference a valid diagnostic`,
    );
  }
});

// -- UI-TASKS-003: Auto-fix --

test('UI-TASKS-003: deterministic fix removes diagnostic', () => {
  const app = new EditorApp();

  // Inject a deterministic fix with a known runtime command handler.
  app.diagnosticStore.add({
    id: 'manual:deterministic',
    code: 'MANUAL_FIX',
    severity: 'warning',
    source: 'editor',
    path: '/entities',
    message: 'Can auto-create entity',
    actions: [
      {
        label: 'Create entity',
        deterministic: true,
        commandType: 'entity:create',
        commandPayload: { name: 'AutoFixEntity', x: 0, y: 0 },
      },
    ],
  });

  const tasks = app.getTasks();
  const fixable = tasks.find((t) => t.fixAction?.deterministic === true);
  assert.ok(fixable, 'should have a deterministic fix action');

  const diagsBefore = app.getDiagnostics().length;
  const result = app.applyFix(fixable!);
  assert.equal(result, true, 'applyFix should return true for deterministic fix');
  assert.ok(app.getDiagnostics().length < diagsBefore, 'diagnostic count should decrease');
  assert.ok(app.store.entities.some((e) => e.name === 'AutoFixEntity'), 'fix command should execute');
});

test('UI-TASKS-003: non-deterministic fix returns false', () => {
  const app = new EditorApp();
  const { canvas } = createMockCanvas();
  app.mount(canvas);

  const json = storyProjectJson(
    [
      { nodeId: 'node_start', kind: 'start', name: 'Start' },
      { nodeId: 'node_orphan', kind: 'reward', name: 'Orphan' },
    ],
    [],
  );

  app.load(json);
  const tasks = app.getTasks();
  const nonDeterministic = tasks.find((t) => t.fixAction?.deterministic === false);
  assert.ok(nonDeterministic, 'should have a non-deterministic fix action');

  const result = app.applyFix(nonDeterministic!);
  assert.equal(result, false, 'applyFix should return false for non-deterministic fix');
});

test('UI-TASKS-003: applyFix with no fixAction returns false', () => {
  const app = new EditorApp();

  const result = app.applyFix({
    id: 'task:test',
    diagnosticId: 'test',
    severity: 'info',
    label: 'No fix',
  });
  assert.equal(result, false);
});

test('UI-TASKS-003: applyFix is idempotent', () => {
  const app = new EditorApp();

  app.diagnosticStore.add({
    id: 'manual:idempotent',
    code: 'MANUAL_FIX',
    severity: 'warning',
    source: 'editor',
    path: '/entities',
    message: 'Can auto-create entity once',
    actions: [
      {
        label: 'Create entity',
        deterministic: true,
        commandType: 'entity:create',
        commandPayload: { name: 'IdempotentEntity', x: 1, y: 1 },
      },
    ],
  });

  const tasks = app.getTasks();
  const fixable = tasks.find((t) => t.fixAction?.deterministic === true);
  assert.ok(fixable);

  app.applyFix(fixable!);
  const countAfterFirst = app.getDiagnostics().length;
  const entitiesAfterFirst = app.store.entities.length;

  // Second apply should be no-op (diagnostic already removed)
  const second = app.applyFix(fixable!);
  assert.equal(second, false, 'second apply should return false when diagnostic is already resolved');
  assert.equal(app.getDiagnostics().length, countAfterFirst, 'second apply should be no-op');
  assert.equal(app.store.entities.length, entitiesAfterFirst, 'second apply should not dispatch another command');
});

// -- Expanded edit-time diagnostics --

test('entity out-of-bounds diagnostic emitted when entity moved beyond canvas', () => {
  const app = new EditorApp();
  const { canvas } = createMockCanvas();
  app.mount(canvas);
  app.newProject('Bounds', 4, 4, 16); // 64x64 canvas

  app.createEntity('Hero', 8, 8);
  const id = app.store.entities[0].id;

  // Move far beyond canvas bounds (entity is 16x16, canvas is 64x64)
  app.moveEntity(id, 100, 100);
  const diag = app.getDiagnostics().find((d) => d.code === 'EDIT_ENTITY_OUT_OF_BOUNDS');
  assert.ok(diag, 'should emit out-of-bounds diagnostic');
  assert.equal(diag?.severity, 'error');
  assert.ok(diag?.actions.length === 1, 'should have fix action');
  assert.equal(diag?.actions[0].deterministic, true, 'fix should be deterministic');
  assert.equal(diag?.actions[0].commandType, 'entity:move');
});

test('deterministic auto-fix clamps entity to bounds via applyFix', () => {
  const app = new EditorApp();
  const { canvas } = createMockCanvas();
  app.mount(canvas);
  app.newProject('Bounds', 4, 4, 16); // 64x64 canvas

  app.createEntity('Hero', 8, 8);
  const id = app.store.entities[0].id;

  // Move beyond bounds
  app.moveEntity(id, 200, 200);
  assert.ok(app.getDiagnostics().some((d) => d.code === 'EDIT_ENTITY_OUT_OF_BOUNDS'));

  // Apply deterministic fix
  const tasks = app.getTasks();
  const oobTask = tasks.find((t) => t.label === 'Move entity within canvas bounds');
  assert.ok(oobTask, 'should have OOB task');
  assert.equal(oobTask?.fixAction?.deterministic, true);

  const result = app.applyFix(oobTask!);
  assert.equal(result, true, 'deterministic fix should succeed');

  // Entity should be clamped to max valid position (64 - 16 = 48)
  const entity = app.store.entities.find((e) => e.id === id);
  assert.ok(entity);
  assert.equal(entity!.position.x, 48);
  assert.equal(entity!.position.y, 48);

  // Diagnostic should be removed
  assert.ok(!app.getDiagnostics().some((d) => d.code === 'EDIT_ENTITY_OUT_OF_BOUNDS'));
});

test('applyFix returns false when dispatch fails', () => {
  const app = new EditorApp();

  app.diagnosticStore.add({
    id: 'manual:bad-cmd',
    code: 'MANUAL_FIX',
    severity: 'warning',
    source: 'editor',
    path: '/entities',
    message: 'Fix with invalid command',
    actions: [
      {
        label: 'Run bad command',
        deterministic: true,
        commandType: 'nonexistent:command',
        commandPayload: {},
      },
    ],
  });

  const tasks = app.getTasks();
  const fixable = tasks.find((t) => t.fixAction?.deterministic === true);
  assert.ok(fixable);

  const result = app.applyFix(fixable!);
  assert.equal(result, false, 'should return false when command dispatch fails');
  // Diagnostic should NOT be removed since fix failed
  assert.equal(app.getDiagnostics().length, 1, 'diagnostic should remain after failed fix');
});

test('duplicate entity name diagnostic emitted on create', () => {
  const app = new EditorApp();
  const { canvas } = createMockCanvas();
  app.mount(canvas);
  app.newProject('Dup', 4, 4, 16);

  app.createEntity('Hero', 8, 8);
  assert.equal(app.getDiagnostics().length, 0, 'no diagnostic for first entity');

  app.createEntity('Hero', 16, 16);
  const diag = app.getDiagnostics().find((d) => d.code === 'EDIT_DUPLICATE_ENTITY_NAME');
  assert.ok(diag, 'should emit duplicate name diagnostic');
  assert.equal(diag?.severity, 'info', 'duplicate name should be info severity');
  assert.ok(diag?.actions.length === 1, 'should have fix action');
  assert.equal(diag?.actions[0].deterministic, true);
  assert.ok(diag?.actions[0].label.startsWith('Rename to '));
});

test('editor diagnostics have fix actions from resolveFixAction', () => {
  const app = new EditorApp();
  const { canvas } = createMockCanvas();
  app.mount(canvas);
  app.newProject('Actions', 4, 4, 16);

  // Trigger a tile out-of-bounds diagnostic
  app.paintTile('layer-0', 99, 99, 7);
  const diag = app.getDiagnostics().find((d) => d.code === 'EDIT_TILE_OUT_OF_BOUNDS');
  assert.ok(diag, 'should have OOB diagnostic');
  assert.ok(diag!.actions.length > 0, 'editor diagnostic should now have fix actions');
  assert.equal(diag!.actions[0].label, 'Use in-bounds tile coordinates');
  assert.equal(diag!.actions[0].deterministic, true);
  assert.equal(diag!.actions[0].commandType, 'tile:set');
});

test('multiple editor diagnostics coexist (scoped removal)', () => {
  const app = new EditorApp();
  const { canvas } = createMockCanvas();
  app.mount(canvas);
  app.newProject('Multi', 4, 4, 16); // 64x64 canvas

  // Create an entity and move it OOB
  app.createEntity('Hero', 8, 8);
  const id = app.store.entities[0].id;
  app.moveEntity(id, 200, 200);

  // Also trigger a tile OOB
  app.paintTile('layer-0', 99, 99, 7);

  const diags = app.getDiagnostics();
  const oob = diags.filter((d) => d.code === 'EDIT_ENTITY_OUT_OF_BOUNDS');
  const tileOob = diags.filter((d) => d.code === 'EDIT_TILE_OUT_OF_BOUNDS');
  assert.ok(oob.length > 0, 'entity OOB should still exist');
  assert.ok(tileOob.length > 0, 'tile OOB should coexist');
});

test('deterministic tile out-of-bounds fix clamps and applies tile:set', () => {
  const app = new EditorApp();
  const { canvas } = createMockCanvas();
  app.mount(canvas);
  app.newProject('TileFix', 4, 4, 16);

  app.paintTile('layer-0', 99, 99, 7);
  const task = app.getTasks().find((t) => t.label === 'Adjust tile edit to map bounds');
  assert.ok(task, 'should expose tile OOB task');
  assert.equal(task?.fixAction?.deterministic, true);

  const result = app.applyFix(task!);
  assert.equal(result, true, 'tile fix should dispatch and succeed');
  assert.equal(app.store.tileLayers[0].data[3 * 4 + 3], 7, 'clamped tile should be painted at bottom-right cell');
  assert.ok(!app.getDiagnostics().some((d) => d.code === 'EDIT_TILE_OUT_OF_BOUNDS'));
});

test('renameEntity updates entity name through command path', () => {
  const app = new EditorApp();
  const { canvas } = createMockCanvas();
  app.mount(canvas);
  app.newProject('Rename', 4, 4, 16);

  app.createEntity('Hero', 8, 8);
  const id = app.store.entities[0].id;

  app.renameEntity(id, 'Champion');
  assert.equal(app.store.entities[0].name, 'Champion');
  assert.equal(app.getDiagnostics().filter((d) => d.code === 'EDIT_ENTITY_MISSING').length, 0);
});

test('renameEntity emits EDIT_ENTITY_MISSING diagnostic for unknown id', () => {
  const app = new EditorApp();
  const { canvas } = createMockCanvas();
  app.mount(canvas);
  app.newProject('RenameErr', 4, 4, 16);

  app.renameEntity('bad-id', 'X');
  const diag = app.getDiagnostics().find((d) => d.code === 'EDIT_ENTITY_MISSING');
  assert.ok(diag, 'should emit EDIT_ENTITY_MISSING');
});

test('renameEntity clears stale EDIT_ENTITY_MISSING diagnostic on success', () => {
  const app = new EditorApp();
  const { canvas } = createMockCanvas();
  app.mount(canvas);
  app.newProject('RenameClean', 4, 4, 16);

  app.createEntity('A', 8, 8);
  const id = app.store.entities[0].id;

  // Inject a stale EDIT_ENTITY_MISSING diagnostic for this entity's path
  app.diagnosticStore.add({
    id: `editor:EDIT_ENTITY_MISSING:/entities/${id}`,
    code: 'EDIT_ENTITY_MISSING',
    severity: 'error',
    source: 'editor',
    path: `/entities/${id}`,
    message: 'Stale entity not found.',
    actions: [],
  });
  assert.ok(app.getDiagnostics().some((d) => d.code === 'EDIT_ENTITY_MISSING'));

  // Successfully rename the entity -- scoped removal should clear the stale diagnostic
  app.renameEntity(id, 'B');
  assert.equal(app.getDiagnostics().filter((d) => d.code === 'EDIT_ENTITY_MISSING').length, 0);
});

test('EDIT_DUPLICATE_ENTITY_NAME clears after renaming duplicate to unique name', () => {
  const app = new EditorApp();
  const { canvas } = createMockCanvas();
  app.mount(canvas);
  app.newProject('DupRename', 4, 4, 16);

  app.createEntity('Hero', 8, 8);
  app.createEntity('Hero', 16, 16);

  const dupDiags = app.getDiagnostics().filter((d) => d.code === 'EDIT_DUPLICATE_ENTITY_NAME');
  assert.ok(dupDiags.length > 0, 'should have duplicate diagnostics');

  // Rename the second entity to something unique
  const secondId = app.store.entities[1].id;
  app.renameEntity(secondId, 'Villain');

  assert.equal(
    app.getDiagnostics().filter((d) => d.code === 'EDIT_DUPLICATE_ENTITY_NAME').length,
    0,
    'duplicate diagnostic should clear after rename',
  );
});

test('deterministic duplicate-name fix renames and clears diagnostics', () => {
  const app = new EditorApp();
  const { canvas } = createMockCanvas();
  app.mount(canvas);
  app.newProject('DupAutoFix', 4, 4, 16);

  app.createEntity('Clone', 8, 8);
  app.createEntity('Clone', 16, 16);
  assert.ok(app.getDiagnostics().some((d) => d.code === 'EDIT_DUPLICATE_ENTITY_NAME'));

  let iterations = 0;
  while (iterations < 5) {
    iterations += 1;
    const deterministicTasks = app.getTasks().filter((t) => t.fixAction?.deterministic);
    if (deterministicTasks.length === 0) break;
    let progressed = false;
    for (const task of deterministicTasks) {
      progressed = app.applyFix(task) || progressed;
    }
    if (!progressed) break;
  }

  assert.equal(
    app.getDiagnostics().filter((d) => d.code === 'EDIT_DUPLICATE_ENTITY_NAME').length,
    0,
    'duplicate diagnostics should be resolved by deterministic fixes',
  );
});

test('recovery smoke: deterministic fixes resolve layered authoring failures', () => {
  const app = new EditorApp();
  const { canvas } = createMockCanvas();
  app.mount(canvas);
  app.newProject('RecoverySmoke', 4, 4, 16);

  app.paintTile('missing-layer', 99, 99, 5);
  app.createEntity('Hero', 8, 8);
  const firstId = app.store.entities[0].id;
  app.moveEntity(firstId, 200, 200);
  app.updateEntityVisual(firstId, { solid: false, spriteId: 'bad ref', animationClipId: 'asset_clip_walk' });
  app.createEntity('Hero', 16, 16);

  let passes = 0;
  while (passes < 6) {
    passes += 1;
    const deterministic = app.getTasks().filter((t) => t.fixAction?.deterministic);
    if (deterministic.length === 0) break;
    let progressed = false;
    for (const task of deterministic) {
      progressed = app.applyFix(task) || progressed;
    }
    if (!progressed) break;
  }

  const remainingCodes = new Set(app.getDiagnostics().map((d) => d.code));
  assert.ok(!remainingCodes.has('EDIT_LAYER_MISSING'));
  assert.ok(!remainingCodes.has('EDIT_TILE_OUT_OF_BOUNDS'));
  assert.ok(!remainingCodes.has('EDIT_ENTITY_OUT_OF_BOUNDS'));
  assert.ok(!remainingCodes.has('EDIT_ASSET_REF_INVALID'));
  assert.ok(!remainingCodes.has('EDIT_DUPLICATE_ENTITY_NAME'));
});

test('EDIT_DUPLICATE_ENTITY_NAME clears after deleting one of two same-named entities', () => {
  const app = new EditorApp();
  const { canvas } = createMockCanvas();
  app.mount(canvas);
  app.newProject('DupDelete', 4, 4, 16);

  app.createEntity('Clone', 8, 8);
  app.createEntity('Clone', 16, 16);

  assert.ok(
    app.getDiagnostics().some((d) => d.code === 'EDIT_DUPLICATE_ENTITY_NAME'),
    'should have duplicate diagnostic',
  );

  const secondId = app.store.entities[1].id;
  app.deleteEntity(secondId);

  assert.equal(
    app.getDiagnostics().filter((d) => d.code === 'EDIT_DUPLICATE_ENTITY_NAME').length,
    0,
    'duplicate diagnostic should clear after deleting one duplicate',
  );
});

test('applyFix returns false for deterministic fix without command payload', () => {
  const app = new EditorApp();
  app.diagnosticStore.add({
    id: 'manual:missing-payload',
    code: 'MANUAL_FIX',
    severity: 'warning',
    source: 'editor',
    path: '/tileLayers/layer-0',
    message: 'Bad deterministic fix',
    actions: [{ label: 'Broken fix', deterministic: true }],
  });

  const task = app.getTasks().find((t) => t.diagnosticId === 'manual:missing-payload');
  assert.ok(task);
  const result = app.applyFix(task!);
  assert.equal(result, false);
  assert.ok(app.getDiagnostics().some((d) => d.id === 'manual:missing-payload'));
});

test('Story panel slice: selectQuestNode chooses a node by id', () => {
  const app = new EditorApp();
  const { canvas } = createMockCanvas();
  app.mount(canvas);
  app.newProject('StorySelect', 4, 4, 16);

  const nodes = app.getQuestNodes();
  assert.ok(nodes.length >= 2, 'new project should provide default story nodes');

  const selected = app.selectQuestNode(nodes[1].nodeId);
  assert.ok(selected);
  assert.equal(app.getSelectedQuestNode()?.nodeId, nodes[1].nodeId);
});

test('Story panel slice: updateQuestNodeBasics mutates selected node fields', () => {
  const app = new EditorApp();
  const { canvas } = createMockCanvas();
  app.mount(canvas);
  app.newProject('StoryEdit', 4, 4, 16);

  const target = app.getQuestNodes()[0];
  const ok = app.updateQuestNodeBasics(target.nodeId, { name: 'New Start Name', kind: 'objective' });
  assert.equal(ok, true);
  const updated = app.getQuestNodes().find((n) => n.nodeId === target.nodeId);
  assert.equal(updated?.name, 'New Start Name');
  assert.equal(updated?.kind, 'objective');
});

test('Story panel slice: save/load preserves story quest graph edits', () => {
  const app = new EditorApp();
  const { canvas } = createMockCanvas();
  app.mount(canvas);
  app.newProject('StoryPersist', 4, 4, 16);

  const target = app.getQuestNodes()[0];
  app.updateQuestNodeBasics(target.nodeId, { name: 'Persisted Name', kind: 'start' });
  const other = app.getQuestNodes().find((n) => n.nodeId !== target.nodeId)!;
  app.updateQuestNodeBasics(other.nodeId, { name: other.name, kind: 'reward' });
  const json = app.save();

  const app2 = new EditorApp();
  const { canvas: canvas2 } = createMockCanvas();
  app2.mount(canvas2);
  app2.load(json);

  const loaded = app2.getQuestNodes().find((n) => n.nodeId === target.nodeId);
  const loadedOther = app2.getQuestNodes().find((n) => n.nodeId === other.nodeId);
  assert.equal(loaded?.name, 'Persisted Name');
  assert.equal(loaded?.kind, 'start');
  assert.equal(loadedOther?.kind, 'reward');
});

