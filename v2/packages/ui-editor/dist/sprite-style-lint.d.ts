/**
 * sprite-style-lint.ts -- SPRITE-STYLE-001
 *
 * Pure, stateless sprite palette lint service.
 * Reports off-palette pixels and provides nearest-color remapping data.
 * Has no side effects; does not mutate any buffer or store.
 */
import type { SpriteBuffer } from './sprite-workspace-store.js';
/** Canonical sprite palette -- RGBA tuples matching PRESET_COLORS in sprite-panel.ts */
export declare const SPRITE_PALETTE: readonly [number, number, number, number][];
/** One lint result per off-palette pixel. */
export interface SpriteLintResult {
    x: number;
    y: number;
    /** Actual pixel RGBA as found in the buffer. */
    foundRgba: [number, number, number, number];
    /** Nearest palette RGBA for deterministic remap. */
    nearestRgba: [number, number, number, number];
}
/**
 * Find the nearest colour in the palette to the given RGBA value.
 * The palette must be non-empty.
 */
export declare function nearestPaletteColor(rgba: [number, number, number, number], palette: readonly [number, number, number, number][]): [number, number, number, number];
/**
 * Lint a sprite buffer against the given palette.
 *
 * Rules:
 * - Fully transparent pixels (alpha === 0) are exempt -- they represent empty cells.
 * - Every other pixel must exactly match one palette entry (by RGBA).
 * - Off-palette pixels are returned with their nearest remapped colour.
 *
 * @param buffer - The sprite buffer to lint (read-only).
 * @param palette - The canonical palette to check against.
 * @returns Array of lint results, one per off-palette pixel. Empty if all clean.
 */
export declare function lintSprite(buffer: Readonly<SpriteBuffer>, palette: readonly [number, number, number, number][]): SpriteLintResult[];
//# sourceMappingURL=sprite-style-lint.d.ts.map