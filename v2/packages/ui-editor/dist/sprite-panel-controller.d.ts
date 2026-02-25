/**
 * sprite-panel-controller.ts -- SPRITE-EDIT-001, SPRITE-STYLE-001, SPRITE-BRUSH-001
 * Wires the sprite editing panel UI to SpriteWorkspaceStore.
 * Pixel edits bypass the project command bus; undo/redo is local to the store.
 * Lint runs after each store change and reports results via onLintUpdate.
 * Brush dabs are expanded through BrushEngine before being passed to applyStroke.
 */
import { SpriteWorkspaceStore } from './sprite-workspace-store.js';
import type { SpriteLintResult } from './sprite-style-lint.js';
export declare class SpritePanelController {
    private readonly store;
    private readonly container;
    private readonly onLintUpdate;
    private readonly unsubscribeStore;
    private readonly clickHandler;
    private readonly pointerDownHandler;
    private readonly pointerMoveHandler;
    private readonly pointerUpHandler;
    private activeTool;
    private activeColor;
    private activeBrush;
    private activeBrushSize;
    private dabCentres;
    private lastDabPixel;
    private painting;
    private lastLintResults;
    constructor(store: SpriteWorkspaceStore, container: HTMLElement, onLintUpdate?: (assetId: string | null, results: SpriteLintResult[]) => void);
    notifyEntitySelected(_entityId: string | null, spriteId?: string | null): void;
    refresh(): void;
    dispose(): void;
    /**
     * Expand all accumulated dab centres through the BrushEngine,
     * then submit as one applyStroke call (one undo record).
     */
    private commitStroke;
    private applyRemap;
    private getCanvas;
    private renderToCanvas;
    private addDabCentre;
    private hexToRgba;
}
//# sourceMappingURL=sprite-panel-controller.d.ts.map