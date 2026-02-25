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
  pixels: Uint8ClampedArray; // RGBA, row-major: index = (y * width + x) * 4
  dirty: boolean;
}

export interface SpriteStrokeRecord {
  points: { x: number; y: number; before: number; after: number }[];
  // before/after: RGBA packed as ((r<<24|g<<16|b<<8|a) >>> 0) for unsigned safety
}

function packRgba(r: number, g: number, b: number, a: number): number {
  return ((r << 24 | g << 16 | b << 8 | a) >>> 0);
}

function unpackRgba(packed: number): [number, number, number, number] {
  return [
    (packed >>> 24) & 0xff,
    (packed >>> 16) & 0xff,
    (packed >>> 8)  & 0xff,
    (packed >>> 0)  & 0xff,
  ];
}

export class SpriteWorkspaceStore {
  private readonly buffers    = new Map<string, SpriteBuffer>();
  private readonly historyMap = new Map<string, SpriteStrokeRecord[]>();
  private readonly redoMap    = new Map<string, SpriteStrokeRecord[]>();
  private activeAssetId: string | null = null;
  private readonly listeners: Set<() => void> = new Set();

  openSprite(assetId: string, width: number, height: number): void {
    if (!this.buffers.has(assetId)) {
      this.buffers.set(assetId, {
        assetId,
        width,
        height,
        pixels: new Uint8ClampedArray(width * height * 4), // all transparent
        dirty: false,
      });
      this.historyMap.set(assetId, []);
      this.redoMap.set(assetId, []);
    }
    this.activeAssetId = assetId;
    this.notify();
  }

  getActiveBuffer(): Readonly<SpriteBuffer> | null {
    if (this.activeAssetId === null) return null;
    return this.buffers.get(this.activeAssetId) ?? null;
  }

  getActiveAssetId(): string | null {
    return this.activeAssetId;
  }

  /**
   * Apply a stroke to the active buffer.
   * Points must be pre-de-duplicated by the caller.
   * Pixel-safe: only exact RGBA values are written; no alpha blending.
   * Erase tool writes [0,0,0,0]. Out-of-bounds points are silently ignored.
   */
  applyStroke(
    points: { x: number; y: number; rgba: [number, number, number, number] }[],
    tool: 'pencil' | 'erase',
  ): void {
    if (this.activeAssetId === null) return;
    const buf = this.buffers.get(this.activeAssetId);
    if (!buf) return;

    const record: SpriteStrokeRecord = { points: [] };

    for (const { x, y, rgba } of points) {
      if (x < 0 || y < 0 || x >= buf.width || y >= buf.height) continue;
      const idx = (y * buf.width + x) * 4;
      const [r, g, b, a] = buf.pixels.slice(idx, idx + 4) as unknown as [number, number, number, number];
      const before = packRgba(r, g, b, a);
      const [nr, ng, nb, na] = tool === 'erase' ? [0, 0, 0, 0] : rgba;
      const after = packRgba(nr, ng, nb, na);
      if (before === after) continue; // pixel-safe: skip unchanged
      buf.pixels[idx]     = nr;
      buf.pixels[idx + 1] = ng;
      buf.pixels[idx + 2] = nb;
      buf.pixels[idx + 3] = na;
      record.points.push({ x, y, before, after });
    }

    if (record.points.length > 0) {
      buf.dirty = true;
      this.historyMap.get(this.activeAssetId)!.push(record);
      this.redoMap.get(this.activeAssetId)!.length = 0; // clear redo on new stroke
      this.notify();
    }
  }

  undo(): void {
    if (this.activeAssetId === null) return;
    const history = this.historyMap.get(this.activeAssetId);
    const buf = this.buffers.get(this.activeAssetId);
    if (!history || !buf || history.length === 0) return;

    const record = history.pop()!;
    for (const { x, y, before } of record.points) {
      const idx = (y * buf.width + x) * 4;
      const [r, g, b, a] = unpackRgba(before);
      buf.pixels[idx]     = r;
      buf.pixels[idx + 1] = g;
      buf.pixels[idx + 2] = b;
      buf.pixels[idx + 3] = a;
    }
    this.redoMap.get(this.activeAssetId)!.push(record);
    buf.dirty = history.length > 0;
    this.notify();
  }

  redo(): void {
    if (this.activeAssetId === null) return;
    const redoStack = this.redoMap.get(this.activeAssetId);
    const buf = this.buffers.get(this.activeAssetId);
    if (!redoStack || !buf || redoStack.length === 0) return;

    const record = redoStack.pop()!;
    for (const { x, y, after } of record.points) {
      const idx = (y * buf.width + x) * 4;
      const [r, g, b, a] = unpackRgba(after);
      buf.pixels[idx]     = r;
      buf.pixels[idx + 1] = g;
      buf.pixels[idx + 2] = b;
      buf.pixels[idx + 3] = a;
    }
    this.historyMap.get(this.activeAssetId)!.push(record);
    buf.dirty = true;
    this.notify();
  }

  canUndo(): boolean {
    if (this.activeAssetId === null) return false;
    return (this.historyMap.get(this.activeAssetId)?.length ?? 0) > 0;
  }

  canRedo(): boolean {
    if (this.activeAssetId === null) return false;
    return (this.redoMap.get(this.activeAssetId)?.length ?? 0) > 0;
  }

  /**
   * Apply a pixel fix to the active buffer without recording to undo history.
   * Used for deterministic palette remapping so lint fixes do not pollute undo stack.
   * Pixel-safe: skips pixels where the new value matches the existing value.
   */
  applyPixelFix(
    points: { x: number; y: number; rgba: [number, number, number, number] }[],
  ): void {
    if (this.activeAssetId === null) return;
    const buf = this.buffers.get(this.activeAssetId);
    if (!buf) return;
    let changed = false;
    for (const { x, y, rgba } of points) {
      if (x < 0 || y < 0 || x >= buf.width || y >= buf.height) continue;
      const idx = (y * buf.width + x) * 4;
      const [nr, ng, nb, na] = rgba;
      if (buf.pixels[idx] === nr && buf.pixels[idx + 1] === ng &&
          buf.pixels[idx + 2] === nb && buf.pixels[idx + 3] === na) continue;
      buf.pixels[idx]     = nr;
      buf.pixels[idx + 1] = ng;
      buf.pixels[idx + 2] = nb;
      buf.pixels[idx + 3] = na;
      buf.dirty = true;
      changed = true;
    }
    if (changed) this.notify();
  }

  /**
   * Export all buffers as plain serializable objects for project persistence (SPRITE-PERSIST-001).
   * Pixels are converted from Uint8ClampedArray to regular number[] for JSON compatibility.
   */
  exportBuffers(): { assetId: string; width: number; height: number; pixels: number[] }[] {
    const result: { assetId: string; width: number; height: number; pixels: number[] }[] = [];
    for (const buf of this.buffers.values()) {
      result.push({
        assetId: buf.assetId,
        width: buf.width,
        height: buf.height,
        pixels: Array.from(buf.pixels),
      });
    }
    return result;
  }

  /**
   * Import a sprite buffer from persisted data (SPRITE-PERSIST-001).
   * Creates the buffer if it does not exist; replaces pixel data if it does.
   * Does not affect undo history.
   */
  importBuffer(assetId: string, width: number, height: number, pixels: number[]): void {
    const typed = new Uint8ClampedArray(pixels);
    const existing = this.buffers.get(assetId);
    if (existing && existing.width === width && existing.height === height) {
      existing.pixels.set(typed);
      existing.dirty = false;
    } else {
      this.buffers.set(assetId, { assetId, width, height, pixels: typed, dirty: false });
      this.historyMap.set(assetId, []);
      this.redoMap.set(assetId, []);
    }
  }

  closeActive(): void {
    this.activeAssetId = null;
    this.notify();
  }

  /**
   * Clear all buffers, history, and active selection.
   * Call on new project / load to prevent stale workspace state leaking across projects.
   * SPRITE-PERSIST-001.
   */
  clearAll(): void {
    this.buffers.clear();
    this.historyMap.clear();
    this.redoMap.clear();
    this.activeAssetId = null;
    this.notify();
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    for (const fn of this.listeners) fn();
  }
}
