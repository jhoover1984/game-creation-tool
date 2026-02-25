/**
 * Effect preset contracts for FX-PRESET-001.
 * Defines the data boundary between runtime-web (preset state) and ui-editor (rendering).
 *
 * Determinism note: no wall-clock or random branching in runtime state. If a seed
 * is needed for future particle simulation (FX-FIELD-001+), it will be an explicit
 * field on MapEffectState, not derived from system time.
 */
/** The set of built-in effect preset IDs for MVP. Extensible in future phases. */
export type EffectPresetId = 'rain' | 'fog' | 'night_tint';
/** The set of built-in world field IDs that effects can sample in FX-FIELD-001. */
export type EffectFieldId = 'wind.global';
/** Catalog entry for a built-in effect preset. */
export interface EffectPreset {
    id: EffectPresetId;
    name: string;
    /** Default normalized intensity [0.0..1.0]. */
    defaultIntensity: number;
}
/** A world field definition exposed for effects coupling. */
export interface EffectFieldDefinition {
    id: EffectFieldId;
    name: string;
    valueType: 'scalar';
}
/** Link configuration between effects and a sampled world field. */
export interface EffectFieldLink {
    /** Linked field ID, or null when no coupling is active. */
    fieldId: EffectFieldId | null;
    /** Blend strength in [0, 1]. 0 = ignore field, 1 = full field influence. */
    influence: number;
}
/**
 * Active effect state for a map.
 * Stored in ProjectStore; persists in save/load.
 * Mutations always go through effects:applyPreset command.
 */
export interface MapEffectState {
    /** Currently active preset, or null if no effect is active. */
    activePresetId: EffectPresetId | null;
    /** Normalized intensity in [0.0, 1.0]. Clamped by store on write. */
    intensity: number;
    /** Optional field coupling config for deterministic playtest modulation. */
    fieldLink: EffectFieldLink;
}
//# sourceMappingURL=effects.d.ts.map