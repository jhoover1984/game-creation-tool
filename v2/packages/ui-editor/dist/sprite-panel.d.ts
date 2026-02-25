/**
 * sprite-panel.ts -- SPRITE-EDIT-001, SPRITE-STYLE-001, SPRITE-BRUSH-001
 * Pure render functions for the sprite editing panel.
 */
import type { SpriteBuffer } from './sprite-workspace-store.js';
import type { BrushType, BrushSize } from './sprite-brush-engine.js';
export declare function renderSpritePanel(buffer: Readonly<SpriteBuffer> | null, activeTool: 'pencil' | 'erase', activeColor: string, lintCount?: number, activeBrush?: BrushType, activeBrushSize?: BrushSize): string;
//# sourceMappingURL=sprite-panel.d.ts.map