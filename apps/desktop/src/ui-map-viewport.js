export function createMapViewportController({
  elements,
  state,
  render,
  tileSize = 16,
  mapMinViewportWidth = 160,
  mapMinViewportHeight = 144,
}) {
  let mapZoomMode = "fit";
  let mapZoomScale = 1;
  let eventsBound = false;
  const listeners = [];

  function requestRender() {
    if (typeof render === "function") {
      render();
    }
  }

  function addListener(target, event, handler) {
    if (!target) {
      return;
    }
    target.addEventListener(event, handler);
    listeners.push(() => target.removeEventListener(event, handler));
  }

  function setMapZoomMode(mode) {
    mapZoomMode = mode;
    requestRender();
  }

  function bindEvents() {
    if (eventsBound) {
      return;
    }
    eventsBound = true;

    addListener(elements.overlayGridBtn, "click", () => {
      state.toggleDiagnostic("grid");
      requestRender();
    });
    addListener(elements.overlayCollisionBtn, "click", () => {
      state.toggleDiagnostic("collision");
      requestRender();
    });
    addListener(elements.overlayIdsBtn, "click", () => {
      state.toggleDiagnostic("ids");
      requestRender();
    });

    addListener(elements.mapZoomFitBtn, "click", () => setMapZoomMode("fit"));
    addListener(elements.mapZoom1xBtn, "click", () => setMapZoomMode("1x"));
    addListener(elements.mapZoom2xBtn, "click", () => setMapZoomMode("2x"));
    addListener(elements.mapZoom3xBtn, "click", () => setMapZoomMode("3x"));
  }

  function mapLogicalSize(snapshot) {
    const tiles = snapshot.tiles || [];
    const entities = snapshot.entities || [];
    let width = mapMinViewportWidth;
    let height = mapMinViewportHeight;

    tiles.forEach((tile) => {
      width = Math.max(width, (tile.x + 1) * tileSize);
      height = Math.max(height, (tile.y + 1) * tileSize);
    });
    entities.forEach((entity) => {
      width = Math.max(width, entity.position.x + 96);
      height = Math.max(height, entity.position.y + 48);
    });

    return { width, height };
  }

  function computeFitMapScale(logicalWidth, logicalHeight) {
    if (!elements.canvasSurface) {
      return 1;
    }
    const availableWidth = Math.max(1, elements.canvasSurface.clientWidth - 20);
    const availableHeight = Math.max(1, elements.canvasSurface.clientHeight - 20);
    const fit = Math.floor(
      Math.min(availableWidth / logicalWidth, availableHeight / logicalHeight)
    );
    return Math.max(1, fit);
  }

  function applyMapEditorScale(snapshot) {
    if (!elements.canvasSurface) {
      return;
    }
    const logical = mapLogicalSize(snapshot);
    const scale =
      mapZoomMode === "fit"
        ? computeFitMapScale(logical.width, logical.height)
        : Number.parseInt(mapZoomMode, 10);
    mapZoomScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
    elements.canvasSurface.style.setProperty("--map-content-width", `${logical.width}px`);
    elements.canvasSurface.style.setProperty("--map-content-height", `${logical.height}px`);
    elements.canvasSurface.style.setProperty("--map-zoom-scale", String(mapZoomScale));
    elements.canvasSurface.style.setProperty("--tile-size", `${tileSize}px`);
  }

  function renderViewport(snapshot) {
    const diagnostics = snapshot.diagnostics || {
      grid: true,
      collision: false,
      ids: false,
      trace: false,
    };
    elements.overlayGridBtn?.classList.toggle("active", diagnostics.grid);
    elements.overlayCollisionBtn?.classList.toggle("active", diagnostics.collision);
    elements.overlayIdsBtn?.classList.toggle("active", diagnostics.ids);
    elements.mapZoomFitBtn?.classList.toggle("active", mapZoomMode === "fit");
    elements.mapZoom1xBtn?.classList.toggle("active", mapZoomMode === "1x");
    elements.mapZoom2xBtn?.classList.toggle("active", mapZoomMode === "2x");
    elements.mapZoom3xBtn?.classList.toggle("active", mapZoomMode === "3x");
    elements.canvasSurface?.classList.toggle("grid-hidden", !diagnostics.grid);
    applyMapEditorScale(snapshot);
  }

  function getMapZoomScale() {
    return mapZoomScale;
  }

  function dispose() {
    listeners.forEach((unsubscribe) => unsubscribe());
    listeners.length = 0;
    eventsBound = false;
  }

  return {
    bindEvents,
    renderViewport,
    getMapZoomScale,
    dispose,
  };
}
