/**
 * Command/event contracts for the command bus.
 * Every mutation goes through a command; every state change emits an event.
 */
import type { BehaviorRow } from './behavior.js';
import type { EffectFieldId, EffectPresetId } from './effects.js';
import type { AnchorKeyframe } from './animation.js';
import type { OcclusionHint, SlotType } from './entity.js';
/** Base command envelope. */
export interface Command<T extends string = string, P = unknown> {
    type: T;
    payload: P;
}
/** Base event envelope. */
export interface GameEvent<T extends string = string, P = unknown> {
    type: T;
    payload: P;
    timestamp: number;
}
export type CreateEntityCommand = Command<'entity:create', {
    name: string;
    x: number;
    y: number;
}>;
export type DeleteEntityCommand = Command<'entity:delete', {
    entityId: string;
}>;
export type MoveEntityCommand = Command<'entity:move', {
    entityId: string;
    x: number;
    y: number;
}>;
export type UpdateEntityVisualCommand = Command<'entity:updateVisual', {
    entityId: string;
    solid: boolean;
    spriteId?: string;
    animationClipId?: string;
}>;
export type RenameEntityCommand = Command<'entity:rename', {
    entityId: string;
    name: string;
}>;
export type SetEntitySpeedCommand = Command<'entity:setSpeed', {
    entityId: string;
    speed: number;
}>;
export type SetTileCommand = Command<'tile:set', {
    layerId: string;
    x: number;
    y: number;
    tileId: number;
}>;
export type PlaytestEnterCommand = Command<'playtest:enter', Record<string, never>>;
export type PlaytestExitCommand = Command<'playtest:exit', Record<string, never>>;
export type PlaytestPauseCommand = Command<'playtest:pause', Record<string, never>>;
export type PlaytestResumeCommand = Command<'playtest:resume', Record<string, never>>;
export type BehaviorRowAddCommand = Command<'behavior:row:add', {
    entityId: string;
    row: BehaviorRow;
}>;
export type BehaviorRowRemoveCommand = Command<'behavior:row:remove', {
    entityId: string;
    rowId: string;
}>;
export type BehaviorRowUpdateCommand = Command<'behavior:row:update', {
    entityId: string;
    rowId: string;
    patch: Partial<Omit<BehaviorRow, 'id'>>;
}>;
export type ApplyEffectPresetCommand = Command<'effects:applyPreset', {
    /** Preset to activate, or null to clear the active effect. */
    presetId: EffectPresetId | null;
    /** Normalized intensity in [0.0, 1.0]. Clamped by store on write. */
    intensity: number;
}>;
export type SetEffectFieldCouplingCommand = Command<'effects:setFieldCoupling', {
    /** Field to couple to, or null to disable coupling. */
    fieldId: EffectFieldId | null;
    /** Coupling influence in [0, 1]. Clamped by store on write. */
    influence: number;
}>;
export type AnimationAnchorAddCommand = Command<'animation:anchor:add', {
    clipId: string;
    anchorName: string;
    keyframe: AnchorKeyframe;
}>;
export type AnimationAnchorMoveCommand = Command<'animation:anchor:move', {
    clipId: string;
    anchorName: string;
    frame: number;
    pos: {
        x: number;
        y: number;
    };
    rot?: number;
    flip?: boolean;
}>;
export type AnimationAnchorRemoveCommand = Command<'animation:anchor:remove', {
    clipId: string;
    anchorName: string;
    frame: number;
}>;
export type EntitySlotAttachCommand = Command<'entity:slot:attach', {
    entityId: string;
    slotName: string;
    slotType: SlotType;
    parentEntityId: string;
    anchorName: string;
    occlusionHint: OcclusionHint;
}>;
export type EntitySlotDetachCommand = Command<'entity:slot:detach', {
    entityId: string;
    slotName: string;
}>;
export type EntitySlotSetOcclusionCommand = Command<'entity:slot:setOcclusion', {
    entityId: string;
    slotName: string;
    occlusionHint: OcclusionHint;
}>;
/** Union of all known commands. */
export type AnyCommand = CreateEntityCommand | DeleteEntityCommand | MoveEntityCommand | UpdateEntityVisualCommand | RenameEntityCommand | SetEntitySpeedCommand | SetTileCommand | PlaytestEnterCommand | PlaytestExitCommand | PlaytestPauseCommand | PlaytestResumeCommand | BehaviorRowAddCommand | BehaviorRowRemoveCommand | BehaviorRowUpdateCommand | ApplyEffectPresetCommand | SetEffectFieldCouplingCommand | AnimationAnchorAddCommand | AnimationAnchorMoveCommand | AnimationAnchorRemoveCommand | EntitySlotAttachCommand | EntitySlotDetachCommand | EntitySlotSetOcclusionCommand;
//# sourceMappingURL=commands.d.ts.map