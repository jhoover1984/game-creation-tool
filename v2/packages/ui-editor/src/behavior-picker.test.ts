/**
 * Tests for BEHAV-PICK-001: Target selector storage and evaluator entity_has_tag.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CommandBus, ProjectStore, BehaviorEvaluator } from '@gcs/runtime-web';
import type { BehaviorRow, TargetSelector } from '@gcs/contracts';
import { renderBehaviorPanel } from './behavior-panel.js';

function setup() {
  const bus = new CommandBus();
  const store = new ProjectStore(bus);
  store.createProject('Test', 10, 10, 16);
  bus.dispatch({ type: 'entity:create', payload: { name: 'Ent', x: 0, y: 0 } });
  const entityId = store.entities[0].id;
  return { bus, store, entityId };
}

function makeRowWithTarget(condTarget: TargetSelector, actTarget: TargetSelector = { type: 'this' }): BehaviorRow {
  return {
    id: `row-${Math.random().toString(36).slice(2)}`,
    label: 'Picker Row',
    enabled: true,
    trigger: { type: 'on:tick' },
    conditions: [{ id: 'c1', type: 'entity_has_tag', target: condTarget }],
    actions: [{ id: 'a1', type: 'log', target: actTarget, params: {} }],
  };
}

test('BEHAV-PICK-001: target:tag round-trips through ProjectStore', () => {
  const { bus, store, entityId } = setup();
  const row = makeRowWithTarget({ type: 'tag', value: 'enemy' });
  bus.dispatch({ type: 'behavior:row:add', payload: { entityId, row } });
  const stored = store.getBehaviors(entityId)[0];
  assert.deepEqual(stored.conditions[0].target, { type: 'tag', value: 'enemy' });
});

test('BEHAV-PICK-001: target:this round-trips through ProjectStore', () => {
  const { bus, store, entityId } = setup();
  const row = makeRowWithTarget({ type: 'this' });
  bus.dispatch({ type: 'behavior:row:add', payload: { entityId, row } });
  const stored = store.getBehaviors(entityId)[0];
  assert.deepEqual(stored.conditions[0].target, { type: 'this' });
});

test('BEHAV-PICK-001: target:radius round-trips through ProjectStore', () => {
  const { bus, store, entityId } = setup();
  const row = makeRowWithTarget({ type: 'radius', value: 5 });
  bus.dispatch({ type: 'behavior:row:add', payload: { entityId, row } });
  const stored = store.getBehaviors(entityId)[0];
  assert.deepEqual(stored.conditions[0].target, { type: 'radius', value: 5 });
});

test('BEHAV-PICK-001: renderBehaviorPanel shows tag chip text', () => {
  const row = makeRowWithTarget({ type: 'tag', value: 'enemy' });
  const html = renderBehaviorPanel('e1', [row], 'edit', []);
  assert.ok(html.includes('tag: enemy'));
});

test('BEHAV-PICK-001: renderBehaviorPanel shows This entity chip for target:this', () => {
  const row = makeRowWithTarget({ type: 'this' });
  const html = renderBehaviorPanel('e1', [row], 'edit', []);
  assert.ok(html.includes('This entity'));
});

test('BEHAV-PICK-001: renderBehaviorPanel shows radius chip for target:radius', () => {
  const row = makeRowWithTarget({ type: 'radius', value: 5 });
  const html = renderBehaviorPanel('e1', [row], 'edit', []);
  assert.ok(html.includes('radius: 5'));
});

test('BEHAV-PICK-001: evaluator entity_has_tag with matching tag -> passed=true', () => {
  const evaluator = new BehaviorEvaluator();
  const entityId = 'e1';
  const row = makeRowWithTarget({ type: 'tag', value: 'enemy' });
  const entity = {
    id: entityId, name: 'Ent',
    position: { x: 0, y: 0 }, size: { w: 16, h: 16 },
    solid: false, tags: ['enemy'],
  };
  const entries = evaluator.evaluate({ [entityId]: [row] }, [entity], 'on:tick');
  assert.equal(entries.length, 1);
  assert.equal(entries[0].conditionResults[0].passed, true);
});

test('BEHAV-PICK-001: evaluator entity_has_tag with missing tag -> passed=false with reason', () => {
  const evaluator = new BehaviorEvaluator();
  const entityId = 'e1';
  const row = makeRowWithTarget({ type: 'tag', value: 'enemy' });
  const entity = {
    id: entityId, name: 'Ent',
    position: { x: 0, y: 0 }, size: { w: 16, h: 16 },
    solid: false, tags: ['player'],
  };
  const entries = evaluator.evaluate({ [entityId]: [row] }, [entity], 'on:tick');
  assert.equal(entries[0].conditionResults[0].passed, false);
  assert.ok(entries[0].conditionResults[0].reason.length > 0);
});
