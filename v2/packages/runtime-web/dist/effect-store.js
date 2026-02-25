/**
 * effect-store.ts -- FX-PRESET-001
 *
 * Built-in effect preset catalog and preset ID validation.
 * Pure module: no state, no side effects.
 */
/** Catalog of built-in effect presets available in the editor. */
export const BUILT_IN_PRESETS = [
    { id: 'rain', name: 'Rain', defaultIntensity: 0.6 },
    { id: 'fog', name: 'Fog', defaultIntensity: 0.5 },
    { id: 'night_tint', name: 'Night Tint', defaultIntensity: 0.4 },
];
/** Field catalog for FX-FIELD-001 coupling. */
export const BUILT_IN_EFFECT_FIELDS = [
    { id: 'wind.global', name: 'Global Wind', valueType: 'scalar' },
];
const KNOWN_IDS = new Set(BUILT_IN_PRESETS.map((p) => p.id));
const KNOWN_FIELD_IDS = new Set(BUILT_IN_EFFECT_FIELDS.map((f) => f.id));
/**
 * Type guard: returns true if id is a known EffectPresetId.
 * Used by ProjectStore to reject unknown presets before writing state.
 */
export function isKnownPresetId(id) {
    if (id === null)
        return false;
    return KNOWN_IDS.has(id);
}
export function isKnownEffectFieldId(id) {
    if (id === null)
        return false;
    return KNOWN_FIELD_IDS.has(id);
}
/**
 * Deterministic scalar sampler for built-in fields by playtest tick.
 * Uses a fixed lookup table to avoid runtime math drift.
 */
export function sampleFieldValue(fieldId, tick) {
    if (fieldId === 'wind.global') {
        const cycle = [0.25, 0.4, 0.55, 0.7, 0.85, 0.7, 0.55, 0.4];
        const index = Math.abs(Math.floor(tick)) % cycle.length;
        return cycle[index];
    }
    return 0;
}
/**
 * Resolve effective overlay intensity after applying optional field coupling.
 * Formula: base * lerp(1, sample, influence).
 */
export function resolveEffectiveIntensity(state, tick) {
    const base = clamp01(state.intensity);
    const link = state.fieldLink;
    if (!link.fieldId)
        return base;
    const sample = sampleFieldValue(link.fieldId, tick);
    const influence = clamp01(link.influence);
    return clamp01(base * ((1 - influence) + (influence * sample)));
}
function clamp01(value) {
    return Math.max(0, Math.min(1, value));
}
//# sourceMappingURL=effect-store.js.map