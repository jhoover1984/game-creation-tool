/**
 * animation-anchor.test.ts -- ANIM-ANCHOR-001/002/003
 *
 * Tests for anchor keyframe commands (animation:anchor:add|move|remove),
 * entity slot commands (entity:slot:attach|detach|setOcclusion),
 * and the pure helpers: resolveAnchorPosition, detectCircularAttachment,
 * resolveOcclusionOrder.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CommandBus } from './command-bus.js';
import { ProjectStore } from './project-store.js';
import { resolveAnchorPosition, detectCircularAttachment, resolveOcclusionOrder, } from './animation-anchor.js';
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function setup() {
    const bus = new CommandBus();
    const store = new ProjectStore(bus);
    store.createProject('Test', 10, 10, 16);
    return { bus, store };
}
function makeClip(id) {
    return { id, name: 'Walk', frameCount: 4, fps: 12, loopMode: 'loop' };
}
// ---------------------------------------------------------------------------
// animation:anchor:add / move / remove (ANIM-ANCHOR-001)
// ---------------------------------------------------------------------------
describe('ANIM-ANCHOR-001: animation anchor commands', () => {
    it('animation:anchor:add adds a keyframe to a clip', () => {
        const { bus, store } = setup();
        store.clips.push(makeClip('clip-1'));
        bus.dispatch({
            type: 'animation:anchor:add',
            payload: { clipId: 'clip-1', anchorName: 'hand_r', keyframe: { frame: 0, pos: { x: 10, y: 5 } } },
        });
        const kfs = store.clips[0].anchors?.['hand_r'];
        assert.ok(kfs, 'anchor keyframes should exist');
        assert.equal(kfs.length, 1);
        assert.deepEqual(kfs[0], { frame: 0, pos: { x: 10, y: 5 } });
    });
    it('animation:anchor:add returns null for unknown clipId', () => {
        const { bus, store } = setup();
        const result = bus.dispatch({
            type: 'animation:anchor:add',
            payload: { clipId: 'no-such-clip', anchorName: 'hand_r', keyframe: { frame: 0, pos: { x: 0, y: 0 } } },
        });
        assert.equal(result, null);
        assert.equal(store.clips.length, 0);
    });
    it('animation:anchor:add rejects duplicate frame for same anchor', () => {
        const { bus, store } = setup();
        store.clips.push(makeClip('clip-dup'));
        bus.dispatch({
            type: 'animation:anchor:add',
            payload: { clipId: 'clip-dup', anchorName: 'hand_r', keyframe: { frame: 0, pos: { x: 2, y: 2 } } },
        });
        const result = bus.dispatch({
            type: 'animation:anchor:add',
            payload: { clipId: 'clip-dup', anchorName: 'hand_r', keyframe: { frame: 0, pos: { x: 3, y: 3 } } },
        });
        assert.equal(result, null);
        assert.equal(store.clips[0].anchors?.['hand_r']?.length, 1);
        assert.deepEqual(store.clips[0].anchors?.['hand_r']?.[0], { frame: 0, pos: { x: 2, y: 2 } });
    });
    it('animation:anchor:move updates an existing keyframe position', () => {
        const { bus, store } = setup();
        const clip = makeClip('clip-2');
        clip.anchors = { hand_r: [{ frame: 1, pos: { x: 8, y: 4 } }] };
        store.clips.push(clip);
        bus.dispatch({
            type: 'animation:anchor:move',
            payload: { clipId: 'clip-2', anchorName: 'hand_r', frame: 1, pos: { x: 12, y: 7 }, rot: 0.5 },
        });
        const kf = store.clips[0].anchors['hand_r'][0];
        assert.deepEqual(kf.pos, { x: 12, y: 7 });
        assert.equal(kf.rot, 0.5);
    });
    it('animation:anchor:move returns null when frame not found', () => {
        const { bus, store } = setup();
        const clip = makeClip('clip-3');
        clip.anchors = { hand_r: [{ frame: 0, pos: { x: 5, y: 5 } }] };
        store.clips.push(clip);
        const result = bus.dispatch({
            type: 'animation:anchor:move',
            payload: { clipId: 'clip-3', anchorName: 'hand_r', frame: 99, pos: { x: 1, y: 1 } },
        });
        assert.equal(result, null);
    });
    it('animation:anchor:remove removes a keyframe', () => {
        const { bus, store } = setup();
        const clip = makeClip('clip-4');
        clip.anchors = { hand_r: [{ frame: 0, pos: { x: 5, y: 5 } }, { frame: 1, pos: { x: 6, y: 5 } }] };
        store.clips.push(clip);
        bus.dispatch({
            type: 'animation:anchor:remove',
            payload: { clipId: 'clip-4', anchorName: 'hand_r', frame: 0 },
        });
        assert.equal(store.clips[0].anchors['hand_r'].length, 1);
        assert.equal(store.clips[0].anchors['hand_r'][0].frame, 1);
    });
    it('undo animation:anchor:add removes the keyframe', () => {
        const { bus, store } = setup();
        store.clips.push(makeClip('clip-5'));
        bus.dispatch({
            type: 'animation:anchor:add',
            payload: { clipId: 'clip-5', anchorName: 'foot_l', keyframe: { frame: 2, pos: { x: 3, y: 10 } } },
        });
        assert.equal(store.clips[0].anchors['foot_l'].length, 1);
        store.undo();
        assert.equal(store.clips[0].anchors['foot_l'].length, 0);
    });
});
// ---------------------------------------------------------------------------
// resolveAnchorPosition helper (ANIM-ANCHOR-001)
// ---------------------------------------------------------------------------
describe('ANIM-ANCHOR-001: resolveAnchorPosition', () => {
    it('returns null for unknown anchor name', () => {
        const clip = makeClip('c');
        clip.anchors = {};
        assert.equal(resolveAnchorPosition(clip, 'no_such_anchor', 0), null);
    });
    it('returns exact keyframe position at matching frame', () => {
        const clip = makeClip('c');
        clip.anchors = { hand_r: [{ frame: 0, pos: { x: 11, y: 7 } }, { frame: 1, pos: { x: 12, y: 7 } }] };
        const pos = resolveAnchorPosition(clip, 'hand_r', 0);
        assert.deepEqual(pos, { x: 11, y: 7 });
    });
    it('interpolates position between two keyframes', () => {
        const clip = makeClip('c');
        clip.anchors = { hand_r: [{ frame: 0, pos: { x: 0, y: 0 } }, { frame: 4, pos: { x: 8, y: 4 } }] };
        const pos = resolveAnchorPosition(clip, 'hand_r', 2);
        assert.ok(pos, 'should return a position');
        assert.equal(pos.x, 4);
        assert.equal(pos.y, 2);
    });
    it('clamps to last keyframe when frame is beyond end', () => {
        const clip = makeClip('c');
        clip.anchors = { hand_r: [{ frame: 0, pos: { x: 5, y: 5 } }] };
        const pos = resolveAnchorPosition(clip, 'hand_r', 100);
        assert.deepEqual(pos, { x: 5, y: 5 });
    });
});
// ---------------------------------------------------------------------------
// entity:slot:attach / detach (ANIM-ANCHOR-002)
// ---------------------------------------------------------------------------
describe('ANIM-ANCHOR-002: entity slot commands', () => {
    it('entity:slot:attach adds a slot attachment to an entity', () => {
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
        assert.equal(store.entities[0].slots?.length, 1);
        assert.equal(store.entities[0].slots?.[0].slotName, 'grip');
        assert.equal(store.entities[0].slots?.[0].parentEntityId, playerId);
    });
    it('entity:slot:attach blocks circular attachment', () => {
        const { bus, store } = setup();
        bus.dispatch({ type: 'entity:create', payload: { name: 'A', x: 0, y: 0 } });
        bus.dispatch({ type: 'entity:create', payload: { name: 'B', x: 0, y: 0 } });
        const aId = store.entities[0].id;
        const bId = store.entities[1].id;
        // A attaches to B
        bus.dispatch({
            type: 'entity:slot:attach',
            payload: { entityId: aId, slotName: 'slot1', slotType: 'socket', parentEntityId: bId, anchorName: 'anchor_a', occlusionHint: 'auto' },
        });
        // B attaches to A -- circular
        const result = bus.dispatch({
            type: 'entity:slot:attach',
            payload: { entityId: bId, slotName: 'slot2', slotType: 'socket', parentEntityId: aId, anchorName: 'anchor_b', occlusionHint: 'auto' },
        });
        assert.equal(result, null, 'circular attachment should be blocked');
        assert.equal(store.entities[1].slots?.length ?? 0, 0);
    });
    it('entity:slot:attach rejects duplicate slotName on same entity', () => {
        const { bus, store } = setup();
        bus.dispatch({ type: 'entity:create', payload: { name: 'Sword', x: 0, y: 0 } });
        bus.dispatch({ type: 'entity:create', payload: { name: 'Player', x: 0, y: 0 } });
        const swordId = store.entities[0].id;
        const playerId = store.entities[1].id;
        bus.dispatch({
            type: 'entity:slot:attach',
            payload: { entityId: swordId, slotName: 'grip', slotType: 'prop', parentEntityId: playerId, anchorName: 'hand_r', occlusionHint: 'auto' },
        });
        const result = bus.dispatch({
            type: 'entity:slot:attach',
            payload: { entityId: swordId, slotName: 'grip', slotType: 'socket', parentEntityId: playerId, anchorName: 'hand_l', occlusionHint: 'behind' },
        });
        assert.equal(result, null);
        assert.equal(store.entities[0].slots?.length, 1);
        assert.equal(store.entities[0].slots?.[0].slotType, 'prop');
    });
    it('entity:slot:detach removes a slot', () => {
        const { bus, store } = setup();
        bus.dispatch({ type: 'entity:create', payload: { name: 'Sword', x: 0, y: 0 } });
        bus.dispatch({ type: 'entity:create', payload: { name: 'Player', x: 0, y: 0 } });
        const swordId = store.entities[0].id;
        const playerId = store.entities[1].id;
        bus.dispatch({
            type: 'entity:slot:attach',
            payload: { entityId: swordId, slotName: 'grip', slotType: 'prop', parentEntityId: playerId, anchorName: 'hand_r', occlusionHint: 'in-front' },
        });
        assert.equal(store.entities[0].slots?.length, 1);
        bus.dispatch({ type: 'entity:slot:detach', payload: { entityId: swordId, slotName: 'grip' } });
        assert.equal(store.entities[0].slots?.length, 0);
    });
});
// ---------------------------------------------------------------------------
// detectCircularAttachment helper (ANIM-ANCHOR-002)
// ---------------------------------------------------------------------------
describe('ANIM-ANCHOR-002: detectCircularAttachment', () => {
    it('returns false when no cycle exists', () => {
        const entities = [
            { id: 'a', name: 'A', position: { x: 0, y: 0 }, size: { w: 16, h: 16 }, solid: false, tags: [] },
            { id: 'b', name: 'B', position: { x: 0, y: 0 }, size: { w: 16, h: 16 }, solid: false, tags: [] },
        ];
        assert.equal(detectCircularAttachment(entities, 'a', 'b'), false);
    });
    it('returns true when adding attachment would create a cycle', () => {
        const entities = [
            {
                id: 'a', name: 'A', position: { x: 0, y: 0 }, size: { w: 16, h: 16 }, solid: false, tags: [],
                slots: [{ slotName: 's', slotType: 'socket', parentEntityId: 'b', anchorName: 'anchor', occlusionHint: 'auto' }],
            },
            { id: 'b', name: 'B', position: { x: 0, y: 0 }, size: { w: 16, h: 16 }, solid: false, tags: [] },
        ];
        // Trying to attach b to a would create a -> b -> a cycle
        assert.equal(detectCircularAttachment(entities, 'b', 'a'), true);
    });
});
// ---------------------------------------------------------------------------
// entity:slot:setOcclusion (ANIM-ANCHOR-003)
// ---------------------------------------------------------------------------
describe('ANIM-ANCHOR-003: entity:slot:setOcclusion', () => {
    it('updates occlusionHint on an existing slot', () => {
        const { bus, store } = setup();
        bus.dispatch({ type: 'entity:create', payload: { name: 'Sword', x: 0, y: 0 } });
        bus.dispatch({ type: 'entity:create', payload: { name: 'Player', x: 0, y: 0 } });
        const swordId = store.entities[0].id;
        const playerId = store.entities[1].id;
        bus.dispatch({
            type: 'entity:slot:attach',
            payload: { entityId: swordId, slotName: 'grip', slotType: 'prop', parentEntityId: playerId, anchorName: 'hand_r', occlusionHint: 'auto' },
        });
        bus.dispatch({
            type: 'entity:slot:setOcclusion',
            payload: { entityId: swordId, slotName: 'grip', occlusionHint: 'behind' },
        });
        assert.equal(store.entities[0].slots?.[0].occlusionHint, 'behind');
    });
});
// ---------------------------------------------------------------------------
// resolveOcclusionOrder helper (ANIM-ANCHOR-003)
// ---------------------------------------------------------------------------
describe('ANIM-ANCHOR-003: resolveOcclusionOrder', () => {
    it('returns in-front when anchorY is below parent half-height', () => {
        assert.equal(resolveOcclusionOrder(10, 8), 'in-front');
    });
    it('returns behind when anchorY is above parent half-height', () => {
        assert.equal(resolveOcclusionOrder(4, 8), 'behind');
    });
});
//# sourceMappingURL=animation-anchor.test.js.map