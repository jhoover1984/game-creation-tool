/**
 * ViewportController -- UI-VIEWPORT-001
 *
 * Manages zoom/pan state for the editor canvas.
 * Applies a CSS transform (translate + scale) to the canvas element so
 * the underlying render logic and hit-test formula are unaffected.
 *
 * Transform model:
 *   canvas.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`
 *   canvas.style.transformOrigin = '0 0'
 *
 * Hit tests remain correct because getBoundingClientRect() returns the
 * transformed visual rect, and the standard formula
 *   px = (clientX - rect.left) * (canvas.width / rect.width)
 * already accounts for the scale factor.
 *
 * Invariants:
 *   - zoom is clamped to [MIN_ZOOM, MAX_ZOOM] at all times.
 *   - Wheel zoom is centered on the mouse cursor.
 *   - fitToMap scales to fill viewport and is clamped to VIEWPORT_MAX_ZOOM.
 *   - All state transitions are deterministic for the same inputs.
 */
export declare const VIEWPORT_MIN_ZOOM = 0.25;
export declare const VIEWPORT_MAX_ZOOM = 4;
export declare class ViewportController {
    private _zoom;
    private _panX;
    private _panY;
    private _isPanning;
    private _lastClientX;
    private _lastClientY;
    get zoom(): number;
    get panX(): number;
    get panY(): number;
    get isPanning(): boolean;
    /**
     * Apply the current viewport transform to a canvas element.
     * The canvas element must have `transform-origin: 0 0` for correct anchor behavior.
     */
    applyTransform(canvas: HTMLElement): void;
    /**
     * Handle a mouse-wheel event.
     * mouseX/mouseY are the cursor position relative to the canvas stage container
     * (not the canvas itself, not the page).
     * The world point under the cursor remains fixed after zoom.
     */
    handleWheel(deltaY: number, mouseX: number, mouseY: number): void;
    /** Begin a pan operation from the given screen position. */
    startPan(clientX: number, clientY: number): void;
    /** Continue a pan operation; must be called between startPan and endPan. */
    continuePan(clientX: number, clientY: number): void;
    /** End the current pan operation. */
    endPan(): void;
    /**
     * Fit the entire map into the container dimensions.
     * Scales to fill as much as possible, including upscale on large viewports,
     * bounded by VIEWPORT_MAX_ZOOM.
     * Centers the map in the container.
     *
     * @param containerWidth  Visible width of the canvas stage in CSS pixels.
     * @param containerHeight Visible height of the canvas stage in CSS pixels.
     * @param mapWidth        Intrinsic map width in pixels (tiles * tileSize).
     * @param mapHeight       Intrinsic map height in pixels (tiles * tileSize).
     * @param margin          Safety inset in CSS pixels applied to both sides of each axis
     *                        before computing zoom. Prevents right/bottom edge clip under
     *                        overflow:hidden. Default 0 (no inset). D-002 fix.
     */
    fitToMap(containerWidth: number, containerHeight: number, mapWidth: number, mapHeight: number, margin?: number): void;
    /**
     * Reset zoom to 100% and pan to origin.
     */
    resetZoom(): void;
}
//# sourceMappingURL=viewport-controller.d.ts.map