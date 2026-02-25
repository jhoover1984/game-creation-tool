import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { EntityDef } from '@gcs/contracts';
import { resolveTargetEntityIds } from './behavior-targeting.js';

function e(id: string, x: number, y: number, tags: string[] = []): EntityDef {
  return {
    id,
    name: id,
    position: { x, y },
    size: { w: 16, h: 16 },
    solid: false,
    tags,
  };
}

describe('behavior target resolver', () => {
  it('resolves target:this deterministically', () => {
    const entities = [e('b', 0, 0), e('a', 0, 0)];
    const ids = resolveTargetEntityIds(entities, 'a', { type: 'this' });
    assert.deepEqual(ids, ['a']);
  });

  it('resolves target:tag with sorted output', () => {
    const entities = [e('b', 0, 0, ['enemy']), e('a', 0, 0, ['enemy']), e('c', 0, 0, ['npc'])];
    const ids = resolveTargetEntityIds(entities, 'a', { type: 'tag', value: 'enemy' });
    assert.deepEqual(ids, ['a', 'b']);
  });

  it('resolves target:radius excluding owner with sorted output', () => {
    const entities = [e('c', 30, 0), e('a', 0, 0), e('b', 10, 0)];
    const ids = resolveTargetEntityIds(entities, 'a', { type: 'radius', value: 24 });
    assert.deepEqual(ids, ['b']);
  });
});
