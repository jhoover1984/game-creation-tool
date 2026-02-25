/**
 * Tests for BEHAV-DEBUG-001: Behavior trace buffer, evaluator correctness, panel render.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BehaviorEvaluator } from '@gcs/runtime-web';
import type { BehaviorRow, EntityDef } from '@gcs/contracts';
import { renderBehaviorPanel } from './behavior-panel.js';

function makeEntity(id: string, tags: string[] = []): EntityDef {
  return { id, name: id, position: { x: 0, y: 0 }, size: { w: 16, h: 16 }, solid: false, tags };
}

function makeOnTickRow(id: string, conditionType: 'always' | 'entity_has_tag', tagValue = ''): BehaviorRow {
  return {
    id,
    label: 'Row',
    enabled: true,
    trigger: { type: 'on:tick' },
    conditions: conditionType === 'always'
      ? [{ id: 'c1', type: 'always', target: { type: 'this' } }]
      : [{ id: 'c1', type: 'entity_has_tag', target: { type: 'tag', value: tagValue } }],
    actions: [{ id: 'a1', type: 'log', target: { type: 'this' }, params: {} }],
  };
}

test('BEHAV-DEBUG-001: on:tick + always condition produces trace entry with passed=true', () => {
  const evaluator = new BehaviorEvaluator();
  const entity = makeEntity('e1');
  const row = makeOnTickRow('r1', 'always');
  const entries = evaluator.evaluate({ e1: [row] }, [entity], 'on:tick');
  assert.equal(entries.length, 1);
  assert.equal(entries[0].triggerType, 'on:tick');
  assert.equal(entries[0].conditionResults[0].passed, true);
  assert.equal(entries[0].actionResults[0].dispatched, true);
});

test('BEHAV-DEBUG-001: entity_has_tag with missing tag -> passed=false, action not dispatched', () => {
  const evaluator = new BehaviorEvaluator();
  const entity = makeEntity('e1', ['player']);
  const row = makeOnTickRow('r1', 'entity_has_tag', 'enemy');
  const entries = evaluator.evaluate({ e1: [row] }, [entity], 'on:tick');
  assert.equal(entries[0].conditionResults[0].passed, false);
  assert.equal(entries[0].actionResults[0].dispatched, false);
  assert.equal(entries[0].actionResults[0].reason, 'conditions not met');
});

test('BEHAV-DEBUG-001: trace buffer is capped at 200 entries', () => {
  const evaluator = new BehaviorEvaluator();
  const entity = makeEntity('e1');
  const row = makeOnTickRow('r1', 'always');
  // Push 201 entries (one per evaluate call)
  for (let i = 0; i < 201; i++) {
    evaluator.evaluate({ e1: [row] }, [entity], 'on:tick');
  }
  assert.equal(evaluator.getTrace().length, 200);
});

test('BEHAV-DEBUG-001: clearTrace empties buffer', () => {
  const evaluator = new BehaviorEvaluator();
  const entity = makeEntity('e1');
  const row = makeOnTickRow('r1', 'always');
  evaluator.evaluate({ e1: [row] }, [entity], 'on:tick');
  assert.ok(evaluator.getTrace().length > 0);
  evaluator.clearTrace();
  assert.equal(evaluator.getTrace().length, 0);
});

test('BEHAV-DEBUG-001: evaluate does not mutate entity state', () => {
  const evaluator = new BehaviorEvaluator();
  const entity = makeEntity('e1', ['player']);
  const tagsBefore = [...entity.tags];
  const row = makeOnTickRow('r1', 'entity_has_tag', 'player');
  evaluator.evaluate({ e1: [row] }, [entity], 'on:tick');
  assert.deepEqual(entity.tags, tagsBefore);
});

test('BEHAV-DEBUG-001: disabled rows are skipped by evaluator', () => {
  const evaluator = new BehaviorEvaluator();
  const entity = makeEntity('e1');
  const row: BehaviorRow = { ...makeOnTickRow('r1', 'always'), enabled: false };
  const entries = evaluator.evaluate({ e1: [row] }, [entity], 'on:tick');
  assert.equal(entries.length, 0);
});

test('BEHAV-DEBUG-001: renderBehaviorPanel in playtest mode includes trace-pass span', () => {
  const evaluator = new BehaviorEvaluator();
  const entity = makeEntity('e1');
  const row = makeOnTickRow('r1', 'always');
  evaluator.evaluate({ e1: [row] }, [entity], 'on:tick');
  const trace = evaluator.getTrace();
  const html = renderBehaviorPanel('e1', [], 'playtest', trace);
  assert.ok(html.includes('trace-pass'));
  assert.ok(!html.includes('<script>'));
});

test('BEHAV-DEBUG-001: renderBehaviorPanel in playtest mode with failed condition includes trace-fail span', () => {
  const evaluator = new BehaviorEvaluator();
  const entity = makeEntity('e1', ['player']);
  const row = makeOnTickRow('r1', 'entity_has_tag', 'enemy');
  evaluator.evaluate({ e1: [row] }, [entity], 'on:tick');
  const trace = evaluator.getTrace();
  const html = renderBehaviorPanel('e1', [], 'playtest', trace);
  assert.ok(html.includes('trace-fail'));
});

test('BEHAV-DEBUG-001: no entity selected renders empty state', () => {
  const html = renderBehaviorPanel(null, [], 'edit', []);
  assert.ok(html.includes('Select an entity'));
});

test('BEHAV-DEBUG-001: empty trace in playtest mode renders hint message', () => {
  const html = renderBehaviorPanel('e1', [], 'playtest', []);
  assert.ok(html.includes('No trace entries'));
});

test('BEHAV-DEBUG-001: set_velocity action is dispatchable when params are valid', () => {
  const evaluator = new BehaviorEvaluator();
  const entity = makeEntity('e1');
  const row: BehaviorRow = {
    id: 'r1',
    label: 'Velocity',
    enabled: true,
    trigger: { type: 'on:tick' },
    conditions: [{ id: 'c1', type: 'always', target: { type: 'this' } }],
    actions: [{ id: 'a1', type: 'set_velocity', target: { type: 'this' }, params: { vx: 10, vy: -5 } }],
  };
  const entries = evaluator.evaluate({ e1: [row] }, [entity], 'on:tick');
  assert.equal(entries[0].actionResults[0].dispatched, true);
});

test('BEHAV-DEBUG-001: destroy_self action is dispatchable for target:this', () => {
  const evaluator = new BehaviorEvaluator();
  const entity = makeEntity('e1');
  const row: BehaviorRow = {
    id: 'r1',
    label: 'Destroy',
    enabled: true,
    trigger: { type: 'on:tick' },
    conditions: [{ id: 'c1', type: 'always', target: { type: 'this' } }],
    actions: [{ id: 'a1', type: 'destroy_self', target: { type: 'this' }, params: {} }],
  };
  const entries = evaluator.evaluate({ e1: [row] }, [entity], 'on:tick');
  assert.equal(entries[0].actionResults[0].dispatched, true);
});

test('BEHAV-DEBUG-001: triggerEntityIds restricts evaluation for contextual triggers', () => {
  const evaluator = new BehaviorEvaluator();
  const e1 = makeEntity('e1');
  const e2 = makeEntity('e2');
  const row1 = { ...makeOnTickRow('r1', 'always'), trigger: { type: 'on:interact' as const } };
  const row2 = { ...makeOnTickRow('r2', 'always'), trigger: { type: 'on:interact' as const } };
  const entries = evaluator.evaluate(
    { e1: [row1], e2: [row2] },
    [e1, e2],
    'on:interact',
    new Set(['e2']),
  );
  assert.equal(entries.length, 1);
  assert.equal(entries[0].entityId, 'e2');
});

test('BEHAV-DEBUG-001: entity_in_radius condition passes when another entity is nearby', () => {
  const evaluator = new BehaviorEvaluator();
  const row: BehaviorRow = {
    id: 'r1',
    label: 'Radius',
    enabled: true,
    trigger: { type: 'on:tick' },
    conditions: [{ id: 'c1', type: 'entity_in_radius', target: { type: 'radius', value: 24 } }],
    actions: [{ id: 'a1', type: 'log', target: { type: 'this' }, params: {} }],
  };
  const entries = evaluator.evaluate(
    { e1: [row] },
    [
      { id: 'e1', name: 'e1', position: { x: 0, y: 0 }, size: { w: 16, h: 16 }, solid: false, tags: [] },
      { id: 'e2', name: 'e2', position: { x: 10, y: 0 }, size: { w: 16, h: 16 }, solid: false, tags: [] },
    ],
    'on:tick',
  );
  assert.equal(entries[0].conditionResults[0].passed, true);
  assert.equal(entries[0].actionResults[0].dispatched, true);
});

test('BEHAV-DEBUG-001: evaluator enforces per-evaluate row budget deterministically', () => {
  const evaluator = new BehaviorEvaluator();
  const entity = makeEntity('e1');
  const rows: BehaviorRow[] = [];
  for (let i = 0; i < 300; i += 1) {
    rows.push({
      id: `r${i}`,
      label: `Row ${i}`,
      enabled: true,
      trigger: { type: 'on:tick' },
      conditions: [{ id: 'c1', type: 'always', target: { type: 'this' } }],
      actions: [{ id: 'a1', type: 'log', target: { type: 'this' }, params: {} }],
    });
  }
  const entries = evaluator.evaluate({ e1: rows }, [entity], 'on:tick');
  assert.equal(entries.length, 256);
});

test('BEHAV-DEBUG-001: evaluator enforces per-row action budget deterministically', () => {
  const evaluator = new BehaviorEvaluator();
  const entity = makeEntity('e1');
  const actions: BehaviorRow['actions'] = [];
  for (let i = 0; i < 20; i += 1) {
    actions.push({ id: `a${i}`, type: 'log', target: { type: 'this' }, params: {} });
  }
  const row: BehaviorRow = {
    id: 'r1',
    label: 'Action budget',
    enabled: true,
    trigger: { type: 'on:tick' },
    conditions: [{ id: 'c1', type: 'always', target: { type: 'this' } }],
    actions,
  };
  const entries = evaluator.evaluate({ e1: [row] }, [entity], 'on:tick');
  const dispatched = entries[0].actionResults.filter((r) => r.dispatched);
  const skipped = entries[0].actionResults.filter((r) => !r.dispatched);
  assert.equal(dispatched.length, 16);
  assert.equal(skipped.length, 4);
  assert.ok(skipped.every((r) => r.reason.includes('row action budget exceeded')));
});
