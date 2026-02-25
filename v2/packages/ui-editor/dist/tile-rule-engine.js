/**
 * tile-rule-engine.ts -- TILE-RULE-001
 *
 * Pure, stateless rule-based tile mapping engine.
 * Computes cardinal adjacency masks and resolves tile variants deterministically.
 * Has no side effects; does not mutate any layer or store.
 */
/**
 * A built-in demo ruleset mapping 4-bit cardinal masks to tile IDs 1..16.
 * TileIds 1-16 are all considered "same type" for adjacency matching.
 * Intended for testing and development -- not for production use.
 *
 * Mask -> TileId mapping (N=1, E=2, S=4, W=8):
 *   0  (none)   -> 1
 *   1  (N)      -> 2
 *   2  (E)      -> 3
 *   3  (NE)     -> 4
 *   4  (S)      -> 5
 *   5  (NS)     -> 6
 *   6  (SE)     -> 7
 *   7  (NES)    -> 8
 *   8  (W)      -> 9
 *   9  (NW)     -> 10
 *   10 (EW)     -> 11
 *   11 (NEW)    -> 12
 *   12 (SW)     -> 13
 *   13 (NSW)    -> 14
 *   14 (SEW)    -> 15
 *   15 (NESW)   -> 16
 */
export const DEMO_RULESET = {
    id: 'demo-terrain',
    name: 'Demo Terrain',
    matchTileIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    variants: {
        0: 1, 1: 2, 2: 3, 3: 4,
        4: 5, 5: 6, 6: 7, 7: 8,
        8: 9, 9: 10, 10: 11, 11: 12,
        12: 13, 13: 14, 14: 15, 15: 16,
    },
    fallbackTileId: 1,
};
/**
 * Compute the 4-bit cardinal adjacency mask for tile at (x, y).
 *
 * Bit assignment: N=1, E=2, S=4, W=8.
 * A direction bit is set when the neighbor cell in that direction has a tileId
 * present in matchTileIds. Out-of-bounds neighbours are treated as non-matching.
 *
 * Iteration is deterministic: fixed N/E/S/W evaluation order.
 *
 * @param layer - The tile layer to read neighbour data from.
 * @param x - Column of the cell to compute the mask for.
 * @param y - Row of the cell to compute the mask for.
 * @param matchTileIds - Set of tileIds that count as "same type".
 * @returns Integer in [0, 15].
 */
export function computeMask(layer, x, y, matchTileIds) {
    const { width, height, data } = layer;
    let mask = 0;
    // North (y - 1): bit 1
    if (y > 0) {
        const t = data[(y - 1) * width + x];
        if (matchTileIds.includes(t))
            mask |= 1;
    }
    // East (x + 1): bit 2
    if (x < width - 1) {
        const t = data[y * width + (x + 1)];
        if (matchTileIds.includes(t))
            mask |= 2;
    }
    // South (y + 1): bit 4
    if (y < height - 1) {
        const t = data[(y + 1) * width + x];
        if (matchTileIds.includes(t))
            mask |= 4;
    }
    // West (x - 1): bit 8
    if (x > 0) {
        const t = data[y * width + (x - 1)];
        if (matchTileIds.includes(t))
            mask |= 8;
    }
    return mask;
}
/**
 * Resolve a tileId from a ruleset given a cardinal mask.
 * Returns the variant for the mask, or fallbackTileId if no variant exists.
 */
export function resolveTile(mask, ruleSet) {
    return ruleSet.variants[mask] ?? ruleSet.fallbackTileId;
}
/**
 * Collect the 1-ring neighborhood of a set of cells, including the cells themselves.
 * Results are clipped to [0, mapWidth) x [0, mapHeight), deduplicated, and sorted
 * ascending by y then x for deterministic iteration.
 *
 * @param cells - The user-painted cells (intent set).
 * @param mapWidth - Width of the tile layer in cells.
 * @param mapHeight - Height of the tile layer in cells.
 * @returns Sorted, deduplicated array of cell coordinates.
 */
export function collectNeighborhood(cells, mapWidth, mapHeight) {
    const seen = new Set();
    const result = [];
    // Cardinal offsets: self, N, E, S, W
    const offsets = [[0, 0], [0, -1], [1, 0], [0, 1], [-1, 0]];
    for (const { x, y } of cells) {
        for (const [dx, dy] of offsets) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= mapWidth || ny >= mapHeight)
                continue;
            const key = ny * mapWidth + nx;
            if (seen.has(key))
                continue;
            seen.add(key);
            result.push({ x: nx, y: ny });
        }
    }
    // Sort ascending: y first, then x
    result.sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x);
    return result;
}
//# sourceMappingURL=tile-rule-engine.js.map