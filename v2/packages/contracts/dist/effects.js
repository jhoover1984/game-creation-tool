/**
 * Effect preset contracts for FX-PRESET-001.
 * Defines the data boundary between runtime-web (preset state) and ui-editor (rendering).
 *
 * Determinism note: no wall-clock or random branching in runtime state. If a seed
 * is needed for future particle simulation (FX-FIELD-001+), it will be an explicit
 * field on MapEffectState, not derived from system time.
 */
export {};
//# sourceMappingURL=effects.js.map