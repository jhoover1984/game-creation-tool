/**
 * tile-rule-engine.test.ts -- TILE-RULE-001
 * Tests for computeMask, resolveTile, and collectNeighborhood.
 */

import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  computeMask,
  resolveTile,
  collectNeighborhood,
  DEMO_RULESET,
} from './tile-rule-engine.js';
import type { TileLayer } from '@gcs/contracts';

/** Build a minimal TileLayer from a flat array (row-major). */
function makeLayer(width: number, height: number, data: number[]): TileLayer {
  return { id: 'layer-0', name: 'Ground', width, height, tileSize: 16, data };
}

// ---------------------------------------------------------------------------
// computeMask
// ---------------------------------------------------------------------------

describe('TILE-RULE-001: computeMask', () => {
  it('returns 0 when all neighbors are empty (tileId 0)', () => {
    // 3x3 grid -- only centre is non-zero, but centre is NOT in matchTileIds
    const data = [0, 0, 0, 0, 5, 0, 0, 0, 0];
    const layer = makeLayer(3, 3, data);
    const mask = computeMask(layer, 1, 1, [1, 2, 3, 4]); // 5 not in matchTileIds
    assert.equal(mask, 0);
  });

  it('sets N bit (1) when north neighbor matches', () => {
    const data = [1, 0, 0,
                  0, 0, 0,
                  0, 0, 0];
    const layer = makeLayer(3, 3, data);
    const mask = computeMask(layer, 0, 1, [1]);
    assert.equal(mask & 1, 1); // N bit set
    assert.equal(mask & ~1, 0); // no other bits
  });

  it('sets E bit (2) when east neighbor matches', () => {
    const data = [0, 0, 0,
                  0, 0, 1,
                  0, 0, 0];
    const layer = makeLayer(3, 3, data);
    const mask = computeMask(layer, 1, 1, [1]);
    assert.equal(mask & 2, 2); // E bit set
    assert.equal(mask & ~2, 0);
  });

  it('sets S bit (4) when south neighbor matches', () => {
    const data = [0, 0, 0,
                  0, 0, 0,
                  0, 1, 0];
    const layer = makeLayer(3, 3, data);
    const mask = computeMask(layer, 1, 1, [1]);
    assert.equal(mask & 4, 4); // S bit set
    assert.equal(mask & ~4, 0);
  });

  it('sets W bit (8) when west neighbor matches', () => {
    const data = [0, 0, 0,
                  1, 0, 0,
                  0, 0, 0];
    const layer = makeLayer(3, 3, data);
    const mask = computeMask(layer, 1, 1, [1]);
    assert.equal(mask & 8, 8); // W bit set
    assert.equal(mask & ~8, 0);
  });

  it('returns 15 (NESW) when all four cardinal neighbors match', () => {
    const data = [0, 1, 0,
                  1, 0, 1,
                  0, 1, 0];
    const layer = makeLayer(3, 3, data);
    const mask = computeMask(layer, 1, 1, [1]);
    assert.equal(mask, 15);
  });

  it('treats out-of-bounds neighbors as non-matching', () => {
    // Top-left corner: north and west are out of bounds
    const data = [0, 0, 0, 0];
    const layer = makeLayer(2, 2, data);
    const mask = computeMask(layer, 0, 0, [1]);
    assert.equal(mask, 0); // no in-bounds matching neighbors
  });

  it('handles layer where every neighbor matches (1x1 grid = mask 0)', () => {
    const layer = makeLayer(1, 1, [5]);
    const mask = computeMask(layer, 0, 0, [5]);
    assert.equal(mask, 0); // no in-bounds neighbors at all
  });
});

// ---------------------------------------------------------------------------
// resolveTile
// ---------------------------------------------------------------------------

describe('TILE-RULE-001: resolveTile', () => {
  it('returns the variant tileId for a known mask', () => {
    assert.equal(resolveTile(0, DEMO_RULESET), 1);   // isolated
    assert.equal(resolveTile(15, DEMO_RULESET), 16); // all neighbors
    assert.equal(resolveTile(1, DEMO_RULESET), 2);   // N only
  });

  it('returns fallbackTileId when mask has no variant entry', () => {
    const sparse = {
      id: 'sparse', name: 'Sparse',
      matchTileIds: [1],
      variants: { 15: 99 } as Partial<Record<number, number>>,
      fallbackTileId: 7,
    };
    assert.equal(resolveTile(0, sparse), 7);  // no variant for 0
    assert.equal(resolveTile(15, sparse), 99); // variant exists
  });
});

// ---------------------------------------------------------------------------
// collectNeighborhood
// ---------------------------------------------------------------------------

describe('TILE-RULE-001: collectNeighborhood', () => {
  it('includes the cell itself and its cardinal neighbors', () => {
    const result = collectNeighborhood([{ x: 1, y: 1 }], 3, 3);
    // self (1,1), N (1,0), E (2,1), S (1,2), W (0,1)
    assert.equal(result.length, 5);
  });

  it('clips out-of-bounds neighbors (top-left corner)', () => {
    const result = collectNeighborhood([{ x: 0, y: 0 }], 3, 3);
    // self, E, S only (N and W out of bounds)
    assert.equal(result.length, 3);
  });

  it('deduplicates shared neighbors between adjacent cells', () => {
    // Two adjacent cells: (1,1) and (2,1) -- E of first = W of second
    const result = collectNeighborhood([{ x: 1, y: 1 }, { x: 2, y: 1 }], 4, 4);
    const keys = result.map((c) => `${c.x},${c.y}`);
    const unique = new Set(keys);
    assert.equal(keys.length, unique.size); // no duplicates
  });

  it('returns results sorted ascending by y then x', () => {
    const result = collectNeighborhood([{ x: 2, y: 2 }], 5, 5);
    for (let i = 1; i < result.length; i++) {
      const prev = result[i - 1]!;
      const curr = result[i]!;
      const ordered = prev.y < curr.y || (prev.y === curr.y && prev.x <= curr.x);
      assert.ok(ordered, `Out of order at index ${i}: (${prev.x},${prev.y}) then (${curr.x},${curr.y})`);
    }
  });

  it('handles empty input array', () => {
    const result = collectNeighborhood([], 10, 10);
    assert.equal(result.length, 0);
  });
});
