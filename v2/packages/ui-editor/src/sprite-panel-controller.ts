/**
 * sprite-panel-controller.ts -- SPRITE-EDIT-001, SPRITE-STYLE-001, SPRITE-BRUSH-001
 * Wires the sprite editing panel UI to SpriteWorkspaceStore.
 * Pixel edits bypass the project command bus; undo/redo is local to the store.
 * Lint runs after each store change and reports results via onLintUpdate.
 * Brush dabs are expanded through BrushEngine before being passed to applyStroke.
 */

import { SpriteWorkspaceStore } from './sprite-workspace-store.js';
import { renderSpritePanel } from './sprite-panel.js';
import { lintSprite, SPRITE_PALETTE } from './sprite-style-lint.js';
import type { SpriteLintResult } from './sprite-style-lint.js';
import { expandDab } from './sprite-brush-engine.js';
import type { BrushType, BrushSize } from './sprite-brush-engine.js';

export class SpritePanelController {
  private readonly store: SpriteWorkspaceStore;
  private readonly container: HTMLElement;
  private readonly onLintUpdate: ((assetId: string | null, results: SpriteLintResult[]) => void) | null;
  private readonly unsubscribeStore: () => void;
  private readonly clickHandler: (e: Event) => void;
  private readonly pointerDownHandler: (e: PointerEvent) => void;
  private readonly pointerMoveHandler: (e: PointerEvent) => void;
  private readonly pointerUpHandler: (e: PointerEvent) => void;

  private activeTool: 'pencil' | 'erase' = 'pencil';
  private activeColor = '#000000';
  private activeBrush: BrushType = 'pencil';
  private activeBrushSize: BrushSize = 1;
  // Raw dab centres accumulated during a pointer drag (before brush expansion)
  private dabCentres: { x: number; y: number }[] = [];
  private lastDabPixel: { x: number; y: number } | null = null;
  private painting = false;
  private lastLintResults: SpriteLintResult[] = [];

  constructor(
    store: SpriteWorkspaceStore,
    container: HTMLElement,
    onLintUpdate?: (assetId: string | null, results: SpriteLintResult[]) => void,
  ) {
    this.store = store;
    this.container = container;
    this.onLintUpdate = onLintUpdate ?? null;

    this.clickHandler = (e: Event) => {
      const target = (e.target as Element).closest('[data-action]') as HTMLElement | null;
      if (!target) return;
      const action = target.dataset['action'];
      if (action === 'sprite:tool:pencil') { this.activeTool = 'pencil'; this.refresh(); }
      else if (action === 'sprite:tool:erase') { this.activeTool = 'erase'; this.refresh(); }
      else if (action === 'sprite:color:set') {
        const color = target.dataset['color'];
        if (color) { this.activeColor = color; this.refresh(); }
      }
      else if (action === 'sprite:brush:pencil') { this.activeBrush = 'pencil'; this.refresh(); }
      else if (action === 'sprite:brush:scatter') { this.activeBrush = 'scatter'; this.refresh(); }
      else if (action === 'sprite:brush:size') {
        const size = Number(target.dataset['size']) as BrushSize;
        if (size === 1 || size === 3 || size === 5) { this.activeBrushSize = size; this.refresh(); }
      }
      else if (action === 'sprite:undo') { this.store.undo(); }
      else if (action === 'sprite:redo') { this.store.redo(); }
      else if (action === 'sprite:remap') { this.applyRemap(); }
    };

    this.pointerDownHandler = (e: PointerEvent) => {
      const canvas = this.getCanvas();
      if (!canvas || e.target !== canvas) return;
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      this.painting = true;
      this.dabCentres = [];
      this.lastDabPixel = null;
      this.addDabCentre(e, canvas);
    };

    this.pointerMoveHandler = (e: PointerEvent) => {
      if (!this.painting) return;
      const canvas = this.getCanvas();
      if (!canvas) return;
      e.preventDefault();
      this.addDabCentre(e, canvas);
    };

    this.pointerUpHandler = (e: PointerEvent) => {
      if (!this.painting) return;
      const canvas = this.getCanvas();
      if (canvas) {
        canvas.releasePointerCapture(e.pointerId);
        this.addDabCentre(e, canvas);
      }
      this.painting = false;
      if (this.dabCentres.length > 0) {
        this.commitStroke();
      }
      this.dabCentres = [];
      this.lastDabPixel = null;
    };

    this.unsubscribeStore = store.subscribe(() => this.refresh());
    container.addEventListener('click', this.clickHandler);
    container.addEventListener('pointerdown', this.pointerDownHandler as EventListener);
    container.addEventListener('pointermove', this.pointerMoveHandler as EventListener);
    container.addEventListener('pointerup', this.pointerUpHandler as EventListener);

    this.refresh();
  }

  notifyEntitySelected(_entityId: string | null, spriteId?: string | null): void {
    if (spriteId) {
      this.store.openSprite(spriteId, 16, 16);
    } else {
      this.store.closeActive();
    }
  }

  refresh(): void {
    const buffer = this.store.getActiveBuffer();

    // Run palette lint and report results to shell
    this.lastLintResults = buffer ? lintSprite(buffer, SPRITE_PALETTE) : [];
    this.onLintUpdate?.(this.store.getActiveAssetId(), this.lastLintResults);

    this.container.innerHTML = renderSpritePanel(
      buffer,
      this.activeTool,
      this.activeColor,
      this.lastLintResults.length,
      this.activeBrush,
      this.activeBrushSize,
    );
    this.renderToCanvas();
  }

  dispose(): void {
    this.unsubscribeStore();
    this.container.removeEventListener('click', this.clickHandler);
    this.container.removeEventListener('pointerdown', this.pointerDownHandler as EventListener);
    this.container.removeEventListener('pointermove', this.pointerMoveHandler as EventListener);
    this.container.removeEventListener('pointerup', this.pointerUpHandler as EventListener);
  }

  /**
   * Expand all accumulated dab centres through the BrushEngine,
   * then submit as one applyStroke call (one undo record).
   */
  private commitStroke(): void {
    const rgba = this.hexToRgba(this.activeColor);
    const strokePoints: { x: number; y: number; rgba: [number, number, number, number] }[] = [];

    for (const { x, y } of this.dabCentres) {
      const pts = expandDab(x, y, this.activeBrush, this.activeBrushSize);
      for (const pt of pts) {
        strokePoints.push({ x: pt.x, y: pt.y, rgba });
      }
    }

    if (strokePoints.length > 0) {
      this.store.applyStroke(strokePoints, this.activeTool);
    }
  }

  private applyRemap(): void {
    if (this.lastLintResults.length === 0) return;
    const points = this.lastLintResults.map((r) => ({
      x: r.x,
      y: r.y,
      rgba: r.nearestRgba,
    }));
    this.store.applyPixelFix(points);
    // Store fires refresh() via subscription, which re-lints and updates onLintUpdate
  }

  private getCanvas(): HTMLCanvasElement | null {
    return this.container.querySelector<HTMLCanvasElement>('#sprite-edit-canvas');
  }

  private renderToCanvas(): void {
    const canvas = this.getCanvas();
    const buffer = this.store.getActiveBuffer();
    if (!canvas || !buffer) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const imageData = new ImageData(
      new Uint8ClampedArray(buffer.pixels),
      buffer.width,
      buffer.height,
    );
    ctx.putImageData(imageData, 0, 0);
  }

  private addDabCentre(e: PointerEvent, canvas: HTMLCanvasElement): void {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top)  * scaleY);

    // De-duplicate: skip if same centre pixel as last added
    if (this.lastDabPixel && this.lastDabPixel.x === x && this.lastDabPixel.y === y) return;

    this.dabCentres.push({ x, y });
    this.lastDabPixel = { x, y };
  }

  private hexToRgba(hex: string): [number, number, number, number] {
    const n = parseInt(hex.replace('#', ''), 16);
    return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff, 255];
  }
}
