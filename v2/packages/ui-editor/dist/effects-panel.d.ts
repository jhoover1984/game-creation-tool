/**
 * effects-panel.ts -- FX-PRESET-001
 * Pure renderer for the effects workspace panel.
 * No state. Returns HTML string only.
 */
import type { EffectFieldDefinition, EffectPreset, MapEffectState } from '@gcs/contracts';
/**
 * Render the effects panel HTML.
 *
 * @param effectState - Current map effect state (from ProjectStore).
 * @param presets     - Catalog of built-in presets to display.
 * @returns HTML string; safe to assign to container.innerHTML.
 */
export declare function renderEffectsPanel(effectState: MapEffectState, presets: readonly EffectPreset[], fields: readonly EffectFieldDefinition[]): string;
//# sourceMappingURL=effects-panel.d.ts.map