/**
 * tile-rule-engine.ts -- TILE-RULE-001
 *
 * Pure, stateless rule-based tile mapping engine.
 * Computes cardinal adjacency masks and resolves tile variants deterministically.
 * Has no side effects; does not mutate any layer or store.
 */
import type { TileLayer } from '@gcs/contracts';
/**
 * A ruleset that maps cardinal adjacency masks to tile variant IDs.
 *
 * Cardinal mask bits: N=1, E=2, S=4, W=8 (range 0..15).
 * A neighbor contributes its bit when its tileId is in matchTileIds.
 */
export interface TileRuleSet {
    id: string;
    name: string;
    /** TileIds considered "same type" for adjacency purposes (all variant IDs should be included). */
    matchTileIds: readonly number[];
    /**
     * Map from cardinal mask (0..15) to output tileId.
     * Missing entries fall back to fallbackTileId.
     */
    variants: Readonly<Partial<Record<number, number>>>;
    /** TileId used for the intent pass and when no variant exists for a mask. */
    fallbackTileId: number;
}
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
export declare const DEMO_RULESET: TileRuleSet;
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
export declare function computeMask(layer: Readonly<TileLayer>, x: number, y: number, matchTileIds: readonly number[]): number;
/**
 * Resolve a tileId from a ruleset given a cardinal mask.
 * Returns the variant for the mask, or fallbackTileId if no variant exists.
 */
export declare function resolveTile(mask: number, ruleSet: TileRuleSet): number;
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
export declare function collectNeighborhood(cells: readonly {
    x: number;
    y: number;
}[], mapWidth: number, mapHeight: number): {
    x: number;
    y: number;
}[];
//# sourceMappingURL=tile-rule-engine.d.ts.map