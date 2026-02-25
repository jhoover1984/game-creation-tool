/**
 * sprite-style.test.ts -- SPRITE-STYLE-001
 * Tests for SpriteStyleLintService (lintSprite, nearestPaletteColor)
 * and SpriteWorkspaceStore.applyPixelFix.
 */
import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SpriteWorkspaceStore } from './sprite-workspace-store.js';
import { lintSprite, nearestPaletteColor, SPRITE_PALETTE } from './sprite-style-lint.js';
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
describe('SPRITE-STYLE-001: lintSprite', () => {
    it('returns empty for a fully transparent buffer', () => {
        const store = makeStore();
        const buf = store.getActiveBuffer();
        const results = lintSprite(buf, SPRITE_PALETTE);
        assert.equal(results.length, 0);
    });
    it('returns empty when all opaque pixels are in-palette', () => {
        const store = makeStore();
        store.applyStroke([{ x: 0, y: 0, rgba: [255, 0, 0, 255] }], 'pencil'); // #ff0000 -- in palette
        const buf = store.getActiveBuffer();
        const results = lintSprite(buf, SPRITE_PALETTE);
        assert.equal(results.length, 0);
    });
    it('flags an off-palette pixel and provides nearest colour', () => {
        const store = makeStore();
        // Write an off-palette colour: #010101 -- very close to black (#000000)
        store.applyStroke([{ x: 1, y: 1, rgba: [1, 1, 1, 255] }], 'pencil');
        const buf = store.getActiveBuffer();
        const results = lintSprite(buf, SPRITE_PALETTE);
        assert.equal(results.length, 1);
        assert.equal(results[0].x, 1);
        assert.equal(results[0].y, 1);
        assert.deepEqual(results[0].foundRgba, [1, 1, 1, 255]);
        // Nearest to #010101 should be #000000
        assert.deepEqual(results[0].nearestRgba, [0, 0, 0, 255]);
    });
    it('ignores transparent pixels (alpha === 0)', () => {
        const store = makeStore();
        // Manually write an off-palette opaque pixel then erase it
        store.applyStroke([{ x: 2, y: 2, rgba: [100, 100, 100, 255] }], 'pencil');
        store.applyStroke([{ x: 2, y: 2, rgba: [0, 0, 0, 0] }], 'erase');
        const buf = store.getActiveBuffer();
        const results = lintSprite(buf, SPRITE_PALETTE);
        assert.equal(results.length, 0);
    });
    it('detects multiple off-palette pixels', () => {
        const store = makeStore('spr-2', 2, 2);
        // Write two off-palette colours
        store.applyStroke([
            { x: 0, y: 0, rgba: [10, 20, 30, 255] },
            { x: 1, y: 1, rgba: [200, 100, 50, 255] },
        ], 'pencil');
        const buf = store.getActiveBuffer();
        const results = lintSprite(buf, SPRITE_PALETTE);
        assert.equal(results.length, 2);
    });
});
describe('SPRITE-STYLE-001: nearestPaletteColor', () => {
    it('returns exact match when colour is in palette', () => {
        const red = [255, 0, 0, 255];
        const nearest = nearestPaletteColor(red, SPRITE_PALETTE);
        assert.deepEqual(nearest, red);
    });
    it('returns nearest palette colour by Euclidean RGB distance', () => {
        // #fefe00 is close to #ffcc00 (yellow) vs #ff0000 (red)
        const almost_yellow = [254, 254, 0, 255];
        const nearest = nearestPaletteColor(almost_yellow, SPRITE_PALETTE);
        assert.deepEqual(nearest, [255, 204, 0, 255]); // #ffcc00
    });
});
describe('SPRITE-STYLE-001: applyPixelFix', () => {
    it('writes pixels without adding to undo history', () => {
        const store = makeStore();
        store.applyPixelFix([{ x: 0, y: 0, rgba: [255, 0, 0, 255] }]);
        assert.equal(store.canUndo(), false); // no undo record created
        assert.deepEqual(getPixel(store, 0, 0), [255, 0, 0, 255]);
    });
    it('fires subscribers after fix', () => {
        const store = makeStore();
        let called = 0;
        store.subscribe(() => { called++; });
        store.applyPixelFix([{ x: 0, y: 0, rgba: [0, 0, 255, 255] }]);
        assert.equal(called, 1);
    });
    it('is pixel-safe: skips unchanged pixels', () => {
        const store = makeStore();
        store.applyPixelFix([{ x: 0, y: 0, rgba: [0, 0, 0, 0] }]); // all-transparent buffer -- same value
        assert.equal(store.canUndo(), false);
        // No notification for a no-op fix (buffer unchanged)
        let called = 0;
        store.subscribe(() => { called++; });
        store.applyPixelFix([{ x: 0, y: 0, rgba: [0, 0, 0, 0] }]);
        assert.equal(called, 0);
    });
});
describe('SPRITE-STYLE-001: renderSpritePanel lint display', () => {
    it('shows Remap button disabled when lintCount is 0', () => {
        const store = makeStore();
        const buf = store.getActiveBuffer();
        const html = renderSpritePanel(buf, 'pencil', '#000000', 0);
        assert.ok(html.includes('sprite:remap'));
        assert.ok(html.includes('disabled'));
    });
    it('shows Remap button enabled with count when lintCount > 0', () => {
        const store = makeStore();
        const buf = store.getActiveBuffer();
        const html = renderSpritePanel(buf, 'pencil', '#000000', 3);
        assert.ok(html.includes('Remap (3)'));
        assert.ok(!html.includes(' disabled'));
    });
});
//# sourceMappingURL=sprite-style.test.js.map