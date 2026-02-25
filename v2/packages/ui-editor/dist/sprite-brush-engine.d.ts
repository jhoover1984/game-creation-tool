/**
 * sprite-brush-engine.ts -- SPRITE-BRUSH-001
 *
 * Pure, stateless brush engine for sprite pixel editing.
 * Produces deterministic point sets from a dab center, brush type, and size.
 * No Math.random -- seed is derived from dab position for full reproducibility.
 */
/** Supported brush types for SPRITE-BRUSH-001 MVP. */
export type BrushType = 'pencil' | 'scatter';
/** Supported brush sizes (diameter in pixels). */
export type BrushSize = 1 | 3 | 5;
/** A discrete pixel coordinate. */
export interface BrushPoint {
    x: number;
    y: number;
}
/**
 * Generate the set of pixels affected by one brush dab.
 *
 * - pencil: always returns exactly [(x, y)] regardless of size.
 * - scatter: generates up to `MAX_POINTS_PER_DAB` pixels within a square
 *   of side `size` centred on (x, y), using a position-derived seed.
 *   Points are sorted in ascending (y, x) order and deduplicated.
 *
 * Caller is responsible for bounds-checking against the sprite dimensions.
 *
 * @param cx - Centre x of the dab.
 * @param cy - Centre y of the dab.
 * @param brushType - 'pencil' or 'scatter'.
 * @param size - Brush diameter: 1, 3, or 5.
 * @returns Sorted, deduplicated array of pixel coordinates.
 */
export declare function expandDab(cx: number, cy: number, brushType: BrushType, size: BrushSize): BrushPoint[];
/**
 * Expand a sequence of stroke dab centres through the brush engine.
 * Each centre is expanded independently; duplicates across dabs are preserved
 * (the store's pixel-safe guarantee handles overwriting the same pixel).
 *
 * @param dabs - Array of dab centre coordinates.
 * @param brushType - Brush type to apply.
 * @param size - Brush size to apply.
 * @returns Flat array of all expanded points (may contain inter-dab duplicates).
 */
export declare function expandStroke(dabs: readonly BrushPoint[], brushType: BrushType, size: BrushSize): BrushPoint[];
//# sourceMappingURL=sprite-brush-engine.d.ts.map