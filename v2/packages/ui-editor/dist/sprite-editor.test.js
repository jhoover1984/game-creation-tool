/**
 * sprite-editor.test.ts -- SPRITE-EDIT-001
 * Tests for SpriteWorkspaceStore and renderSpritePanel.
 */
import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SpriteWorkspaceStore } from './sprite-workspace-store.js';
import { renderSpritePanel } from './sprite-panel.js';
function makeStore(assetId = 'spr-1', w = 4, h = 4) {
    const s = new SpriteWorkspaceStore();
    s.openSprite(assetId, w, h);
    return s;
}
function getPixel(store, x, y) {
    const buf = store.getActiveBuffer();
    const idx = (y * buf.width + x) * 4;
    return [buf.pixels[idx], buf.pixels[idx + 1], buf.pixels[idx + 2], buf.pixels[idx + 3]];
}
describe('SPRITE-EDIT-001: SpriteWorkspaceStore', () => {
    it('applyStroke pencil writes correct RGBA to buffer pixel', () => {
        const store = makeStore();
        store.applyStroke([{ x: 1, y: 2, rgba: [255, 0, 0, 255] }], 'pencil');
        assert.deepEqual(getPixel(store, 1, 2), [255, 0, 0, 255]);
    });
    it('applyStroke erase writes [0,0,0,0]', () => {
        const store = makeStore();
        store.applyStroke([{ x: 0, y: 0, rgba: [100, 100, 100, 255] }], 'pencil');
        store.applyStroke([{ x: 0, y: 0, rgba: [0, 0, 0, 0] }], 'erase');
        assert.deepEqual(getPixel(store, 0, 0), [0, 0, 0, 0]);
    });
    it('pixel-safe: unchanged pixels not mutated by stroke', () => {
        const store = makeStore();
        store.applyStroke([{ x: 3, y: 3, rgba: [0, 255, 0, 255] }], 'pencil');
        // pixel (1,1) should remain untouched
        assert.deepEqual(getPixel(store, 1, 1), [0, 0, 0, 0]);
    });
    it('undo reverses a stroke', () => {
        const store = makeStore();
        store.applyStroke([{ x: 2, y: 2, rgba: [0, 0, 255, 255] }], 'pencil');
        store.undo();
        assert.deepEqual(getPixel(store, 2, 2), [0, 0, 0, 0]);
    });
    it('redo re-applies after undo', () => {
        const store = makeStore();
        store.applyStroke([{ x: 0, y: 1, rgba: [255, 255, 0, 255] }], 'pencil');
        store.undo();
        store.redo();
        assert.deepEqual(getPixel(store, 0, 1), [255, 255, 0, 255]);
    });
    it('undo at empty history is no-op (no throw)', () => {
        const store = makeStore();
        assert.doesNotThrow(() => store.undo());
        assert.doesNotThrow(() => store.undo());
    });
    it('new stroke clears redo stack', () => {
        const store = makeStore();
        store.applyStroke([{ x: 0, y: 0, rgba: [1, 2, 3, 255] }], 'pencil');
        store.undo();
        assert.equal(store.canRedo(), true);
        store.applyStroke([{ x: 1, y: 0, rgba: [4, 5, 6, 255] }], 'pencil');
        assert.equal(store.canRedo(), false);
    });
    it('out-of-bounds points ignored (no crash, no mutation)', () => {
        const store = makeStore('spr', 4, 4);
        assert.doesNotThrow(() => {
            store.applyStroke([
                { x: -1, y: 0, rgba: [1, 2, 3, 255] },
                { x: 4, y: 0, rgba: [1, 2, 3, 255] },
                { x: 0, y: -1, rgba: [1, 2, 3, 255] },
                { x: 0, y: 4, rgba: [1, 2, 3, 255] },
            ], 'pencil');
        });
        // all pixels still transparent
        for (let x = 0; x < 4; x++) {
            for (let y = 0; y < 4; y++) {
                assert.deepEqual(getPixel(store, x, y), [0, 0, 0, 0]);
            }
        }
    });
});
describe('SPRITE-PERSIST-001: exportBuffers / importBuffer roundtrip', () => {
    it('exportBuffers returns empty array when no sprites opened', () => {
        const store = new SpriteWorkspaceStore();
        assert.deepEqual(store.exportBuffers(), []);
    });
    it('exportBuffers returns pixel data as number[] for each opened sprite', () => {
        const store = makeStore('spr-export', 2, 2);
        store.applyStroke([{ x: 0, y: 0, rgba: [255, 0, 0, 255] }], 'pencil');
        const exported = store.exportBuffers();
        assert.equal(exported.length, 1);
        assert.equal(exported[0].assetId, 'spr-export');
        assert.equal(exported[0].width, 2);
        assert.equal(exported[0].height, 2);
        assert.equal(exported[0].pixels.length, 16); // 2*2*4
        assert.equal(exported[0].pixels[0], 255); // R at (0,0)
        assert.equal(exported[0].pixels[1], 0); // G at (0,0)
        assert.equal(exported[0].pixels[2], 0); // B at (0,0)
        assert.equal(exported[0].pixels[3], 255); // A at (0,0)
    });
    it('importBuffer restores pixel data into store', () => {
        const store = new SpriteWorkspaceStore();
        const pixels = new Array(16).fill(0);
        // Set pixel at (1,1) to green in a 2x2 RGBA buffer
        pixels[(1 * 2 + 1) * 4 + 0] = 0;
        pixels[(1 * 2 + 1) * 4 + 1] = 200;
        pixels[(1 * 2 + 1) * 4 + 2] = 0;
        pixels[(1 * 2 + 1) * 4 + 3] = 255;
        store.importBuffer('spr-import', 2, 2, pixels);
        store.openSprite('spr-import', 2, 2); // activate
        assert.deepEqual(getPixel(store, 1, 1), [0, 200, 0, 255]);
    });
    it('importBuffer does not affect undo history', () => {
        const store = new SpriteWorkspaceStore();
        store.importBuffer('spr-hist', 2, 2, new Array(16).fill(128));
        store.openSprite('spr-hist', 2, 2);
        assert.equal(store.canUndo(), false, 'import must not create undo entries');
    });
    it('export -> import pixel roundtrip preserves all pixel values', () => {
        const storeA = makeStore('spr-rt', 4, 4);
        storeA.applyStroke([
            { x: 0, y: 0, rgba: [10, 20, 30, 255] },
            { x: 3, y: 3, rgba: [100, 110, 120, 200] },
        ], 'pencil');
        const exported = storeA.exportBuffers()[0];
        const storeB = new SpriteWorkspaceStore();
        storeB.importBuffer(exported.assetId, exported.width, exported.height, exported.pixels);
        storeB.openSprite(exported.assetId, exported.width, exported.height);
        assert.deepEqual(getPixel(storeB, 0, 0), [10, 20, 30, 255]);
        assert.deepEqual(getPixel(storeB, 3, 3), [100, 110, 120, 200]);
    });
});
describe('SPRITE-PERSIST-001: clearAll', () => {
    it('clearAll removes all buffers and history, active resets to null', () => {
        const store = makeStore('spr-clear', 2, 2);
        store.applyStroke([{ x: 0, y: 0, rgba: [255, 0, 0, 255] }], 'pencil');
        assert.equal(store.exportBuffers().length, 1);
        assert.ok(store.canUndo());
        store.clearAll();
        assert.equal(store.exportBuffers().length, 0, 'buffers should be empty after clearAll');
        assert.equal(store.getActiveAssetId(), null, 'active asset should be null after clearAll');
        assert.equal(store.canUndo(), false, 'undo should be unavailable after clearAll');
    });
    it('clearAll triggers subscribers', () => {
        const store = makeStore('spr-notify', 2, 2);
        let calls = 0;
        store.subscribe(() => { calls++; });
        store.clearAll();
        assert.ok(calls >= 1, 'clearAll should notify subscribers');
    });
    it('importBuffer after clearAll restores sprite correctly', () => {
        const store = makeStore('spr-reimport', 2, 2);
        store.applyStroke([{ x: 0, y: 0, rgba: [10, 20, 30, 255] }], 'pencil');
        store.clearAll();
        store.importBuffer('spr-reimport', 2, 2, [10, 20, 30, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        store.openSprite('spr-reimport', 2, 2);
        assert.deepEqual(getPixel(store, 0, 0), [10, 20, 30, 255]);
        assert.equal(store.canUndo(), false, 'import after clearAll should not add history');
    });
});
describe('SPRITE-EDIT-001: renderSpritePanel', () => {
    it('renders "No sprite selected" when buffer is null', () => {
        const html = renderSpritePanel(null, 'pencil', '#000000');
        assert.ok(html.includes('No sprite selected'), `expected "No sprite selected", got: ${html}`);
    });
    it('renders canvas element with correct id when buffer present', () => {
        const store = makeStore('spr-2', 8, 8);
        const buf = store.getActiveBuffer();
        const html = renderSpritePanel(buf, 'pencil', '#ff0000');
        assert.ok(html.includes('<canvas'), 'expected <canvas element');
        assert.ok(html.includes('sprite-edit-canvas'), 'expected sprite-edit-canvas id');
        assert.ok(html.includes('width="8"'), 'expected width attribute');
        assert.ok(html.includes('height="8"'), 'expected height attribute');
    });
});
//# sourceMappingURL=sprite-editor.test.js.map