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
export function resolveAnchorPosition(
  clip: AnimationClipDef,
  anchorName: string,
  frame: number,
): { x: number; y: number } | null {
  const keyframes = clip.anchors?.[anchorName];
  if (!keyframes || keyframes.length === 0) return null;

  const sorted = [...keyframes].sort((a, b) => a.frame - b.frame);

  // Clamp to first or last
  if (frame <= sorted[0].frame) return { x: sorted[0].pos.x, y: sorted[0].pos.y };
  if (frame >= sorted[sorted.length - 1].frame) {
    const last = sorted[sorted.length - 1];
    return { x: last.pos.x, y: last.pos.y };
  }

  // Linear interpolation between surrounding keyframes
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (frame >= a.frame && frame <= b.frame) {
      const t = (frame - a.frame) / (b.frame - a.frame);
      return {
        x: a.pos.x + (b.pos.x - a.pos.x) * t,
        y: a.pos.y + (b.pos.y - a.pos.y) * t,
      };
    }
  }

  // Unreachable given the clamp guards above
  const last = sorted[sorted.length - 1];
  return { x: last.pos.x, y: last.pos.y };
}

/**
 * Detect whether adding a new slot attachment (proposedEntityId -> proposedParentId)
 * would introduce a cycle in the entity attachment graph.
 *
 * Entities are sorted by id before traversal for deterministic results.
 * Returns true if a cycle would be created.
 *
 * ANIM-ANCHOR-002
 */
export function detectCircularAttachment(
  entities: EntityDef[],
  proposedEntityId: string,
  proposedParentId: string,
): boolean {
  // Build child -> parentIds map from existing slots (sorted by entity id for determinism)
  const sortedEntities = [...entities].sort((a, b) => a.id.localeCompare(b.id));
  const parentsOf = new Map<string, string[]>();

  for (const entity of sortedEntities) {
    const parents = (entity.slots ?? [])
      .map((s) => s.parentEntityId)
      .sort();
    if (parents.length > 0) {
      parentsOf.set(entity.id, parents);
    }
  }

  // DFS from proposedParentId; if we reach proposedEntityId, it's a cycle
  const visited = new Set<string>();
  const stack = [proposedParentId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === proposedEntityId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const parents = parentsOf.get(current) ?? [];
    for (const p of [...parents].reverse()) {
      stack.push(p);
    }
  }

  return false;
}

/**
 * Resolve the default occlusion order for a slot based on anchor position vs parent half-height.
 * Returns 'in-front' if the anchor is in the lower half of the parent sprite (anchorY > parentHalfHeight),
 * otherwise 'behind'. Used to auto-resolve 'auto' OcclusionHint slots.
 *
 * ANIM-ANCHOR-003
 */
export function resolveOcclusionOrder(
  anchorY: number,
  parentHalfHeight: number,
): OcclusionHint {
  return anchorY > parentHalfHeight ? 'in-front' : 'behind';
}

// Re-export AnchorKeyframe for convenience
export type { AnchorKeyframe };
