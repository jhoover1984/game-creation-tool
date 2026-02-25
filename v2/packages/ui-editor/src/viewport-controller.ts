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

export const VIEWPORT_MIN_ZOOM = 0.25;
export const VIEWPORT_MAX_ZOOM = 4.0;
const WHEEL_FACTOR = 1.1;

export class ViewportController {
  private _zoom: number = 1.0;
  private _panX: number = 0;
  private _panY: number = 0;
  private _isPanning: boolean = false;
  private _lastClientX: number = 0;
  private _lastClientY: number = 0;

  get zoom(): number { return this._zoom; }
  get panX(): number { return this._panX; }
  get panY(): number { return this._panY; }
  get isPanning(): boolean { return this._isPanning; }

  /**
   * Apply the current viewport transform to a canvas element.
   * The canvas element must have `transform-origin: 0 0` for correct anchor behavior.
   */
  applyTransform(canvas: HTMLElement): void {
    canvas.style.transformOrigin = '0 0';
    canvas.style.transform = `translate(${this._panX}px, ${this._panY}px) scale(${this._zoom})`;
  }

  /**
   * Handle a mouse-wheel event.
   * mouseX/mouseY are the cursor position relative to the canvas stage container
   * (not the canvas itself, not the page).
   * The world point under the cursor remains fixed after zoom.
   */
  handleWheel(deltaY: number, mouseX: number, mouseY: number): void {
    const factor = deltaY > 0 ? 1 / WHEEL_FACTOR : WHEEL_FACTOR;
    const newZoom = Math.max(VIEWPORT_MIN_ZOOM, Math.min(VIEWPORT_MAX_ZOOM, this._zoom * factor));
    if (newZoom === this._zoom) return;
    // Keep the world point under the cursor fixed.
    this._panX = mouseX - (mouseX - this._panX) * (newZoom / this._zoom);
    this._panY = mouseY - (mouseY - this._panY) * (newZoom / this._zoom);
    this._zoom = newZoom;
  }

  /** Begin a pan operation from the given screen position. */
  startPan(clientX: number, clientY: number): void {
    this._isPanning = true;
    this._lastClientX = clientX;
    this._lastClientY = clientY;
  }

  /** Continue a pan operation; must be called between startPan and endPan. */
  continuePan(clientX: number, clientY: number): void {
    if (!this._isPanning) return;
    this._panX += clientX - this._lastClientX;
    this._panY += clientY - this._lastClientY;
    this._lastClientX = clientX;
    this._lastClientY = clientY;
  }

  /** End the current pan operation. */
  endPan(): void {
    this._isPanning = false;
  }

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
  fitToMap(
    containerWidth: number,
    containerHeight: number,
    mapWidth: number,
    mapHeight: number,
    margin = 0,
  ): void {
    if (mapWidth <= 0 || mapHeight <= 0 || containerWidth <= 0 || containerHeight <= 0) return;
    const effectiveWidth = containerWidth - margin * 2;
    const effectiveHeight = containerHeight - margin * 2;
    const fitZoom = Math.min(
      effectiveWidth / mapWidth,
      effectiveHeight / mapHeight,
      VIEWPORT_MAX_ZOOM,
    );
    this._zoom = Math.max(VIEWPORT_MIN_ZOOM, fitZoom);
    this._panX = (containerWidth - mapWidth * this._zoom) / 2;
    this._panY = (containerHeight - mapHeight * this._zoom) / 2;
  }

  /**
   * Reset zoom to 100% and pan to origin.
   */
  resetZoom(): void {
    this._zoom = 1.0;
    this._panX = 0;
    this._panY = 0;
  }
}
