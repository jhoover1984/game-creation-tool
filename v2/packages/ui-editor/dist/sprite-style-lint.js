/**
 * sprite-style-lint.ts -- SPRITE-STYLE-001
 *
 * Pure, stateless sprite palette lint service.
 * Reports off-palette pixels and provides nearest-color remapping data.
 * Has no side effects; does not mutate any buffer or store.
 */
/** Canonical sprite palette -- RGBA tuples matching PRESET_COLORS in sprite-panel.ts */
export const SPRITE_PALETTE = [
    [0, 0, 0, 255], // #000000
    [255, 255, 255, 255], // #ffffff
    [255, 0, 0, 255], // #ff0000
    [0, 204, 0, 255], // #00cc00
    [0, 0, 255, 255], // #0000ff
    [255, 204, 0, 255], // #ffcc00
];
/**
 * Return the squared Euclidean RGB distance between two RGBA colours.
 * Alpha is excluded: transparent pixels are never flagged by the caller.
 */
function rgbDistanceSq(a, b) {
    const dr = a[0] - b[0];
    const dg = a[1] - b[1];
    const db = a[2] - b[2];
    return dr * dr + dg * dg + db * db;
}
/**
 * Find the nearest colour in the palette to the given RGBA value.
 * The palette must be non-empty.
 */
export function nearestPaletteColor(rgba, palette) {
    let best = palette[0];
    let bestDist = rgbDistanceSq(rgba, best);
    for (let i = 1; i < palette.length; i++) {
        const d = rgbDistanceSq(rgba, palette[i]);
        if (d < bestDist) {
            bestDist = d;
            best = palette[i];
        }
    }
    return best;
}
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
export function lintSprite(buffer, palette) {
    const results = [];
    const { pixels, width, height } = buffer;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = pixels[idx];
            const g = pixels[idx + 1];
            const b = pixels[idx + 2];
            const a = pixels[idx + 3];
            // Transparent pixels are exempt
            if (a === 0)
                continue;
            const found = [r, g, b, a];
            // Check exact match against palette
            let matched = false;
            for (const entry of palette) {
                if (entry[0] === r && entry[1] === g && entry[2] === b && entry[3] === a) {
                    matched = true;
                    break;
                }
            }
            if (matched)
                continue;
            results.push({
                x,
                y,
                foundRgba: found,
                nearestRgba: nearestPaletteColor(found, palette),
            });
        }
    }
    return results;
}
//# sourceMappingURL=sprite-style-lint.js.map