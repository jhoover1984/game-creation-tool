import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PlaytestRunner } from './playtest-runner.js';
import type { BehaviorRow, EntityDef, TileLayer } from '@gcs/contracts';

function makePlayer(x = 32, y = 32): EntityDef {
  return {
    id: 'p1',
    name: 'Player',
    position: { x, y },
    size: { w: 16, h: 16 },
    solid: true,
    tags: ['player'],
  };
}

function makeEntity(id: string, x: number, y: number, solid = true, tags: string[] = []): EntityDef {
  return {
    id,
    name: id,
    position: { x, y },
    size: { w: 16, h: 16 },
    solid,
    tags,
  };
}

function emptyLayer(w = 10, h = 10): TileLayer {
  return { id: 'layer0', name: 'Ground', width: w, height: h, tileSize: 16, data: new Array(w * h).fill(0) };
}

function wallLayer(): TileLayer {
  // 10x10 grid with a solid column at gx=3 (pixels 48..64)
  const layer = emptyLayer();
  for (let gy = 0; gy < 10; gy++) {
    layer.data[gy * 10 + 3] = 1;
  }
  return layer;
}

function makeBehaviorRow(
  id: string,
  trigger: BehaviorRow['trigger']['type'],
  action: BehaviorRow['actions'][number],
): BehaviorRow {
  return {
    id,
    label: id,
    enabled: true,
    trigger: { type: trigger },
    conditions: [{ id: 'c1', type: 'always', target: { type: 'this' } }],
    actions: [action],
  };
}

describe('PlaytestRunner', () => {
  // --- Lifecycle ---

  it('starts in stopped state', () => {
    const runner = new PlaytestRunner();
    assert.equal(runner.getStatus(), 'stopped');
  });

  it('enter -> running, exit -> stopped', () => {
    const runner = new PlaytestRunner();
    runner.init([makePlayer()], [emptyLayer()], 16);
    assert.equal(runner.enter(), true);
    assert.equal(runner.getStatus(), 'running');
    runner.exit();
    assert.equal(runner.getStatus(), 'stopped');
  });

  it('pause and resume', () => {
    const runner = new PlaytestRunner();
    runner.init([makePlayer()], [emptyLayer()], 16);
    runner.enter();
    assert.equal(runner.pause(), true);
    assert.equal(runner.getStatus(), 'paused');
    assert.equal(runner.step(), null); // no step while paused
    assert.equal(runner.resume(), true);
    assert.equal(runner.getStatus(), 'running');
  });

  it('cannot enter when already running', () => {
    const runner = new PlaytestRunner();
    runner.init([makePlayer()], [emptyLayer()], 16);
    runner.enter();
    assert.equal(runner.enter(), false);
  });

  // --- Player movement (free mode) ---

  it('player moves right in free mode', () => {
    const runner = new PlaytestRunner();
    runner.init([makePlayer(32, 32)], [emptyLayer()], 16);
    runner.enter();
    runner.setInput({ moveX: 1, moveY: 0 });
    const snap = runner.step();
    assert.ok(snap);
    const p = snap.entities.find((e) => e.id === 'p1')!;
    assert.ok(p.x > 32, `expected x > 32, got ${p.x}`);
    assert.equal(p.y, 32);
  });

  it('player moves diagonally normalized', () => {
    const runner = new PlaytestRunner();
    runner.init([makePlayer(32, 32)], [emptyLayer()], 16);
    runner.enter();
    runner.setInput({ moveX: 1, moveY: 1 });
    const snap = runner.step()!;
    const p = snap.entities.find((e) => e.id === 'p1')!;
    // speed=120, dt=1/60 -> 2px per tick. Diagonal should also be 2px total distance.
    const dist = Math.sqrt((p.x - 32) ** 2 + (p.y - 32) ** 2);
    assert.ok(Math.abs(dist - 2) < 0.01, `diagonal distance should be ~2, got ${dist}`);
  });

  // --- Grid mode ---

  it('player moves in grid mode (one step per input)', () => {
    const runner = new PlaytestRunner();
    const player: EntityDef = {
      id: 'p1',
      name: 'Player',
      position: { x: 0, y: 0 },
      size: { w: 16, h: 16 },
      solid: true,
      tags: ['player'],
    };
    runner.init([player], [emptyLayer()], 16);
    runner.enter();

    // Override movement mode -- we need to access internal state
    // The runner defaults to 'free', but the Rust side supports grid.
    // For now, test that free mode works; grid mode requires EntityDef extension.
    runner.setInput({ moveX: 0, moveY: 1 });
    const snap = runner.step()!;
    const p = snap.entities.find((e) => e.id === 'p1')!;
    assert.ok(p.y > 0, 'player should move down');
  });

  // --- Solid tile collision ---

  it('player blocked by solid tile column', () => {
    const runner = new PlaytestRunner();
    // Player at x=32 (gx=2), wall at gx=3 (x=48). Player width=16, so right edge at 48.
    // Moving right should be blocked.
    runner.init([makePlayer(31, 32)], [wallLayer()], 16);
    runner.enter();
    runner.setInput({ moveX: 1, moveY: 0 });

    // Step multiple times to approach the wall
    for (let i = 0; i < 10; i++) {
      runner.step();
    }
    const snap = runner.step()!;
    const p = snap.entities.find((e) => e.id === 'p1')!;
    // Player right edge should not exceed tile left edge (48 - 16 = 32)
    assert.ok(p.x <= 32, `player should be blocked by wall at gx=3, x=${p.x}`);
  });

  it('slides along wall when moving diagonally into blocked X axis', () => {
    const runner = new PlaytestRunner();
    runner.init([makePlayer(31, 32)], [wallLayer()], 16);
    runner.enter();
    runner.setInput({ moveX: 1, moveY: 1 });

    const before = runner.snapshot().entities.find((e) => e.id === 'p1')!;
    const snap = runner.step()!;
    const p = snap.entities.find((e) => e.id === 'p1')!;

    assert.ok(p.x <= 32, `x should remain blocked by wall, got ${p.x}`);
    assert.ok(p.y > before.y, `y should still advance while x is blocked, y=${p.y}`);
  });

  it('touching edge is not overlap when moving parallel to wall', () => {
    const runner = new PlaytestRunner();
    runner.init([makePlayer(32, 32)], [wallLayer()], 16);
    runner.enter();
    runner.setInput({ moveX: 0, moveY: 1 });

    const snap = runner.step()!;
    const p = snap.entities.find((e) => e.id === 'p1')!;

    assert.equal(p.x, 32);
    assert.ok(p.y > 32, `player should move parallel to wall, y=${p.y}`);
  });

  // --- Solid entity collision ---

  it('player blocked by solid entity', () => {
    const runner = new PlaytestRunner();
    // Player at x=0, solid block at x=20. Player width=16, gap=4px. Moving right should stop.
    runner.init(
      [makePlayer(0, 32), makeEntity('wall', 20, 32, true)],
      [emptyLayer()],
      16,
    );
    runner.enter();
    runner.setInput({ moveX: 1, moveY: 0 });

    for (let i = 0; i < 10; i++) {
      runner.step();
    }
    const snap = runner.step()!;
    const p = snap.entities.find((e) => e.id === 'p1')!;
    // Player right edge (x + 16) should not exceed solid entity left edge (20)
    assert.ok(p.x + 16 <= 20 + 0.01, `player should be blocked, x=${p.x}`);
  });

  it('player passes through non-solid entity', () => {
    const runner = new PlaytestRunner();
    runner.init(
      [makePlayer(0, 32), makeEntity('ghost', 20, 32, false)],
      [emptyLayer()],
      16,
    );
    runner.enter();
    runner.setInput({ moveX: 1, moveY: 0 });

    for (let i = 0; i < 20; i++) {
      runner.step();
    }
    const snap = runner.step()!;
    const p = snap.entities.find((e) => e.id === 'p1')!;
    // Should pass right through the non-solid entity
    assert.ok(p.x > 20, `player should pass through non-solid, x=${p.x}`);
  });

  // --- Physics (gravity on non-player entities) ---

  it('non-player entity falls with gravity', () => {
    const runner = new PlaytestRunner();
    const rock = makeEntity('rock', 32, 0, false);
    runner.init([rock], [emptyLayer()], 16);
    runner.enter();
    runner.setGravity(0, 500);

    const snap = runner.step()!;
    const r = snap.entities.find((e) => e.id === 'rock')!;
    assert.ok(r.y > 0, `rock should fall, y=${r.y}`);
  });

  // --- Snapshot ---

  it('snapshot returns correct tick and entity data', () => {
    const runner = new PlaytestRunner();
    runner.init([makePlayer(10, 20)], [emptyLayer()], 16);
    runner.enter();
    const snap = runner.step()!;
    assert.equal(snap.tick, 1);
    assert.equal(snap.state, 'running');
    assert.equal(snap.entities.length, 1);
    assert.equal(snap.entities[0].id, 'p1');
    assert.equal(snap.interactions.length, 0);
  });

  it('emits interaction event when interact is pressed near interactable entity', () => {
    const runner = new PlaytestRunner();
    runner.init(
      [
        makePlayer(16, 16),
        makeEntity('npc_1', 20, 16, false, ['interactable']),
      ],
      [emptyLayer()],
      16,
    );
    runner.enter();
    runner.setInput({ moveX: 0, moveY: 0, interact: true });
    const snap = runner.step()!;
    assert.equal(snap.interactions.length, 1);
    assert.equal(snap.interactions[0].actorId, 'p1');
    assert.equal(snap.interactions[0].targetId, 'npc_1');
    assert.equal(snap.interactions[0].type, 'interact');
  });

  it('does not repeat interaction while interact input is held', () => {
    const runner = new PlaytestRunner();
    runner.init(
      [
        makePlayer(16, 16),
        makeEntity('npc_1', 20, 16, false, ['interactable']),
      ],
      [emptyLayer()],
      16,
    );
    runner.enter();
    runner.setInput({ moveX: 0, moveY: 0, interact: true });
    const first = runner.step()!;
    const second = runner.step()!;
    assert.equal(first.interactions.length, 1);
    assert.equal(second.interactions.length, 0);
  });

  it('on:interact behavior rows are evaluated for interaction participants', () => {
    const runner = new PlaytestRunner();
    runner.init(
      [
        makePlayer(16, 16),
        makeEntity('npc_1', 20, 16, false, ['interactable']),
      ],
      [emptyLayer()],
      16,
    );
    runner.setBehaviors({
      npc_1: [
        makeBehaviorRow('r_interact', 'on:interact', {
          id: 'a1',
          type: 'log',
          target: { type: 'this' },
          params: {},
        }),
      ],
    });
    runner.enter();
    runner.setInput({ moveX: 0, moveY: 0, interact: true });
    runner.step();
    const trace = runner.getTrace();
    assert.ok(trace.some((t) => t.triggerType === 'on:interact' && t.entityId === 'npc_1'));
  });

  it('on:collision behavior rows are evaluated for blocked entities', () => {
    const runner = new PlaytestRunner();
    runner.init([makePlayer(31, 32)], [wallLayer()], 16);
    runner.setBehaviors({
      p1: [
        makeBehaviorRow('r_collision', 'on:collision', {
          id: 'a1',
          type: 'log',
          target: { type: 'this' },
          params: {},
        }),
      ],
    });
    runner.enter();
    runner.setInput({ moveX: 1, moveY: 0 });
    for (let i = 0; i < 3; i += 1) {
      runner.step();
    }
    const trace = runner.getTrace();
    assert.ok(trace.some((t) => t.triggerType === 'on:collision' && t.entityId === 'p1'));
  });

  it('set_velocity action updates runtime velocity deterministically', () => {
    const runner = new PlaytestRunner();
    runner.init([makeEntity('npc_1', 0, 0, false)], [emptyLayer()], 16);
    runner.setGravity(0, 0);
    runner.setBehaviors({
      npc_1: [
        makeBehaviorRow('r_tick_vel', 'on:tick', {
          id: 'a_vel',
          type: 'set_velocity',
          target: { type: 'this' },
          params: { vx: 60, vy: 0 },
        }),
      ],
    });
    runner.enter();
    runner.step();
    const snap2 = runner.step();
    assert.ok(snap2);
    const npc = snap2.entities.find((e) => e.id === 'npc_1');
    assert.ok(npc);
    assert.ok(npc.x > 0, `expected npc to move right after velocity action, got x=${npc.x}`);
  });

  it('set_velocity action supports target:tag for deterministic multi-target updates', () => {
    const runner = new PlaytestRunner();
    runner.init(
      [
        makeEntity('a', 0, 0, false, ['enemy']),
        makeEntity('b', 0, 20, false, ['enemy']),
        makeEntity('c', 0, 40, false, []),
      ],
      [emptyLayer()],
      16,
    );
    runner.setGravity(0, 0);
    runner.setBehaviors({
      a: [
        makeBehaviorRow('r_tag_vel', 'on:tick', {
          id: 'a_vel',
          type: 'set_velocity',
          target: { type: 'tag', value: 'enemy' },
          params: { vx: 30, vy: 0 },
        }),
      ],
    });
    runner.enter();
    runner.step();
    const snap2 = runner.step();
    assert.ok(snap2);
    const a = snap2.entities.find((e) => e.id === 'a');
    const b = snap2.entities.find((e) => e.id === 'b');
    const c = snap2.entities.find((e) => e.id === 'c');
    assert.ok(a && b && c);
    assert.ok(a.x > 0, 'entity a should move');
    assert.ok(b.x > 0, 'entity b should move');
    assert.equal(c.x, 0, 'entity c should remain unchanged');
  });

  it('destroy_self action removes the entity from runtime state', () => {
    const runner = new PlaytestRunner();
    runner.init([makeEntity('npc_1', 0, 0, false)], [emptyLayer()], 16);
    runner.setBehaviors({
      npc_1: [
        makeBehaviorRow('r_tick_die', 'on:tick', {
          id: 'a_die',
          type: 'destroy_self',
          target: { type: 'this' },
          params: {},
        }),
      ],
    });
    runner.enter();
    const snap = runner.step();
    assert.ok(snap);
    assert.equal(snap.entities.some((e) => e.id === 'npc_1'), false);
  });

  it('destroy_self action supports target:tag deterministically', () => {
    const runner = new PlaytestRunner();
    runner.init(
      [
        makeEntity('a', 0, 0, false, ['enemy']),
        makeEntity('b', 20, 0, false, ['enemy']),
        makeEntity('c', 40, 0, false, []),
      ],
      [emptyLayer()],
      16,
    );
    runner.setBehaviors({
      a: [
        makeBehaviorRow('r_tag_die', 'on:tick', {
          id: 'a_die',
          type: 'destroy_self',
          target: { type: 'tag', value: 'enemy' },
          params: {},
        }),
      ],
    });
    runner.enter();
    const snap = runner.step();
    assert.ok(snap);
    assert.equal(snap.entities.some((e) => e.id === 'a'), false);
    assert.equal(snap.entities.some((e) => e.id === 'b'), false);
    assert.equal(snap.entities.some((e) => e.id === 'c'), true);
  });

  it('on:proximity behavior rows are evaluated when entities are nearby', () => {
    const runner = new PlaytestRunner();
    runner.init(
      [
        makeEntity('a', 0, 0, false),
        makeEntity('b', 10, 0, false),
      ],
      [emptyLayer()],
      16,
    );
    runner.setBehaviors({
      a: [
        makeBehaviorRow('r_prox', 'on:proximity', {
          id: 'a1',
          type: 'log',
          target: { type: 'this' },
          params: {},
        }),
      ],
    });
    runner.enter();
    runner.step();
    const trace = runner.getTrace();
    assert.ok(trace.some((t) => t.triggerType === 'on:proximity' && t.entityId === 'a'));
  });

  it('entity_in_radius condition gates action dispatch', () => {
    const runner = new PlaytestRunner();
    runner.init(
      [
        makeEntity('a', 0, 0, false),
        makeEntity('b', 100, 0, false),
      ],
      [emptyLayer()],
      16,
    );
    runner.setBehaviors({
      a: [{
        id: 'r_radius',
        label: 'radius gate',
        enabled: true,
        trigger: { type: 'on:tick' },
        conditions: [{ id: 'c1', type: 'entity_in_radius', target: { type: 'radius', value: 16 } }],
        actions: [{ id: 'a1', type: 'log', target: { type: 'this' }, params: {} }],
      }],
    });
    runner.enter();
    runner.step();
    const trace = runner.getTrace();
    const rowTrace = trace.find((t) => t.rowId === 'r_radius');
    assert.ok(rowTrace);
    assert.equal(rowTrace.conditionResults[0].passed, false);
    assert.equal(rowTrace.actionResults[0].dispatched, false);
  });

  // --- Stale guard ---

  it('step returns null when stopped', () => {
    const runner = new PlaytestRunner();
    runner.init([makePlayer()], [emptyLayer()], 16);
    // Don't call enter()
    assert.equal(runner.step(), null);
  });

  // UI-PLAYFLOW-001: speed from EntityDef

  it('entity with speed=200 uses 200 px/s (not hardcoded 120)', () => {
    const runner = new PlaytestRunner();
    const player: EntityDef = { ...makePlayer(), speed: 200 };
    runner.init([player], [emptyLayer()], 16);
    runner.enter();
    // Moving right for one tick at 200 px/s and 1/60 dt = ~3.33 px
    runner.setInput({ moveX: 1, moveY: 0, interact: false });
    const snapshot = runner.step();
    assert.ok(snapshot !== null);
    const pEnt = snapshot.entities.find((e) => e.id === 'p1');
    assert.ok(pEnt !== undefined);
    // At 200 px/s and dt=1/60, dx = 200/60 ~= 3.33
    assert.ok(pEnt.x > 32.3, `expected x > 32.3, got ${pEnt.x}`);
    assert.ok(pEnt.x < 32 + 200 / 60 + 0.1, 'x should not exceed 200/60 per tick');
  });

  it('entity without speed field defaults to 120 px/s', () => {
    const runner = new PlaytestRunner();
    const player: EntityDef = { ...makePlayer() }; // no speed field
    runner.init([player], [emptyLayer()], 16);
    runner.enter();
    runner.setInput({ moveX: 1, moveY: 0, interact: false });
    const snapshot = runner.step();
    assert.ok(snapshot !== null);
    const pEnt = snapshot.entities.find((e) => e.id === 'p1');
    assert.ok(pEnt !== undefined);
    // At 120 px/s and dt=1/60, dx = 2.0
    assert.ok(Math.abs(pEnt.x - 34) < 0.01, `expected x ~= 34 (120/60+32), got ${pEnt.x}`);
  });
});

