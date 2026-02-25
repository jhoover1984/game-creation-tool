/**
 * @gcs/contracts -- shared schemas and types for GCS v2.
 *
 * This package defines the contract boundary between:
 * - Rust core (simulation/physics/collision/animation)
 * - TypeScript adapters (runtime-web, runtime-desktop)
 * - UI editor
 *
 * All cross-boundary data must use types defined here.
 */
export * from './project.js';
export * from './entity.js';
export * from './tile.js';
export * from './animation.js';
export * from './story.js';
export * from './commands.js';
export * from './playtest.js';
export * from './semantic-validation.js';
export * from './diagnostics.js';
export * from './inspector-schema.js';
export * from './behavior.js';
export * from './effects.js';
//# sourceMappingURL=index.d.ts.map