const DEFAULT_DRAG_GRID_SIZE = 4;
const DEFAULT_TILE_SIZE = 16;

export function createMapInteractionController({
  elements,
  state,
  render,
  log,
  getMapZoomScale,
  dragGridSize = DEFAULT_DRAG_GRID_SIZE,
  tileSize = DEFAULT_TILE_SIZE,
}) {
  let dragState = null;
  let marqueeState = null;
  let strokeState = null;
  let activeTool = "select";
  let activeTileId = 1;
  let eventsBound = false;
  const listeners = [];

  const requestRender = () => {
    if (typeof render === "function") {
      render();
    }
  };

  function addListener(target, event, handler) {
    if (!target) {
      return;
    }
    target.addEventListener(event, handler);
    listeners.push(() => target.removeEventListener(event, handler));
  }

  function setTool(tool) {
    if (state.snapshot().playtest.active) {
      return;
    }
    activeTool = tool;
    strokeState = null;
    log(`Tool: ${tool}`);
    requestRender();
  }

  /**
   * @param {PointerEvent} event
   * @param {boolean} [clampToBounds] When true, clamp coordinates to canvas
   *   bounds instead of returning null. Use during an active stroke where the
   *   pointer is captured but may travel outside the canvas rect.
   */
  function eventToCanvasPoint(event, clampToBounds = false) {
    if (!elements.canvasSurface) {
      return null;
    }
    const bounds = elements.canvasSurface.getBoundingClientRect();
    const localX = event.clientX - bounds.left;
    const localY = event.clientY - bounds.top;
    if (!clampToBounds && (localX < 0 || localY < 0 || localX > bounds.width || localY > bounds.height)) {
      return null;
    }
    const cx = Math.max(0, Math.min(bounds.width - 1, localX));
    const cy = Math.max(0, Math.min(bounds.height - 1, localY));
    const px = cx + elements.canvasSurface.scrollLeft;
    const py = cy + elements.canvasSurface.scrollTop;
    const zoomScale = Math.max(1, Number(getMapZoomScale?.() || 1));
    return {
      x: px / zoomScale,
      y: py / zoomScale,
    };
  }

  /**
   * @param {PointerEvent} event
   * @param {boolean} [clampToBounds]
   */
  function eventToCell(event, clampToBounds = false) {
    const point = eventToCanvasPoint(event, clampToBounds);
    if (!point) {
      return null;
    }
    return {
      x: Math.floor(point.x / tileSize),
      y: Math.floor(point.y / tileSize),
    };
  }

  function normalizeRect(x1, y1, x2, y2) {
    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);
    const width = Math.abs(x1 - x2);
    const height = Math.abs(y1 - y2);
    return { x, y, width, height };
  }

  function isWithinRect(x, y, rect) {
    return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
  }

  function collectTileStrokeCell(cell, stroke) {
    const key = `${cell.x}:${cell.y}`;
    if (stroke.points.has(key)) {
      return;
    }
    stroke.points.set(key, cell);
  }

  function cellsBetween(from, to) {
    const cells = [];
    let x0 = from.x;
    let y0 = from.y;
    const x1 = to.x;
    const y1 = to.y;
    const dx = Math.abs(x1 - x0);
    const sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0);
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;

    while (true) {
      cells.push({ x: x0, y: y0 });
      if (x0 === x1 && y0 === y1) {
        break;
      }
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
    return cells;
  }

  function renderMarquee() {
    if (!elements.marqueeBox || !marqueeState || !marqueeState.moved) {
      if (elements.marqueeBox) {
        elements.marqueeBox.style.display = "none";
      }
      return;
    }
    const rect = normalizeRect(
      marqueeState.startX,
      marqueeState.startY,
      marqueeState.endX,
      marqueeState.endY
    );
    elements.marqueeBox.style.display = "block";
    elements.marqueeBox.style.left = `${rect.x}px`;
    elements.marqueeBox.style.top = `${rect.y}px`;
    elements.marqueeBox.style.width = `${rect.width}px`;
    elements.marqueeBox.style.height = `${rect.height}px`;
  }

  function bindEvents() {
    if (eventsBound) {
      return;
    }
    eventsBound = true;

    // Prevent the browser context menu when painting or erasing so right-click
    // doesn't open the menu AND accidentally start a stroke.
    addListener(elements.canvasSurface, "contextmenu", (event) => {
      if (activeTool === "paint" || activeTool === "erase" || activeTool === "fill") {
        event.preventDefault();
      }
    });

    addListener(elements.entityLayer, "pointerdown", async (event) => {
      if (state.snapshot().playtest.active) {
        return;
      }
      if (activeTool !== "select") {
        return;
      }

      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const idRaw = target.getAttribute("data-entity-id");
      if (!idRaw) {
        return;
      }
      const id = Number.parseInt(idRaw, 10);
      if (Number.isNaN(id)) {
        return;
      }

      event.preventDefault();
      const additive = event.ctrlKey || event.metaKey;
      const snapshot = state.snapshot();
      const alreadySelected = snapshot.selection.includes(id);
      const nextSelection = additive ? Array.from(new Set([...snapshot.selection, id])) : [id];

      dragState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        dx: 0,
        dy: 0,
        moved: false,
        selection: [...nextSelection],
      };
      if (!alreadySelected || additive) {
        await state.selectEntities(nextSelection);
      }
      target.setPointerCapture?.(event.pointerId);
      requestRender();
    });

    addListener(elements.entityLayer, "mousedown", async (event) => {
      if (state.snapshot().playtest.active) {
        return;
      }
      if (dragState && dragState.pointerId !== null) {
        return;
      }
      if (activeTool !== "select") {
        return;
      }
      if (event.button !== 0) {
        return;
      }

      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const idRaw = target.getAttribute("data-entity-id");
      if (!idRaw) {
        return;
      }
      const id = Number.parseInt(idRaw, 10);
      if (Number.isNaN(id)) {
        return;
      }

      event.preventDefault();
      const additive = event.ctrlKey || event.metaKey;
      const snapshot = state.snapshot();
      const alreadySelected = snapshot.selection.includes(id);
      const nextSelection = additive ? Array.from(new Set([...snapshot.selection, id])) : [id];

      dragState = {
        pointerId: null,
        startX: event.clientX,
        startY: event.clientY,
        dx: 0,
        dy: 0,
        moved: false,
        selection: [...nextSelection],
      };
      if (!alreadySelected || additive) {
        await state.selectEntities(nextSelection);
      }
      requestRender();
    });

    addListener(elements.canvasSurface, "pointerdown", (event) => {
      if (state.snapshot().playtest.active) {
        return;
      }
      const pointerTarget = event.target;
      if (pointerTarget instanceof HTMLElement && pointerTarget.closest("#help-overlay")) {
        return;
      }
      if (activeTool === "paint" || activeTool === "erase") {
        if (event.button !== 0) {
          return;
        }
        const cell = eventToCell(event);
        if (!cell) {
          return;
        }
        event.preventDefault();
        strokeState = {
          pointerId: event.pointerId,
          mode: activeTool,
          points: new Map(),
          lastCell: cell,
        };
        collectTileStrokeCell(cell, strokeState);
        elements.canvasSurface?.setPointerCapture?.(event.pointerId);
        return;
      }

      if (activeTool !== "select") {
        return;
      }
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      if (target.closest("[data-entity-id]")) {
        return;
      }
      const point = eventToCanvasPoint(event);
      if (!point) {
        return;
      }
      marqueeState = {
        pointerId: event.pointerId,
        startX: point.x,
        startY: point.y,
        endX: point.x,
        endY: point.y,
        moved: false,
      };
      requestRender();
    });

    addListener(elements.canvasSurface, "click", async (event) => {
      if (state.snapshot().playtest.active) {
        return;
      }
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      if (target.closest("#help-overlay")) {
        return;
      }
      if (activeTool === "fill") {
        const cell = eventToCell(event);
        if (!cell) {
          return;
        }
        const surface = elements.canvasSurface;
        // Use logical map dimensions (CSS vars set by the viewport controller)
        // rather than scrollWidth/scrollHeight, which is the container viewport
        // size and would make BFS bounds far larger than the actual map area —
        // causing the 2048 cap to be hit from a corner and filling a triangle.
        const contentW = surface
          ? parseFloat(surface.style.getPropertyValue("--map-content-width")) || 0
          : 0;
        const contentH = surface
          ? parseFloat(surface.style.getPropertyValue("--map-content-height")) || 0
          : 0;
        const canvasCols = contentW > 0 ? Math.ceil(contentW / tileSize) : 32;
        const canvasRows = contentH > 0 ? Math.ceil(contentH / tileSize) : 32;
        await state.fillTiles(cell.x, cell.y, activeTileId, canvasCols, canvasRows);
        requestRender();
        return;
      }
      if (target.closest("[data-entity-id]") || target.closest("[data-tile-cell]")) {
        return;
      }
      await state.selectEntities([]);
      requestRender();
    });

    addListener(window, "pointermove", (event) => {
      if (state.snapshot().playtest.active) {
        return;
      }
      if (strokeState && strokeState.pointerId === event.pointerId) {
        // Clamp to canvas bounds: pointer is captured so events fire outside
        // the canvas rect during fast drags — clamping prevents missed cells.
        const cell = eventToCell(event, /* clampToBounds */ true);
        if (!cell) {
          return;
        }
        const line = cellsBetween(strokeState.lastCell, cell);
        line.forEach((step) => collectTileStrokeCell(step, strokeState));
        strokeState.lastCell = cell;
        requestRender();
        return;
      }

      if (!dragState || dragState.pointerId !== event.pointerId) {
        if (marqueeState && marqueeState.pointerId === event.pointerId) {
          const point = eventToCanvasPoint(event);
          if (!point) {
            return;
          }
          marqueeState.endX = point.x;
          marqueeState.endY = point.y;
          if (
            Math.abs(marqueeState.endX - marqueeState.startX) > 2 ||
            Math.abs(marqueeState.endY - marqueeState.startY) > 2
          ) {
            marqueeState.moved = true;
          }
          requestRender();
        }
        return;
      }

      const scale = Math.max(1, Number(getMapZoomScale?.() || 1));
      dragState.dx = (event.clientX - dragState.startX) / scale;
      dragState.dy = (event.clientY - dragState.startY) / scale;
      if (Math.abs(dragState.dx) > 1 || Math.abs(dragState.dy) > 1) {
        dragState.moved = true;
      }
      requestRender();
    });

    addListener(window, "mousemove", (event) => {
      if (state.snapshot().playtest.active) {
        return;
      }
      if (!dragState) {
        return;
      }
      const scale = Math.max(1, Number(getMapZoomScale?.() || 1));
      dragState.dx = (event.clientX - dragState.startX) / scale;
      dragState.dy = (event.clientY - dragState.startY) / scale;
      if (Math.abs(dragState.dx) > 1 || Math.abs(dragState.dy) > 1) {
        dragState.moved = true;
      }
      requestRender();
    });

    addListener(window, "pointerup", async (event) => {
      if (state.snapshot().playtest.active) {
        return;
      }
      if (strokeState && strokeState.pointerId === event.pointerId) {
        const finishedStroke = strokeState;
        strokeState = null;
        await state.applyTileStroke(
          finishedStroke.mode,
          Array.from(finishedStroke.points.values()),
          activeTileId
        );
        requestRender();
      }

      if (dragState && dragState.pointerId === event.pointerId) {
        const dx = Math.round(dragState.dx / dragGridSize) * dragGridSize;
        const dy = Math.round(dragState.dy / dragGridSize) * dragGridSize;
        const shouldCommit = dragState.moved && (dx !== 0 || dy !== 0);
        dragState = null;
        if (shouldCommit) {
          await state.moveSelectedBy(dx, dy);
        }
      }

      if (marqueeState && marqueeState.pointerId === event.pointerId) {
        const finished = marqueeState;
        marqueeState = null;
        if (finished.moved) {
          const rect = normalizeRect(
            finished.startX,
            finished.startY,
            finished.endX,
            finished.endY
          );
          const snapshot = state.snapshot();
          const hits = snapshot.entities
            .filter((entity) => isWithinRect(entity.position.x, entity.position.y, rect))
            .map((entity) => entity.id);
          await state.selectEntities(hits);
        }
      }
      requestRender();
    });

    // Commit any in-progress stroke if pointer capture is lost (tab switch,
    // browser interrupt, or Tauri dropping the capture).
    addListener(elements.canvasSurface, "lostpointercapture", async (event) => {
      if (!strokeState || strokeState.pointerId !== event.pointerId) {
        return;
      }
      const finishedStroke = strokeState;
      strokeState = null;
      if (finishedStroke.points.size > 0) {
        await state.applyTileStroke(
          finishedStroke.mode,
          Array.from(finishedStroke.points.values()),
          activeTileId
        );
        requestRender();
      }
    });

    addListener(window, "mouseup", async () => {
      if (state.snapshot().playtest.active) {
        return;
      }
      if (!dragState) {
        return;
      }
      const dx = Math.round(dragState.dx / dragGridSize) * dragGridSize;
      const dy = Math.round(dragState.dy / dragGridSize) * dragGridSize;
      const shouldCommit = dragState.moved && (dx !== 0 || dy !== 0);
      dragState = null;
      if (shouldCommit) {
        await state.moveSelectedBy(dx, dy);
      }
      requestRender();
    });
  }

  function dispose() {
    while (listeners.length > 0) {
      const remove = listeners.pop();
      remove?.();
    }
    eventsBound = false;
    dragState = null;
    marqueeState = null;
    strokeState = null;
  }

  return {
    bindEvents,
    dispose,
    getActiveTool: () => activeTool,
    getActiveTileId: () => activeTileId,
    setActiveTileId: (id) => { activeTileId = id; },
    getDragState: () => dragState,
    getStrokeState: () => strokeState
      ? { mode: strokeState.mode, cells: Array.from(strokeState.points.values()) }
      : null,
    renderMarquee,
    setTool,
  };
}
