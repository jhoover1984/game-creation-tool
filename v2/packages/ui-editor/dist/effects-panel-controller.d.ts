/**
 * effects-panel-controller.ts -- FX-PRESET-001
 * Wires the effects workspace panel to EditorApp and the fx-overlay element.
 *
 * Preset apply/clear/intensity changes dispatch effects:applyPreset through EditorApp.
 * Field link/influence changes dispatch effects:setFieldCoupling through EditorApp.
 * The CSS overlay (#fx-overlay) is updated directly as a display-layer concern:
 *   - data-fx-preset attribute drives CSS animations
 *   - --fx-intensity custom property drives CSS opacity/strength
 */
import type { EditorApp } from './editor-app.js';
export declare class EffectsPanelController {
    private readonly app;
    private readonly container;
    private readonly overlay;
    private readonly clickHandler;
    private readonly inputHandler;
    private readonly unsubscribe;
    private playtestTick;
    constructor(app: EditorApp, container: HTMLElement, overlay?: HTMLElement | null);
    refresh(): void;
    setPlaytestTick(tick: number): void;
    dispose(): void;
    private updateOverlay;
}
//# sourceMappingURL=effects-panel-controller.d.ts.map