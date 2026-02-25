/**
 * effect-store.ts -- FX-PRESET-001
 *
 * Built-in effect preset catalog and preset ID validation.
 * Pure module: no state, no side effects.
 */
import type { EffectFieldDefinition, EffectFieldId, EffectPreset, EffectPresetId, MapEffectState } from '@gcs/contracts';
/** Catalog of built-in effect presets available in the editor. */
export declare const BUILT_IN_PRESETS: readonly EffectPreset[];
/** Field catalog for FX-FIELD-001 coupling. */
export declare const BUILT_IN_EFFECT_FIELDS: readonly EffectFieldDefinition[];
/**
 * Type guard: returns true if id is a known EffectPresetId.
 * Used by ProjectStore to reject unknown presets before writing state.
 */
export declare function isKnownPresetId(id: string | null): id is EffectPresetId;
export declare function isKnownEffectFieldId(id: string | null): id is EffectFieldId;
/**
 * Deterministic scalar sampler for built-in fields by playtest tick.
 * Uses a fixed lookup table to avoid runtime math drift.
 */
export declare function sampleFieldValue(fieldId: EffectFieldId, tick: number): number;
/**
 * Resolve effective overlay intensity after applying optional field coupling.
 * Formula: base * lerp(1, sample, influence).
 */
export declare function resolveEffectiveIntensity(state: MapEffectState, tick: number): number;
//# sourceMappingURL=effect-store.d.ts.map