/**
 * SpriteWorkspaceStore -- SPRITE-EDIT-001
 *
 * Editor-only pixel buffer for sprite editing. Never enters ProjectStore.
 * Pixel edits are deterministic and pixel-safe (no alpha blending).
 * Undo/redo is local to this store; not integrated with shell undo stack (MVP limitation).
 */
export interface SpriteBuffer {
    assetId: string;
    width: number;
    height: number;
    pixels: Uint8ClampedArray;
    dirty: boolean;
}
export interface SpriteStrokeRecord {
    points: {
        x: number;
        y: number;
        before: number;
        after: number;
    }[];
}
export declare class SpriteWorkspaceStore {
    private readonly buffers;
    private readonly historyMap;
    private readonly redoMap;
    private activeAssetId;
    private readonly listeners;
    openSprite(assetId: string, width: number, height: number): void;
    getActiveBuffer(): Readonly<SpriteBuffer> | null;
    getActiveAssetId(): string | null;
    /**
     * Apply a stroke to the active buffer.
     * Points must be pre-de-duplicated by the caller.
     * Pixel-safe: only exact RGBA values are written; no alpha blending.
     * Erase tool writes [0,0,0,0]. Out-of-bounds points are silently ignored.
     */
    applyStroke(points: {
        x: number;
        y: number;
        rgba: [number, number, number, number];
    }[], tool: 'pencil' | 'erase'): void;
    undo(): void;
    redo(): void;
    canUndo(): boolean;
    canRedo(): boolean;
    /**
     * Apply a pixel fix to the active buffer without recording to undo history.
     * Used for deterministic palette remapping so lint fixes do not pollute undo stack.
     * Pixel-safe: skips pixels where the new value matches the existing value.
     */
    applyPixelFix(points: {
        x: number;
        y: number;
        rgba: [number, number, number, number];
    }[]): void;
    /**
     * Export all buffers as plain serializable objects for project persistence (SPRITE-PERSIST-001).
     * Pixels are converted from Uint8ClampedArray to regular number[] for JSON compatibility.
     */
    exportBuffers(): {
        assetId: string;
        width: number;
        height: number;
        pixels: number[];
    }[];
    /**
     * Import a sprite buffer from persisted data (SPRITE-PERSIST-001).
     * Creates the buffer if it does not exist; replaces pixel data if it does.
     * Does not affect undo history.
     */
    importBuffer(assetId: string, width: number, height: number, pixels: number[]): void;
    closeActive(): void;
    /**
     * Clear all buffers, history, and active selection.
     * Call on new project / load to prevent stale workspace state leaking across projects.
     * SPRITE-PERSIST-001.
     */
    clearAll(): void;
    subscribe(fn: () => void): () => void;
    private notify;
}
//# sourceMappingURL=sprite-workspace-store.d.ts.map