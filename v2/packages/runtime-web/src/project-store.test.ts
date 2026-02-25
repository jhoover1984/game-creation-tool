import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CommandBus } from './command-bus.js';
import { ProjectStore } from './project-store.js';

describe('ProjectStore', () => {
  function setup() {
    const bus = new CommandBus();
    const store = new ProjectStore(bus);
    store.createProject('Test', 10, 10, 16);
    return { bus, store };
  }

  it('creates a project with default layer', () => {
    const { store } = setup();
    assert.equal(store.manifest.name, 'Test');
    assert.equal(store.tileLayers.length, 1);
    assert.equal(store.tileLayers[0].data.length, 100);
    assert.equal(store.entities.length, 0);
  });

  it('paints and erases tiles via command bus', () => {
    const { bus, store } = setup();

    bus.dispatch({ type: 'tile:set', payload: { layerId: 'layer-0', x: 3, y: 4, tileId: 5 } });
    assert.equal(store.tileLayers[0].data[4 * 10 + 3], 5);

    bus.dispatch({ type: 'tile:set', payload: { layerId: 'layer-0', x: 3, y: 4, tileId: 0 } });
    assert.equal(store.tileLayers[0].data[4 * 10 + 3], 0);
  });

  it('creates and deletes entities via command bus', () => {
    const { bus, store } = setup();

    bus.dispatch({ type: 'entity:create', payload: { name: 'Player', x: 32, y: 48 } });
    assert.equal(store.entities.length, 1);
    assert.equal(store.entities[0].name, 'Player');

    const entityId = store.entities[0].id;
    bus.dispatch({ type: 'entity:delete', payload: { entityId } });
    assert.equal(store.entities.length, 0);
  });

  it('moves entities via command bus', () => {
    const { bus, store } = setup();

    bus.dispatch({ type: 'entity:create', payload: { name: 'NPC', x: 0, y: 0 } });
    const entityId = store.entities[0].id;

    bus.dispatch({ type: 'entity:move', payload: { entityId, x: 100, y: 200 } });
    assert.deepEqual(store.entities[0].position, { x: 100, y: 200 });
  });

  it('updates entity visual fields via command bus', () => {
    const { bus, store } = setup();
    bus.dispatch({ type: 'entity:create', payload: { name: 'NPC', x: 0, y: 0 } });
    const entityId = store.entities[0].id;

    bus.dispatch({
      type: 'entity:updateVisual',
      payload: { entityId, solid: true, spriteId: 'asset_sprite_hero', animationClipId: 'asset_clip_walk' },
    });

    assert.equal(store.entities[0].solid, true);
    assert.equal(store.entities[0].spriteId, 'asset_sprite_hero');
    assert.equal(store.entities[0].animationClipId, 'asset_clip_walk');
  });

  it('selects entities and finds entity at point', () => {
    const { bus, store } = setup();

    bus.dispatch({ type: 'entity:create', payload: { name: 'A', x: 0, y: 0 } });
    bus.dispatch({ type: 'entity:create', payload: { name: 'B', x: 32, y: 32 } });

    assert.equal(store.selectedEntityId, null);

    store.selectEntity(store.entities[0].id);
    assert.equal(store.selectedEntityId, store.entities[0].id);

    // Point inside entity B (32,32 with size 16x16)
    const found = store.entityAtPoint(40, 40);
    assert.equal(found?.name, 'B');

    // Point outside all entities
    assert.equal(store.entityAtPoint(200, 200), undefined);

    // Deselect
    store.selectEntity(null);
    assert.equal(store.selectedEntityId, null);
  });

  it('undo/redo tile paint restores old value', () => {
    const { bus, store } = setup();

    // Paint tile 5, then paint tile 9 on same cell
    bus.dispatch({ type: 'tile:set', payload: { layerId: 'layer-0', x: 2, y: 3, tileId: 5 } });
    bus.dispatch({ type: 'tile:set', payload: { layerId: 'layer-0', x: 2, y: 3, tileId: 9 } });
    assert.equal(store.tileLayers[0].data[3 * 10 + 2], 9);

    // Undo should restore to 5 (not 0!)
    store.undo();
    assert.equal(store.tileLayers[0].data[3 * 10 + 2], 5);

    // Undo again should restore to 0
    store.undo();
    assert.equal(store.tileLayers[0].data[3 * 10 + 2], 0);

    // Redo both
    store.redo();
    assert.equal(store.tileLayers[0].data[3 * 10 + 2], 5);
    store.redo();
    assert.equal(store.tileLayers[0].data[3 * 10 + 2], 9);
  });

  it('groups multi-tile paint into a single undo batch', () => {
    const { bus, store } = setup();

    assert.equal(store.beginUndoBatch(), true);
    bus.dispatch({ type: 'tile:set', payload: { layerId: 'layer-0', x: 1, y: 1, tileId: 3 } });
    bus.dispatch({ type: 'tile:set', payload: { layerId: 'layer-0', x: 2, y: 1, tileId: 4 } });
    assert.equal(store.endUndoBatch(), true);

    assert.equal(store.tileLayers[0].data[1 * 10 + 1], 3);
    assert.equal(store.tileLayers[0].data[1 * 10 + 2], 4);

    store.undo();
    assert.equal(store.tileLayers[0].data[1 * 10 + 1], 0);
    assert.equal(store.tileLayers[0].data[1 * 10 + 2], 0);

    store.redo();
    assert.equal(store.tileLayers[0].data[1 * 10 + 1], 3);
    assert.equal(store.tileLayers[0].data[1 * 10 + 2], 4);
  });

  it('empty undo batch is a no-op', () => {
    const { store } = setup();
    assert.equal(store.beginUndoBatch(), true);
    assert.equal(store.endUndoBatch(), true);
    assert.equal(store.canUndo(), false);
  });

  it('undo/redo entity create removes and re-adds', () => {
    const { bus, store } = setup();

    bus.dispatch({ type: 'entity:create', payload: { name: 'Hero', x: 10, y: 20 } });
    const heroId = store.entities[0].id;
    assert.equal(store.entities.length, 1);

    store.undo();
    assert.equal(store.entities.length, 0);

    store.redo();
    assert.equal(store.entities.length, 1);
    assert.equal(store.entities[0].id, heroId);
    assert.equal(store.entities[0].name, 'Hero');
  });

  it('undo/redo entity delete restores full entity', () => {
    const { bus, store } = setup();

    bus.dispatch({ type: 'entity:create', payload: { name: 'NPC', x: 50, y: 60 } });
    const npcId = store.entities[0].id;

    bus.dispatch({ type: 'entity:delete', payload: { entityId: npcId } });
    assert.equal(store.entities.length, 0);

    // Undo delete should restore the entity with all its properties
    store.undo();
    assert.equal(store.entities.length, 1);
    assert.equal(store.entities[0].id, npcId);
    assert.equal(store.entities[0].name, 'NPC');
    assert.deepEqual(store.entities[0].position, { x: 50, y: 60 });
  });

  it('undo/redo entity move restores old position', () => {
    const { bus, store } = setup();

    bus.dispatch({ type: 'entity:create', payload: { name: 'Player', x: 10, y: 20 } });
    const playerId = store.entities[0].id;

    bus.dispatch({ type: 'entity:move', payload: { entityId: playerId, x: 100, y: 200 } });
    assert.deepEqual(store.entities[0].position, { x: 100, y: 200 });

    store.undo();
    assert.deepEqual(store.entities[0].position, { x: 10, y: 20 });

    store.redo();
    assert.deepEqual(store.entities[0].position, { x: 100, y: 200 });
  });

  it('undo/redo entity visual update restores previous values', () => {
    const { bus, store } = setup();
    bus.dispatch({ type: 'entity:create', payload: { name: 'Player', x: 10, y: 20 } });
    const playerId = store.entities[0].id;

    bus.dispatch({
      type: 'entity:updateVisual',
      payload: { entityId: playerId, solid: true, spriteId: 'asset_sprite_player' },
    });
    assert.equal(store.entities[0].solid, true);
    assert.equal(store.entities[0].spriteId, 'asset_sprite_player');

    store.undo();
    assert.equal(store.entities[0].solid, false);
    assert.equal(store.entities[0].spriteId, undefined);

    store.redo();
    assert.equal(store.entities[0].solid, true);
    assert.equal(store.entities[0].spriteId, 'asset_sprite_player');
  });

  it('new command clears redo stack', () => {
    const { bus, store } = setup();

    bus.dispatch({ type: 'tile:set', payload: { layerId: 'layer-0', x: 0, y: 0, tileId: 1 } });
    store.undo();
    assert.ok(store.canRedo());

    bus.dispatch({ type: 'tile:set', payload: { layerId: 'layer-0', x: 1, y: 1, tileId: 2 } });
    assert.ok(!store.canRedo());
  });

  it('deleting selected entity clears selection', () => {
    const { bus, store } = setup();

    bus.dispatch({ type: 'entity:create', payload: { name: 'Target', x: 0, y: 0 } });
    const targetId = store.entities[0].id;
    store.selectEntity(targetId);
    assert.equal(store.selectedEntityId, targetId);

    bus.dispatch({ type: 'entity:delete', payload: { entityId: targetId } });
    assert.equal(store.selectedEntityId, null);
  });

  it('save/load roundtrips correctly', () => {
    const { bus, store } = setup();

    bus.dispatch({ type: 'tile:set', payload: { layerId: 'layer-0', x: 0, y: 0, tileId: 7 } });
    bus.dispatch({ type: 'entity:create', payload: { name: 'Hero', x: 16, y: 32 } });

    const json = store.saveToJson();

    const bus2 = new CommandBus();
    const store2 = new ProjectStore(bus2);
    store2.loadFromJson(json);

    assert.equal(store2.manifest.name, 'Test');
    assert.equal(store2.tileLayers[0].data[0], 7);
    assert.equal(store2.entities.length, 1);
    assert.equal(store2.entities[0].name, 'Hero');
  });

  it('save/load preserves entity slots', () => {
    const { bus, store } = setup();

    bus.dispatch({ type: 'entity:create', payload: { name: 'Sword', x: 0, y: 0 } });
    bus.dispatch({ type: 'entity:create', payload: { name: 'Player', x: 0, y: 0 } });
    const swordId = store.entities[0].id;
    const playerId = store.entities[1].id;

    bus.dispatch({
      type: 'entity:slot:attach',
      payload: {
        entityId: swordId,
        slotName: 'grip',
        slotType: 'prop',
        parentEntityId: playerId,
        anchorName: 'hand_r',
        occlusionHint: 'in-front',
      },
    });

    const json = store.saveToJson();
    const store2 = new ProjectStore(new CommandBus());
    store2.loadFromJson(json);

    assert.equal(store2.entities.length, 2);
    const loadedSword = store2.entities.find((e) => e.id === swordId);
    assert.ok(loadedSword);
    assert.equal(loadedSword?.slots?.length, 1);
    assert.equal(loadedSword?.slots?.[0].slotName, 'grip');
    assert.equal(loadedSword?.slots?.[0].parentEntityId, playerId);
    assert.equal(loadedSword?.slots?.[0].occlusionHint, 'in-front');
  });

  it('new project initializes default story quest graph', () => {
    const bus = new CommandBus();
    const store = new ProjectStore(bus);
    store.createProject('StoryDefault', 10, 10, 16);

    assert.equal(store.questGraph.schemaVersion, '2.0.0');
    assert.equal(store.questGraph.nodes.length, 2);
    assert.equal(store.questGraph.edges.length, 1);
    assert.equal(store.questGraph.nodes[0].kind, 'start');
  });

  it('save/load preserves story quest graph', () => {
    const bus = new CommandBus();
    const store = new ProjectStore(bus);
    store.createProject('StoryPersist', 10, 10, 16);
    store.questGraph.nodes[0].name = 'Edited Start';
    store.questGraph.nodes[1].kind = 'reward';

    const json = store.saveToJson();
    const store2 = new ProjectStore(new CommandBus());
    store2.loadFromJson(json);

    const start = store2.questGraph.nodes.find((n) => n.nodeId === 'node_start');
    const end = store2.questGraph.nodes.find((n) => n.nodeId === 'node_end');
    assert.equal(start?.name, 'Edited Start');
    assert.equal(end?.kind, 'reward');
  });

  it('load rejects JSON missing required top-level fields', () => {
    const bus = new CommandBus();
    const store = new ProjectStore(bus);
    const invalid = JSON.stringify({
      manifest: { id: 'p1' },
      entities: [],
    });

    assert.throws(
      () => store.loadFromJson(invalid),
      /Invalid project JSON/
    );
  });

  it('load rejects invalid entity shape', () => {
    const bus = new CommandBus();
    const store = new ProjectStore(bus);
    const invalid = JSON.stringify({
      manifest: {
        id: 'proj_1',
        name: 'Bad',
        version: '0.1.0',
        resolution: { width: 320, height: 240 },
        tileSize: 16,
        createdAt: 'now',
        updatedAt: 'now',
      },
      tileLayers: [],
      entities: [
        {
          id: 'ent_1',
          name: 'Broken',
          position: { x: 0, y: 0 },
          size: { w: 16, h: 16 },
          solid: false,
          tags: 'not-an-array'
        },
      ],
    });

    assert.throws(
      () => store.loadFromJson(invalid),
      /Invalid project JSON/
    );
  });

  it('load accepts valid quest graph semantics when story is present', () => {
    const bus = new CommandBus();
    const store = new ProjectStore(bus);
    const valid = JSON.stringify({
      manifest: {
        id: 'proj_1',
        name: 'Story Project',
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
          nodes: [
            { nodeId: 'node_start', kind: 'start', name: 'Start' },
            { nodeId: 'node_end', kind: 'end', name: 'End' },
          ],
          edges: [{ from: 'node_start', to: 'node_end' }],
        },
      },
    });

    assert.doesNotThrow(() => store.loadFromJson(valid));
  });

  it('load rejects quest graph with missing edge endpoint', () => {
    const bus = new CommandBus();
    const store = new ProjectStore(bus);
    const invalid = JSON.stringify({
      manifest: {
        id: 'proj_1',
        name: 'Broken Story',
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
          nodes: [{ nodeId: 'node_start', kind: 'start', name: 'Start' }],
          edges: [{ from: 'node_start', to: 'node_missing' }],
        },
      },
    });

    assert.throws(
      () => store.loadFromJson(invalid),
      /Invalid project JSON \(semantic\):/
    );
  });

  it('load rejects quest graph with no start node', () => {
    const bus = new CommandBus();
    const store = new ProjectStore(bus);
    const invalid = JSON.stringify({
      manifest: {
        id: 'proj_1',
        name: 'No Start Story',
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
          nodes: [{ nodeId: 'node_a', kind: 'objective', name: 'A' }],
          edges: [],
        },
      },
    });

    assert.throws(
      () => store.loadFromJson(invalid),
      /QUEST_START_NODE_MISSING/
    );
  });

  it('load rejects quest graph with multiple start nodes', () => {
    const bus = new CommandBus();
    const store = new ProjectStore(bus);
    const invalid = JSON.stringify({
      manifest: {
        id: 'proj_1',
        name: 'Multi Start Story',
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
          nodes: [
            { nodeId: 'node_start_1', kind: 'start', name: 'Start 1' },
            { nodeId: 'node_start_2', kind: 'start', name: 'Start 2' }
          ],
          edges: [],
        },
      },
    });

    assert.throws(
      () => store.loadFromJson(invalid),
      /QUEST_START_NODE_MULTIPLE/
    );
  });

  it('load allows quest graph with unreachable node (warning only)', () => {
    const bus = new CommandBus();
    const store = new ProjectStore(bus);
    const warningOnly = JSON.stringify({
      manifest: {
        id: 'proj_1',
        name: 'Warning Story',
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
          nodes: [
            { nodeId: 'node_start', kind: 'start', name: 'Start' },
            { nodeId: 'node_end', kind: 'end', name: 'End' },
            { nodeId: 'node_orphan', kind: 'reward', name: 'Orphan' }
          ],
          edges: [{ from: 'node_start', to: 'node_end' }],
        },
      },
    });

    assert.doesNotThrow(() => store.loadFromJson(warningOnly));
    const diagnostics = store.getValidationDiagnostics();
    assert.ok(diagnostics.some((d) => d.code === 'QUEST_NODE_UNREACHABLE'));
    assert.ok(diagnostics.some((d) => d.severity === 'warning'));
  });

  it('full authoring loop smoke test', () => {
    const { bus, store } = setup();
    const events: string[] = [];
    bus.subscribe((e) => events.push(e.type));

    // 1. Paint tiles
    bus.dispatch({ type: 'tile:set', payload: { layerId: 'layer-0', x: 0, y: 0, tileId: 1 } });
    bus.dispatch({ type: 'tile:set', payload: { layerId: 'layer-0', x: 1, y: 0, tileId: 2 } });

    // 2. Create entity
    bus.dispatch({ type: 'entity:create', payload: { name: 'Player', x: 32, y: 48 } });
    const playerId = store.entities[0].id;

    // 3. Select entity
    store.selectEntity(playerId);
    assert.equal(store.selectedEntityId, playerId);

    // 4. Move entity
    bus.dispatch({ type: 'entity:move', payload: { entityId: playerId, x: 64, y: 64 } });

    // 5. Undo move -- position restores
    store.undo();
    assert.deepEqual(store.entities[0].position, { x: 32, y: 48 });

    // 6. Redo move
    store.redo();
    assert.deepEqual(store.entities[0].position, { x: 64, y: 64 });

    // 7. Undo all the way back
    store.undo(); // move
    store.undo(); // create entity
    store.undo(); // tile 2
    store.undo(); // tile 1
    assert.equal(store.entities.length, 0);
    assert.equal(store.tileLayers[0].data[0], 0);
    assert.equal(store.tileLayers[0].data[1], 0);

    // 8. Redo everything
    store.redo(); // tile 1
    store.redo(); // tile 2
    store.redo(); // create entity
    store.redo(); // move
    assert.equal(store.entities.length, 1);
    assert.equal(store.tileLayers[0].data[0], 1);
    assert.equal(store.tileLayers[0].data[1], 2);
    assert.deepEqual(store.entities[0].position, { x: 64, y: 64 });

    // 9. Save and reload
    const json = store.saveToJson();
    const bus2 = new CommandBus();
    const store2 = new ProjectStore(bus2);
    store2.loadFromJson(json);
    assert.equal(store2.tileLayers[0].data[0], 1);
    assert.equal(store2.entities[0].position.x, 64);

    // 10. Verify events
    assert.ok(events.includes('tile:set:done'));
    assert.ok(events.includes('entity:created'));
    assert.ok(events.includes('entity:moved'));
  });

  it('renames entity via command bus', () => {
    const { bus, store } = setup();

    bus.dispatch({ type: 'entity:create', payload: { name: 'Old', x: 0, y: 0 } });
    const entityId = store.entities[0].id;

    const event = bus.dispatch({ type: 'entity:rename', payload: { entityId, name: 'New' } });
    assert.ok(event, 'should return a non-null event');
    assert.equal(event?.type, 'entity:renamed');
    assert.equal(store.entities[0].name, 'New');
  });

  it('rename of nonexistent entity returns null and makes no change', () => {
    const { bus, store } = setup();

    bus.dispatch({ type: 'entity:create', payload: { name: 'A', x: 0, y: 0 } });
    const result = bus.dispatch({ type: 'entity:rename', payload: { entityId: 'does-not-exist', name: 'X' } });
    assert.equal(result, null);
    assert.equal(store.entities[0].name, 'A');
  });

  it('undo/redo entity rename restores old and new names', () => {
    const { bus, store } = setup();

    bus.dispatch({ type: 'entity:create', payload: { name: 'Alpha', x: 0, y: 0 } });
    const entityId = store.entities[0].id;

    bus.dispatch({ type: 'entity:rename', payload: { entityId, name: 'Beta' } });
    assert.equal(store.entities[0].name, 'Beta');

    store.undo();
    assert.equal(store.entities[0].name, 'Alpha');

    store.redo();
    assert.equal(store.entities[0].name, 'Beta');
  });

  it('sets effect field coupling via command bus', () => {
    const { bus, store } = setup();
    const event = bus.dispatch({
      type: 'effects:setFieldCoupling',
      payload: { fieldId: 'wind.global', influence: 0.65 },
    });
    assert.ok(event);
    assert.equal(store.effectState.fieldLink.fieldId, 'wind.global');
    assert.equal(store.effectState.fieldLink.influence, 0.65);
  });

  it('undo/redo effect field coupling restores before/after states', () => {
    const { bus, store } = setup();
    bus.dispatch({
      type: 'effects:setFieldCoupling',
      payload: { fieldId: 'wind.global', influence: 0.4 },
    });
    assert.equal(store.effectState.fieldLink.fieldId, 'wind.global');

    store.undo();
    assert.equal(store.effectState.fieldLink.fieldId, null);
    assert.equal(store.effectState.fieldLink.influence, 0);

    store.redo();
    assert.equal(store.effectState.fieldLink.fieldId, 'wind.global');
    assert.equal(store.effectState.fieldLink.influence, 0.4);
  });

  it('rejects unknown effect field IDs', () => {
    const { bus, store } = setup();
    const before = structuredClone(store.effectState);
    const event = bus.dispatch({
      type: 'effects:setFieldCoupling',
      payload: { fieldId: 'invalid.field', influence: 0.8 },
    } as never);
    assert.equal(event, null);
    assert.deepEqual(store.effectState, before);
  });

  // UI-PLAYFLOW-001: entity:setSpeed command and speed persistence

  it('entity speed survives save/load round-trip', () => {
    const { bus, store } = setup();
    bus.dispatch({ type: 'entity:create', payload: { name: 'Hero', x: 0, y: 0 } });
    const entityId = store.entities[0].id;
    bus.dispatch({ type: 'entity:setSpeed', payload: { entityId, speed: 240 } });

    const json = store.saveToJson();

    const bus2 = new CommandBus();
    const store2 = new ProjectStore(bus2);
    store2.loadFromJson(json);
    assert.equal(store2.entities[0]?.speed, 240, 'speed should survive save/load round-trip');
  });

  it('entity:setSpeed sets speed on the entity', () => {
    const { bus, store } = setup();
    bus.dispatch({ type: 'entity:create', payload: { name: 'Hero', x: 0, y: 0 } });
    const entityId = store.entities[0].id;
    assert.equal(store.entities[0].speed, undefined);

    bus.dispatch({ type: 'entity:setSpeed', payload: { entityId, speed: 200 } });
    assert.equal(store.entities[0].speed, 200);
  });

  it('entity:setSpeed undo restores previous speed', () => {
    const { bus, store } = setup();
    bus.dispatch({ type: 'entity:create', payload: { name: 'Hero', x: 0, y: 0 } });
    const entityId = store.entities[0].id;

    bus.dispatch({ type: 'entity:setSpeed', payload: { entityId, speed: 200 } });
    assert.equal(store.entities[0].speed, 200);

    store.undo();
    assert.equal(store.entities[0].speed, undefined, 'undo should restore original undefined speed');
  });

  it('entity:setSpeed redo reapplies new speed', () => {
    const { bus, store } = setup();
    bus.dispatch({ type: 'entity:create', payload: { name: 'Hero', x: 0, y: 0 } });
    const entityId = store.entities[0].id;

    bus.dispatch({ type: 'entity:setSpeed', payload: { entityId, speed: 200 } });
    store.undo();
    assert.equal(store.entities[0].speed, undefined);
    store.redo();
    assert.equal(store.entities[0].speed, 200);
  });

  it('entity:setSpeed no-op (120 on entity with no speed) does not push extra undo record', () => {
    const { bus, store } = setup();
    bus.dispatch({ type: 'entity:create', payload: { name: 'Hero', x: 0, y: 0 } });
    const entityId = store.entities[0].id;
    // After create, canUndo is true (one create record). Setting speed to 120 (same as
    // effective default of 120 for undefined speed) should NOT push an additional record.
    bus.dispatch({ type: 'entity:setSpeed', payload: { entityId, speed: 120 } });
    // One undo should revert the create (removing entity), leaving stack empty.
    // If speed had been pushed, undo would only revert speed, entity would remain.
    store.undo();
    assert.equal(store.entities.length, 0, 'single undo should remove entity (no extra speed record)');
    assert.ok(!store.canUndo(), 'stack should be empty after one undo');
  });
});

