/** A tile layer in the map. */
export interface TileLayer {
    id: string;
    name: string;
    width: number;
    height: number;
    tileSize: number;
    /** Flat array of tile IDs, row-major. 0 = empty. */
    data: number[];
}
/** Tile definition in the tileset. */
export interface TileDef {
    id: number;
    name?: string;
    solid: boolean;
    spriteX: number;
    spriteY: number;
}
//# sourceMappingURL=tile.d.ts.map