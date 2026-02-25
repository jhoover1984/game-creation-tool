import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CommandBus } from './command-bus.js';
import { ProjectStore } from './project-store.js';
import { PlaytestRunner } from './playtest-runner.js';

/**
 * INTEG-CONTRACT-001
 * Locks one canonical playable contract:
 * - starter authored map state survives save/load,
 * - player speed is command-authored with undo/redo semantics,
 * - one playtest tick supports movement + interact in the same flow.
 */
describe('INTEG-CONTRACT-001 playable contract', () => {
  it('starter authored state + speed command + playtest tick + save/load invariants', () => {
    const bus = new CommandBus();
    const store = new ProjectStore(bus);
    store.createProject('Contract', 64, 36, 16);

    // Minimal authored world signal: paint one ground tile.
    const paintEvent = bus.dispatch({
      type: 'tile:set',
      payload: { layerId: 'layer-0', x: 0, y: 34, tileId: 1 },
    });
    assert.ok(paintEvent, 'tile:set should succeed');

    // Create two entities through command path.
    const e1 = bus.dispatch({
      type: 'entity:create',
      payload: { name: 'Player', x: 16, y: 16 },
    });
    const e2 = bus.dispatch({
      type: 'entity:create',
      payload: { name: 'Npc', x: 20, y: 16 },
    });
    assert.ok(e1 && e2, 'entity:create should succeed');
    assert.equal(store.entities.length, 2);

    const player = store.entities.find((e) => e.name === 'Player');
    const npc = store.entities.find((e) => e.name === 'Npc');
    assert.ok(player && npc, 'player and npc entities should exist');

    // Tags are currently not command-authored; set explicit role tags for contract setup.
    player.tags.push('player');
    npc.tags.push('interactable');

    // Author speed via command path.
    const speedEvent = bus.dispatch({
      type: 'entity:setSpeed',
      payload: { entityId: player.id, speed: 180 },
    });
    assert.ok(speedEvent, 'entity:setSpeed should succeed');
    assert.equal(player.speed, 180);

    // Undo/redo contract for speed command.
    store.undo();
    assert.equal(player.speed, undefined, 'undo restores pre-command speed');
    store.redo();
    assert.equal(player.speed, 180, 'redo reapplies authored speed');

    const runner = new PlaytestRunner();
    runner.init(store.entities, store.tileLayers, store.manifest.tileSize);
    assert.equal(runner.enter(), true);

    // One canonical tick: move + interact.
    runner.setInput({ moveX: 1, moveY: 0, interact: true });
    const snap = runner.step();
    assert.ok(snap, 'playtest step should produce snapshot');

    const snapPlayer = snap?.entities.find((e) => e.id === player.id);
    assert.ok(snapPlayer, 'snapshot should include player');
    // speed=180, dt=1/60 => dx=3
    assert.ok(Math.abs((snapPlayer?.x ?? 0) - 19) < 0.01, 'player should move by 3px on tick');
    assert.ok(
      (snap?.interactions ?? []).some((i) => i.actorId === player.id && i.targetId === npc.id),
      'player should interact with nearby interactable in same tick',
    );

    const saved = store.saveToJson();
    const store2 = new ProjectStore(new CommandBus());
    store2.loadFromJson(saved);

    const loadedPlayer = store2.entities.find((e) => e.id === player.id);
    assert.ok(loadedPlayer, 'player should exist after load');
    assert.equal(loadedPlayer?.speed, 180, 'authored speed should survive save/load');
    assert.equal(store2.tileLayers[0].data[34 * 64], 1, 'authored ground tile should survive save/load');
  });
});
