/**
 * sprite-brush-engine.ts -- SPRITE-BRUSH-001
 *
 * Pure, stateless brush engine for sprite pixel editing.
 * Produces deterministic point sets from a dab center, brush type, and size.
 * No Math.random -- seed is derived from dab position for full reproducibility.
 */
/** Maximum points generated per dab (performance cap). */
const MAX_POINTS_PER_DAB = 50;
/**
 * Minimal seeded pseudo-random number generator (xorshift32).
 * Returns a value in [0, 1) for the given seed.
 * Deterministic: same seed => same sequence.
 */
function seededRand(seed) {
    let s = seed >>> 0;
    if (s === 0)
        s = 1; // xorshift must not start at 0
    return () => {
        s ^= s << 13;
        s ^= s >>> 17;
        s ^= s << 5;
        s = s >>> 0; // keep unsigned
        return s / 0x100000000;
    };
}
/**
 * Derive a deterministic seed from dab centre coordinates.
 * Different (x, y) pairs always produce different seeds.
 */
function seedFromPosition(x, y) {
    // Simple but well-distributed hash; avoids 0 by ORing 1
    return (((x * 73856093) ^ (y * 19349663)) >>> 0) | 1;
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
export function expandDab(cx, cy, brushType, size) {
    if (brushType === 'pencil' || size === 1) {
        return [{ x: cx, y: cy }];
    }
    // scatter: fill a square of `size x size` centred on (cx, cy)
    const half = Math.floor(size / 2);
    const rand = seededRand(seedFromPosition(cx, cy));
    // Collect all candidate positions in the square
    const candidates = [];
    for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) {
            candidates.push({ x: cx + dx, y: cy + dy });
        }
    }
    // Scatter: randomly sample candidates using the seeded RNG
    // Fisher-Yates shuffle (deterministic), then take up to cap
    for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        const tmp = candidates[i];
        candidates[i] = candidates[j];
        candidates[j] = tmp;
    }
    const count = Math.min(candidates.length, MAX_POINTS_PER_DAB);
    const selected = candidates.slice(0, count);
    // Sort ascending (y, then x) for deterministic, stable order
    selected.sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x);
    // Deduplicate (already sorted, so adjacent check is sufficient)
    const deduped = [];
    for (const pt of selected) {
        const last = deduped[deduped.length - 1];
        if (!last || last.x !== pt.x || last.y !== pt.y) {
            deduped.push(pt);
        }
    }
    return deduped;
}
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
export function expandStroke(dabs, brushType, size) {
    const result = [];
    for (const { x, y } of dabs) {
        const pts = expandDab(x, y, brushType, size);
        for (const pt of pts) {
            result.push(pt);
        }
    }
    return result;
}
//# sourceMappingURL=sprite-brush-engine.js.map