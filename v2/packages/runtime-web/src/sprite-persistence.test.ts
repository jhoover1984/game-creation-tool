/**
 * sprite-persistence.test.ts -- SPRITE-PERSIST-001
 *
 * Verifies that sprite pixel buffers round-trip through ProjectStore
 * saveToJson / loadFromJson without data loss or corruption.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CommandBus } from './command-bus.js';
import { ProjectStore } from './project-store.js';

function makeStore(): { bus: CommandBus; store: ProjectStore } {
  const bus = new CommandBus();
  const store = new ProjectStore(bus);
  store.createProject('SpriteTest', 4, 4, 16);
  return { bus, store };
}

describe('SPRITE-PERSIST-001: ProjectStore sprite round-trip', () => {
  it('setSpriteAsset stores asset and getAllSpriteAssets returns it', () => {
    const { store } = makeStore();
    const pixels = new Array(64).fill(0); // 4*4*4

    store.setSpriteAsset({ assetId: 'spr-1', width: 4, height: 4, pixels });
    const all = store.getAllSpriteAssets();
    assert.ok('spr-1' in all, 'sprite must be stored by assetId');
    assert.equal(all['spr-1'].width, 4);
    assert.equal(all['spr-1'].height, 4);
    assert.equal(all['spr-1'].pixels.length, 64);
  });

  it('sprite pixel data survives saveToJson -> loadFromJson roundtrip', () => {
    const { store } = makeStore();

    const pixels = new Array(64).fill(0);
    // Paint a red pixel at (2, 1): index = (1 * 4 + 2) * 4 = 24
    pixels[24] = 255;
    pixels[25] = 0;
    pixels[26] = 0;
    pixels[27] = 255;

    store.setSpriteAsset({ assetId: 'spr-2', width: 4, height: 4, pixels });

    const json = store.saveToJson();

    const bus2 = new CommandBus();
    const store2 = new ProjectStore(bus2);
    store2.loadFromJson(json);

    const loaded = store2.getAllSpriteAssets();
    assert.ok('spr-2' in loaded, 'sprite must survive save/load roundtrip');
    assert.equal(loaded['spr-2'].width, 4);
    assert.equal(loaded['spr-2'].height, 4);
    assert.equal(loaded['spr-2'].pixels[24], 255, 'R channel must survive');
    assert.equal(loaded['spr-2'].pixels[25], 0, 'G channel must survive');
    assert.equal(loaded['spr-2'].pixels[26], 0, 'B channel must survive');
    assert.equal(loaded['spr-2'].pixels[27], 255, 'A channel must survive');
  });

  it('multiple sprites survive roundtrip', () => {
    const { store } = makeStore();

    store.setSpriteAsset({ assetId: 'spr-a', width: 2, height: 2, pixels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16] });
    store.setSpriteAsset({ assetId: 'spr-b', width: 2, height: 2, pixels: new Array(16).fill(200) });

    const json = store.saveToJson();

    const store2 = new ProjectStore(new CommandBus());
    store2.loadFromJson(json);

    const all = store2.getAllSpriteAssets();
    assert.ok('spr-a' in all, 'spr-a must survive roundtrip');
    assert.ok('spr-b' in all, 'spr-b must survive roundtrip');
    assert.equal(all['spr-a'].pixels[0], 1);
    assert.equal(all['spr-b'].pixels[0], 200);
  });

  it('createProject resets sprites to empty', () => {
    const { store } = makeStore();
    store.setSpriteAsset({ assetId: 'spr-x', width: 2, height: 2, pixels: new Array(16).fill(0) });
    assert.ok('spr-x' in store.getAllSpriteAssets());

    store.createProject('Reset', 4, 4, 16);
    assert.deepEqual(store.getAllSpriteAssets(), {}, 'createProject must clear sprites');
  });

  it('loadFromJson resets sprites if absent from JSON', () => {
    const { store } = makeStore();
    store.setSpriteAsset({ assetId: 'spr-y', width: 2, height: 2, pixels: new Array(16).fill(0) });

    // Build JSON without sprites field
    const jsonObj = JSON.parse(store.saveToJson()) as Record<string, unknown>;
    delete jsonObj['sprites'];
    const json = JSON.stringify(jsonObj);

    const store2 = new ProjectStore(new CommandBus());
    store2.loadFromJson(json);
    assert.deepEqual(store2.getAllSpriteAssets(), {}, 'absent sprites field must load as empty');
  });

  it('malformed sprite entry is silently skipped (wrong pixel length)', () => {
    const { store } = makeStore();
    store.setSpriteAsset({ assetId: 'spr-ok', width: 2, height: 2, pixels: new Array(16).fill(7) });

    const jsonObj = JSON.parse(store.saveToJson()) as Record<string, unknown>;
    // Inject a malformed sprite with wrong pixel length
    (jsonObj['sprites'] as Record<string, unknown>)['spr-bad'] = {
      assetId: 'spr-bad',
      width: 2,
      height: 2,
      pixels: [1, 2, 3], // wrong length (expected 16)
    };
    const json = JSON.stringify(jsonObj);

    const store2 = new ProjectStore(new CommandBus());
    store2.loadFromJson(json);

    const all = store2.getAllSpriteAssets();
    assert.ok('spr-ok' in all, 'valid sprite must load');
    assert.ok(!('spr-bad' in all), 'malformed sprite must be silently skipped');
  });
});
