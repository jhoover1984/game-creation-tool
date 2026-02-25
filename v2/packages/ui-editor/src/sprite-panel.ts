/**
 * sprite-panel.ts -- SPRITE-EDIT-001, SPRITE-STYLE-001, SPRITE-BRUSH-001
 * Pure render functions for the sprite editing panel.
 */

import type { SpriteBuffer } from './sprite-workspace-store.js';
import type { BrushType, BrushSize } from './sprite-brush-engine.js';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const PRESET_COLORS = [
  '#000000', '#ffffff', '#ff0000', '#00cc00', '#0000ff', '#ffcc00',
];

const BRUSH_SIZES: readonly number[] = [1, 3, 5];

export function renderSpritePanel(
  buffer: Readonly<SpriteBuffer> | null,
  activeTool: 'pencil' | 'erase',
  activeColor: string,
  lintCount = 0,
  activeBrush: BrushType = 'pencil',
  activeBrushSize: BrushSize = 1,
): string {
  if (buffer === null) {
    return '<p class="empty-state">No sprite selected. Select an entity with a sprite ID to edit it here.</p>';
  }

  const swatches = PRESET_COLORS.map((c) => {
    const active = c === activeColor ? ' sprite-color-swatch--active' : '';
    return `<button class="sprite-color-swatch${active}" data-action="sprite:color:set" data-color="${escapeHtml(c)}" style="background:${escapeHtml(c)}" aria-label="Color ${escapeHtml(c)}"></button>`;
  }).join('');

  const eraseActive = activeTool === 'erase' ? ' sprite-btn--active' : '';
  const pencilActive = activeTool === 'pencil' ? ' sprite-btn--active' : '';
  const remapLabel = lintCount > 0 ? `Remap (${lintCount})` : 'Remap';
  const remapDisabled = lintCount === 0 ? ' disabled' : '';

  const brushPencilActive = activeBrush === 'pencil' ? ' sprite-btn--active' : '';
  const brushScatterActive = activeBrush === 'scatter' ? ' sprite-btn--active' : '';

  const sizeBtns = BRUSH_SIZES.map((s) => {
    const active = s === activeBrushSize ? ' sprite-btn--active' : '';
    return `<button class="sprite-btn${active}" data-action="sprite:brush:size" data-size="${s}">${s}px</button>`;
  }).join('');

  return `
<div class="sprite-toolbar">
  <button class="sprite-btn${pencilActive}" data-action="sprite:tool:pencil">Pencil</button>
  <button class="sprite-btn${eraseActive}" data-action="sprite:tool:erase">Erase</button>
  <span class="sprite-toolbar-sep"></span>
  <button class="sprite-btn${brushPencilActive}" data-action="sprite:brush:pencil" title="Point brush">Point</button>
  <button class="sprite-btn${brushScatterActive}" data-action="sprite:brush:scatter" title="Scatter brush">Scatter</button>
  <span class="sprite-toolbar-sep"></span>
  ${sizeBtns}
  <span class="sprite-toolbar-sep"></span>
  ${swatches}
  <span class="sprite-toolbar-sep"></span>
  <button class="sprite-btn" data-action="sprite:undo">Undo</button>
  <button class="sprite-btn" data-action="sprite:redo">Redo</button>
  <span class="sprite-toolbar-sep"></span>
  <button class="sprite-btn sprite-btn--remap"${remapDisabled} data-action="sprite:remap" title="Remap off-palette pixels to nearest palette color">${escapeHtml(remapLabel)}</button>
</div>
<div class="sprite-canvas-wrap">
  <canvas id="sprite-edit-canvas" width="${buffer.width}" height="${buffer.height}" style="image-rendering:pixelated;cursor:crosshair;"></canvas>
</div>`.trim();
}
