/**
 * animation-anchor.ts -- Pure helpers for anchor resolution and slot attachment (ANIM-ANCHOR-001/002/003).
 *
 * All functions are stateless and operate on contract types only.
 * Command handling lives in project-store.ts.
 */
import type { AnchorKeyframe, AnimationClipDef } from '@gcs/contracts';
import type { EntityDef, OcclusionHint } from '@gcs/contracts';
/**
 * Resolve the position of a named anchor on a clip at the given frame.
 * Keyframes are looked up by exact frame first; if not found, linearly
 * interpolates between surrounding keyframes. Returns null if the anchor
 * does not exist on the clip or has no keyframes.
 *
 * ANIM-ANCHOR-001
 */
export declare function resolveAnchorPosition(clip: AnimationClipDef, anchorName: string, frame: number): {
    x: number;
    y: number;
} | null;
/**
 * Detect whether adding a new slot attachment (proposedEntityId -> proposedParentId)
 * would introduce a cycle in the entity attachment graph.
 *
 * Entities are sorted by id before traversal for deterministic results.
 * Returns true if a cycle would be created.
 *
 * ANIM-ANCHOR-002
 */
export declare function detectCircularAttachment(entities: EntityDef[], proposedEntityId: string, proposedParentId: string): boolean;
/**
 * Resolve the default occlusion order for a slot based on anchor position vs parent half-height.
 * Returns 'in-front' if the anchor is in the lower half of the parent sprite (anchorY > parentHalfHeight),
 * otherwise 'behind'. Used to auto-resolve 'auto' OcclusionHint slots.
 *
 * ANIM-ANCHOR-003
 */
export declare function resolveOcclusionOrder(anchorY: number, parentHalfHeight: number): OcclusionHint;
export type { AnchorKeyframe };
//# sourceMappingURL=animation-anchor.d.ts.map