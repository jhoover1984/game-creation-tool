/**
 * sprite-smart-brush.test.ts -- SPRITE-BRUSH-001
 * Tests for BrushEngine (expandDab, expandStroke) and controller integration.
 */
import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { expandDab, expandStroke } from './sprite-brush-engine.js';
import { SpriteWorkspaceStore } from './sprite-workspace-store.js';
describe('SPRITE-BRUSH-001: expandDab', () => {
    it('pencil brush always returns exactly one point regardless of size', () => {
        const pts1 = expandDab(5, 5, 'pencil', 1);
        const pts3 = expandDab(5, 5, 'pencil', 3);
        const pts5 = expandDab(5, 5, 'pencil', 5);
        assert.equal(pts1.length, 1);
        assert.equal(pts3.length, 1);
        assert.equal(pts5.length, 1);
        assert.deepEqual(pts1[0], { x: 5, y: 5 });
    });
    it('scatter brush produces deterministic output for same input', () => {
        const a = expandDab(3, 4, 'scatter', 3);
        const b = expandDab(3, 4, 'scatter', 3);
        assert.deepEqual(a, b);
    });
    it('scatter brush produces different output for different centre positions', () => {
        const a = expandDab(2, 2, 'scatter', 5);
        const b = expandDab(8, 8, 'scatter', 5);
        // Different seeds -> different order; at least one coordinate should differ
        const aStr = JSON.stringify(a);
        const bStr = JSON.stringify(b);
        assert.notEqual(aStr, bStr);
    });
    it('scatter output points are sorted ascending by y then x', () => {
        const pts = expandDab(7, 7, 'scatter', 5);
        for (let i = 1; i < pts.length; i++) {
            const prev = pts[i - 1];
            const curr = pts[i];
            if (prev.y === curr.y) {
                assert.ok(prev.x <= curr.x, 'x order violated within same y');
            }
            else {
                assert.ok(prev.y < curr.y, 'y order violated');
            }
        }
    });
    it('scatter output contains no duplicate points', () => {
        const pts = expandDab(4, 4, 'scatter', 5);
        const seen = new Set();
        for (const { x, y } of pts) {
            const key = `${x},${y}`;
            assert.ok(!seen.has(key), `Duplicate point at (${x},${y})`);
            seen.add(key);
        }
    });
    it('brush size 5 produces more points than brush size 3 (scatter)', () => {
        const pts3 = expandDab(8, 8, 'scatter', 3);
        const pts5 = expandDab(8, 8, 'scatter', 5);
        assert.ok(pts5.length > pts3.length, 'size 5 should produce more points than size 3');
    });
    it('respects MAX_POINTS_PER_DAB cap (size 5 <= 50 points)', () => {
        const pts = expandDab(10, 10, 'scatter', 5);
        assert.ok(pts.length <= 50, `Expected <= 50 points, got ${pts.length}`);
    });
});
describe('SPRITE-BRUSH-001: expandStroke + undo batching', () => {
    it('single drag produces one undo record regardless of brush expansion', () => {
        const store = new SpriteWorkspaceStore();
        store.openSprite('spr-1', 16, 16);
        // Simulate what the controller does: expand dabs and call applyStroke once
        const dabs = [{ x: 4, y: 4 }, { x: 5, y: 5 }];
        const expanded = expandStroke(dabs, 'scatter', 3);
        const rgba = [255, 0, 0, 255];
        const strokePoints = expanded.map((pt) => ({ ...pt, rgba }));
        store.applyStroke(strokePoints, 'pencil');
        // One applyStroke call = one undo unit
        assert.equal(store.canUndo(), true);
        store.undo();
        assert.equal(store.canUndo(), false, 'Should be fully undone after one undo');
    });
});
//# sourceMappingURL=sprite-smart-brush.test.js.map