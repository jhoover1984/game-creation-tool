/** Slot type for entity attachment points (ANIM-ANCHOR-002). */
export type SlotType = 'socket' | 'prop';

/**
 * Hint for occlusion ordering between a slotted child and its parent (ANIM-ANCHOR-002/003).
 * 'auto' defers to resolveOcclusionOrder helper.
 */
export type OcclusionHint = 'in-front' | 'behind' | 'auto';

/** Describes how one entity attaches to an anchor point on another entity (ANIM-ANCHOR-002). */
export interface SlotAttachment {
  slotName: string;
  slotType: SlotType;
  parentEntityId: string;
  anchorName: string;
  occlusionHint: OcclusionHint;
}

/** An entity in the game world. */
export interface EntityDef {
  id: string;
  name: string;
  position: { x: number; y: number };
  size: { w: number; h: number };
  solid: boolean;
  spriteId?: string;
  animationClipId?: string;
  tags: string[];
  /** Slot attachments to anchor points on parent entities (ANIM-ANCHOR-002). */
  slots?: SlotAttachment[];
  /** Movement speed in px/s. Defaults to 120 at runtime if unset. Only meaningful for player entities. */
  speed?: number;
}
