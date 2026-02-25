/**
 * INTEG-001 -- Golden playable integration smoke test.
 *
 * Covers the full vertical slice from a blank slate:
 *   new project -> paint tile -> create entity -> enter playtest
 *   -> step x5 -> pause -> save -> load -> verify authored state
 *   -> enter playtest on loaded project -> step -> exit
 *
 * This test uses no fixture files; all state is built through the command
 * bus to prove the full edit path is wired end-to-end.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CommandBus } from './command-bus.js';
import { ProjectStore } from './project-store.js';
import { PlaytestRunner } from './playtest-runner.js';

describe('INTEG-001 golden playable integration smoke', () => {
  function buildProject() {
    const bus = new CommandBus();
    const store = new ProjectStore(bus);

    // Step 1: create a new project (10x10 tiles, 16px each).
    store.createProject('Smoke', 10, 10, 16);
    assert.equal(store.manifest.name, 'Smoke');
    assert.ok(store.manifest.id.length > 0, 'project id must be non-empty');
    assert.equal(store.tileLayers.length, 1);
    assert.equal(store.tileLayers[0].data.length, 100);
    assert.equal(store.entities.length, 0);

    return { bus, store };
  }

  it('new project -> tile -> entity -> save -> load roundtrip preserves authored state', () => {
    const { bus, store } = buildProject();

    // Step 2: paint a tile.
    const tileResult = bus.dispatch({
      type: 'tile:set',
      payload: { layerId: 'layer-0', x: 2, y: 3, tileId: 7 },
    });
    assert.ok(tileResult, 'tile:set must return a result event');
    assert.equal(store.tileLayers[0].data[3 * 10 + 2], 7, 'tile must be stored at correct index');

    // Step 3: create entity at authored position.
    const entityResult = bus.dispatch({
      type: 'entity:create',
      payload: { name: 'Hero', x: 32, y: 48 },
    });
    assert.ok(entityResult, 'entity:create must return a result event');
    assert.equal(store.entities.length, 1);
    assert.equal(store.entities[0].name, 'Hero');
    assert.deepEqual(store.entities[0].position, { x: 32, y: 48 });
    const authoredEntityId = store.entities[0].id;

    // canUndo must be true after two commands.
    assert.equal(store.canUndo(), true);

    // Step 4: save to JSON.
    const json = store.saveToJson();
    assert.ok(json.length > 0, 'saved JSON must be non-empty');
    const parsed = JSON.parse(json) as Record<string, unknown>;
    assert.equal(
      (parsed.manifest as { name: string }).name,
      'Smoke',
      'saved JSON must contain project name',
    );

    // Step 5: load from saved JSON into a fresh store.
    const bus2 = new CommandBus();
    const store2 = new ProjectStore(bus2);
    store2.loadFromJson(json);

    assert.equal(store2.manifest.name, 'Smoke');
    assert.equal(store2.tileLayers.length, 1, 'loaded store must have one tile layer');
    assert.equal(
      store2.tileLayers[0].data[3 * 10 + 2],
      7,
      'tile data must survive save/load roundtrip',
    );
    assert.equal(store2.entities.length, 1, 'entity must survive save/load roundtrip');
    assert.equal(store2.entities[0].id, authoredEntityId, 'entity id must be stable');
    assert.deepEqual(
      store2.entities[0].position,
      { x: 32, y: 48 },
      'entity authored position must survive save/load',
    );
  });

  it('playtest enter -> step x5 -> pause -> exit lifecycle is valid', () => {
    const { bus, store } = buildProject();

    bus.dispatch({ type: 'tile:set', payload: { layerId: 'layer-0', x: 0, y: 0, tileId: 1 } });
    bus.dispatch({ type: 'entity:create', payload: { name: 'Hero', x: 32, y: 48 } });

    const runner = new PlaytestRunner();
    runner.init(store.entities, store.tileLayers, store.manifest.tileSize);

    // Enter playtest.
    assert.equal(runner.getStatus(), 'stopped');
    const entered = runner.enter();
    assert.equal(entered, true, 'enter() must succeed from stopped state');
    assert.equal(runner.getStatus(), 'running');

    // Step 5 times with movement input; each step must produce a snapshot.
    runner.setInput({ moveX: 1, moveY: 0, interact: false });
    for (let i = 0; i < 5; i++) {
      const snap = runner.step();
      assert.ok(snap, `step ${i + 1} must produce a snapshot`);
      assert.equal(snap?.state, 'running', `snapshot state must be running on step ${i + 1}`);
      assert.equal(snap?.entities.length, 1, `snapshot must contain 1 entity on step ${i + 1}`);
    }

    // Pause.
    const paused = runner.pause();
    assert.equal(paused, true, 'pause() must succeed from running state');
    assert.equal(runner.getStatus(), 'paused');

    // Step must return null when paused.
    const nullSnap = runner.step();
    assert.equal(nullSnap, null, 'step() must return null when paused');

    // Exit.
    runner.exit();
    assert.equal(runner.getStatus(), 'stopped');
  });

  it('player entity moves right when moveX=1 (validates controlled movement)', () => {
    // Construct a player entity directly -- entity:create via bus produces tags:[]
    // and there is no entity:updateTags command yet, so we build the EntityDef directly.
    const player = {
      id: 'player-1',
      name: 'Hero',
      position: { x: 16, y: 16 },
      size: { w: 16, h: 16 },
      solid: false,
      tags: ['player'],
    };

    const runner = new PlaytestRunner();
    // Empty tile layer -- no solid tiles to block movement.
    runner.init([player], [], 16);
    runner.enter();
    assert.equal(runner.getStatus(), 'running');

    runner.setInput({ moveX: 1, moveY: 0, interact: false });
    const snap = runner.step();
    assert.ok(snap, 'step must produce a snapshot');

    const snapEntity = snap?.entities[0];
    assert.ok(snapEntity, 'snapshot must include the player entity');

    // speed=120 px/s, dt=1/60 s, moveX=1 -> dx = (1/1)*120*(1/60) = 2 px
    const expectedX = 16 + 2;
    assert.ok(
      snapEntity.x > 16,
      `player x must increase after moveX=1 step (got ${snapEntity.x}, expected > 16)`,
    );
    assert.ok(
      Math.abs(snapEntity.x - expectedX) < 0.01,
      `player x must be ~${expectedX} after 1 step (got ${snapEntity.x})`,
    );
  });

  it('save -> load -> playtest on loaded project is valid', () => {
    const { bus, store } = buildProject();

    bus.dispatch({ type: 'entity:create', payload: { name: 'Hero', x: 16, y: 16 } });

    const json = store.saveToJson();

    const bus2 = new CommandBus();
    const store2 = new ProjectStore(bus2);
    store2.loadFromJson(json);

    const runner = new PlaytestRunner();
    runner.init(store2.entities, store2.tileLayers, store2.manifest.tileSize);

    const entered = runner.enter();
    assert.equal(entered, true);

    const snap = runner.step();
    assert.ok(snap, 'step on loaded project must produce a snapshot');
    assert.equal(snap?.entities.length, 1, 'loaded project snapshot must contain entities');

    runner.exit();
    assert.equal(runner.getStatus(), 'stopped');

    // Undo/redo stacks are cleared after load.
    assert.equal(store2.canUndo(), false, 'undo stack must be empty after load');
    assert.equal(store2.canRedo(), false, 'redo stack must be empty after load');
  });
});
