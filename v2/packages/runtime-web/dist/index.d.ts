/**
 * @gcs/runtime-web -- browser adapter for GCS v2.
 *
 * Loads the WASM simulation core and bridges it to the web canvas.
 * This is the primary runtime during early development (web-first strategy).
 */
export { CommandBus } from './command-bus.js';
export { ProjectStore } from './project-store.js';
export { PlaytestRunner } from './playtest-runner.js';
export { AnimationPlayer } from './animation-player.js';
export { DiagnosticStore, resolveFixAction } from './diagnostic-store.js';
export { BehaviorEvaluator } from './behavior-evaluator.js';
export { BUILT_IN_PRESETS, BUILT_IN_EFFECT_FIELDS, isKnownPresetId, isKnownEffectFieldId, sampleFieldValue, resolveEffectiveIntensity, } from './effect-store.js';
export { evaluateExportPreflight } from './export-preflight.js';
export type { ExportPreflightIssue, ExportPreflightReport } from './export-preflight.js';
export { buildDeterministicExport } from './export-build.js';
export type { ExportBuildArtifact, ExportBuildInput, ExportBuildMetadata, ExportBuildReport } from './export-build.js';
export { resolveTargetEntityIds } from './behavior-targeting.js';
export { resolveAnchorPosition, detectCircularAttachment, resolveOcclusionOrder, } from './animation-anchor.js';
//# sourceMappingURL=index.d.ts.map