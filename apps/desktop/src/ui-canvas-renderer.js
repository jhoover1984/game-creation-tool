const DEFAULT_TILE_SIZE = 16;

/** @typedef {import("./types.js").EditorSnapshot} EditorSnapshot */
/** @typedef {import("./types.js").EditorEntity} EditorEntity */
/** @typedef {import("./types.js").MapTile} MapTile */

/**
 * @typedef {{
 *   selection?: number[],
 *   dx?: number,
 *   dy?: number,
 *   moved?: boolean
 * } | null} DragState
 */

/**
 * @typedef {{
 *   getDragState: () => DragState
 * }} CanvasMapInteractionController
 */

/**
 * @typedef {{
 *   tileLayer: HTMLElement | null,
 *   entityLayer: HTMLElement | null
 * }} CanvasRendererElements
 */

/**
 * @param {number[] | undefined} selection
 * @returns {string}
 */
function selectionSignature(selection) {
  if (!Array.isArray(selection) || selection.length === 0) {
    return "";
  }
  return selection.join(",");
}

/**
 * @param {MapTile[] | undefined} tiles
 * @returns {string}
 */
function tilesSignature(tiles) {
  if (!Array.isArray(tiles) || tiles.length === 0) {
    return "";
  }
  let sig = "";
  for (let i = 0; i < tiles.length; i += 1) {
    const tile = tiles[i];
    sig += `${tile.x}:${tile.y}:${tile.tile_id || 0}|`;
  }
  return sig;
}

/**
 * @param {EditorEntity[] | undefined} entities
 * @returns {string}
 */
function entitiesSignature(entities) {
  if (!Array.isArray(entities) || entities.length === 0) {
    return "";
  }
  let sig = "";
  for (let i = 0; i < entities.length; i += 1) {
    const entity = entities[i];
    sig += `${entity.id}:${entity.name}:${entity.position.x}:${entity.position.y}:${entity.sprite_preview ? 1 : 0}|`;
  }
  return sig;
}

/**
 * @param {EditorSnapshot["diagnostics"] | undefined} diagnostics
 * @returns {string}
 */
function diagnosticsSignature(diagnostics) {
  if (!diagnostics) {
    return "0:0";
  }
  return `${diagnostics.ids ? 1 : 0}:${diagnostics.collision ? 1 : 0}`;
}

/**
 * @param {DragState} dragState
 * @returns {string}
 */
function dragSignature(dragState) {
  if (!dragState) {
    return "";
  }
  const selection = Array.isArray(dragState.selection) ? dragState.selection.join(",") : "";
  const dx = Number.isFinite(dragState.dx) ? dragState.dx : 0;
  const dy = Number.isFinite(dragState.dy) ? dragState.dy : 0;
  const moved = dragState.moved ? 1 : 0;
  return `${selection}|${dx}|${dy}|${moved}`;
}

/**
 * @param {{
 *   elements: CanvasRendererElements,
 *   mapInteractionController: CanvasMapInteractionController,
 *   tileSize?: number
 * }} deps
 */
export function createCanvasRendererController({
  elements,
  mapInteractionController,
  tileSize = DEFAULT_TILE_SIZE,
}) {
  let lastTileSig = "";
  let lastEntitySig = "";
  let lastSelectionSig = "";
  let lastDiagnosticsSig = "";
  let lastDragSig = "";
  /** @type {Map<number, HTMLButtonElement>} */
  const entityNodesById = new Map();
  /** @type {HTMLElement | null} */
  let strokePreviewLayer = null;

  function resetSignatures() {
    lastTileSig = "";
    lastEntitySig = "";
    lastSelectionSig = "";
    lastDiagnosticsSig = "";
    lastDragSig = "";
    entityNodesById.clear();
  }

  /**
   * @param {EditorSnapshot} snapshot
   */
  function renderTiles(snapshot) {
    const tiles = snapshot.tiles || [];
    const previews = snapshot.tilePreviews || {};
    const nextSig = tilesSignature(tiles);
    if (nextSig === lastTileSig) {
      return;
    }
    lastTileSig = nextSig;

    if (!elements.tileLayer) {
      return;
    }
    if (tiles.length === 0) {
      elements.tileLayer.replaceChildren();
      return;
    }

    const rows = document.createDocumentFragment();
    tiles.forEach((tile) => {
      const cell = document.createElement("div");
      cell.className = "tile-cell";
      cell.setAttribute("data-tile-cell", `${tile.x}:${tile.y}`);
      cell.style.left = `${tile.x * tileSize}px`;
      cell.style.top = `${tile.y * tileSize}px`;
      const tileId = tile.tile_id || 0;
      const svg = previews[tileId];
      if (svg) {
        cell.style.backgroundImage = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
        cell.style.backgroundSize = `${tileSize}px ${tileSize}px`;
      }
      rows.append(cell);
    });
    elements.tileLayer.replaceChildren(rows);
  }

  /**
   * @param {number} id
   * @returns {HTMLButtonElement}
   */
  function createEntityNode(id) {
    const node = document.createElement("button");
    node.className = "entity-node";
    node.setAttribute("data-entity-id", String(id));
    const sprite = document.createElement("img");
    sprite.className = "entity-sprite";
    sprite.alt = "";
    sprite.width = tileSize;
    sprite.height = tileSize;
    sprite.draggable = false;
    node.append(sprite);
    const label = document.createElement("span");
    label.className = "entity-label";
    node.append(label);
    return node;
  }

  /**
   * @param {HTMLButtonElement} node
   * @param {EditorEntity} entity
   * @param {{
   *   selected: boolean,
   *   dragging: boolean,
   *   x: number,
   *   y: number,
   *   showIds: boolean,
   *   showCollision: boolean
   * }} view
   */
  function updateEntityNode(node, entity, view) {
    node.setAttribute("data-entity-id", String(entity.id));
    node.classList.toggle("selected", view.selected);
    node.classList.toggle("dragging", view.dragging);
    node.style.left = `${view.x}px`;
    node.style.top = `${view.y}px`;
    const label =
      node.querySelector(".entity-label") ||
      (() => {
        const next = document.createElement("span");
        next.className = "entity-label";
        node.prepend(next);
        return next;
      })();
    label.textContent = entity.name;

    const sprite = /** @type {HTMLImageElement | null} */ (
      node.querySelector(".entity-sprite")
    );
    if (sprite && entity.sprite_preview) {
      const src = `data:image/svg+xml,${encodeURIComponent(entity.sprite_preview)}`;
      if (sprite.getAttribute("src") !== src) {
        sprite.src = src;
      }
    }

    const idChip = node.querySelector(".entity-id-chip");
    if (view.showIds) {
      if (idChip) {
        idChip.textContent = `#${entity.id}`;
      } else {
        const nextChip = document.createElement("span");
        nextChip.className = "entity-id-chip";
        nextChip.textContent = `#${entity.id}`;
        node.append(nextChip);
      }
    } else if (idChip) {
      idChip.remove();
    }

    const collisionBox = node.querySelector(".collision-box");
    if (view.showCollision) {
      if (!collisionBox) {
        const nextBox = document.createElement("span");
        nextBox.className = "collision-box";
        node.append(nextBox);
      }
    } else if (collisionBox) {
      collisionBox.remove();
    }
  }

  /**
   * @param {EditorSnapshot} snapshot
   */
  function renderEntities(snapshot) {
    const entities = snapshot.entities || [];
    const nextEntitySig = entitiesSignature(entities);
    const nextSelectionSig = selectionSignature(snapshot.selection);
    const nextDiagnosticsSig = diagnosticsSignature(snapshot.diagnostics);
    const dragState = mapInteractionController.getDragState();
    const nextDragSig = dragSignature(dragState);

    const isUnchanged =
      nextEntitySig === lastEntitySig &&
      nextSelectionSig === lastSelectionSig &&
      nextDiagnosticsSig === lastDiagnosticsSig &&
      nextDragSig === lastDragSig;

    if (isUnchanged) {
      return;
    }

    lastEntitySig = nextEntitySig;
    lastSelectionSig = nextSelectionSig;
    lastDiagnosticsSig = nextDiagnosticsSig;
    lastDragSig = nextDragSig;

    if (!elements.entityLayer) {
      return;
    }
    if (entities.length === 0) {
      elements.entityLayer.replaceChildren();
      entityNodesById.clear();
      return;
    }

    const draggingIds = new Set(dragState?.selection || []);
    const dragDx = dragState?.dx || 0;
    const dragDy = dragState?.dy || 0;
    const selectedIds = new Set(snapshot.selection || []);
    const showIds = !!snapshot.diagnostics?.ids;
    const showCollision = !!snapshot.diagnostics?.collision;
    const liveIds = new Set();
    const ordered = document.createDocumentFragment();

    entities.forEach((entity) => {
      liveIds.add(entity.id);
      const selected = selectedIds.has(entity.id);
      const dragging = selected && draggingIds.has(entity.id);
      const x = entity.position.x + (dragging ? dragDx : 0);
      const y = entity.position.y + (dragging ? dragDy : 0);
      const node = entityNodesById.get(entity.id) || createEntityNode(entity.id);
      updateEntityNode(node, entity, {
        selected,
        dragging,
        x,
        y,
        showIds,
        showCollision,
      });
      entityNodesById.set(entity.id, node);
      ordered.append(node);
    });

    Array.from(entityNodesById.keys()).forEach((id) => {
      if (!liveIds.has(id)) {
        const staleNode = entityNodesById.get(id);
        staleNode?.remove();
        entityNodesById.delete(id);
      }
    });

    elements.entityLayer.replaceChildren(ordered);
  }

  /**
   * Apply camera offset to tile and entity layers during playtest.
   * @param {EditorSnapshot} snapshot
   */
  function applyCamera(snapshot) {
    if (!snapshot.playtest?.active) {
      if (elements.tileLayer) elements.tileLayer.style.transform = "";
      if (elements.entityLayer) elements.entityLayer.style.transform = "";
      return;
    }
    const cx = snapshot.cameraX || 0;
    const cy = snapshot.cameraY || 0;
    // Viewport defaults match Game Boy (160x144). The parent container sizes
    // the visible area; we translate the world layers so the camera center
    // appears in the middle of the viewport.
    const halfW = 80;
    const halfH = 72;
    const tx = -(cx - halfW);
    const ty = -(cy - halfH);
    const transform = `translate(${tx}px, ${ty}px)`;
    if (elements.tileLayer) elements.tileLayer.style.transform = transform;
    if (elements.entityLayer) elements.entityLayer.style.transform = transform;
  }

  /** @type {HTMLElement | null} */
  let transitionOverlay = null;

  /**
   * Show or hide a full-viewport black overlay for scene transitions.
   * @param {EditorSnapshot} snapshot
   */
  function applyTransition(snapshot) {
    const active = snapshot.transitionActive && snapshot.playtest?.active;
    const opacity = snapshot.transitionOpacity || 0;

    if (!active && opacity <= 0) {
      if (transitionOverlay) {
        transitionOverlay.style.display = "none";
      }
      return;
    }

    if (!transitionOverlay) {
      const parent = elements.entityLayer?.parentElement ?? elements.tileLayer?.parentElement;
      if (!parent) return;
      transitionOverlay = document.createElement("div");
      transitionOverlay.className = "transition-overlay";
      transitionOverlay.style.position = "absolute";
      transitionOverlay.style.inset = "0";
      transitionOverlay.style.background = "black";
      transitionOverlay.style.pointerEvents = "none";
      transitionOverlay.style.zIndex = "100";
      parent.append(transitionOverlay);
    }

    transitionOverlay.style.display = "";
    transitionOverlay.style.opacity = String(opacity);
  }

  /**
   * Render a live preview of the in-progress paint/erase stroke so the user
   * sees immediate feedback while dragging before the stroke is committed.
   */
  function renderStrokePreview() {
    const stroke = mapInteractionController.getStrokeState?.();

    if (!stroke || stroke.cells.length === 0) {
      if (strokePreviewLayer) {
        strokePreviewLayer.style.display = "none";
      }
      return;
    }

    if (!strokePreviewLayer) {
      const parent = elements.tileLayer?.parentElement;
      if (!parent) {
        return;
      }
      strokePreviewLayer = document.createElement("div");
      strokePreviewLayer.className = "stroke-preview-layer";
      // Insert before entity layer so entities remain on top.
      const entityLayer = elements.entityLayer;
      if (entityLayer) {
        parent.insertBefore(strokePreviewLayer, entityLayer);
      } else {
        parent.append(strokePreviewLayer);
      }
    }

    strokePreviewLayer.style.display = "";
    const isErase = stroke.mode === "erase";
    const fragment = document.createDocumentFragment();
    for (const cell of stroke.cells) {
      const div = document.createElement("div");
      div.className = isErase ? "stroke-preview-cell stroke-preview-erase" : "stroke-preview-cell";
      div.style.left = `${cell.x * tileSize}px`;
      div.style.top = `${cell.y * tileSize}px`;
      fragment.append(div);
    }
    strokePreviewLayer.replaceChildren(fragment);
  }

  /**
   * @param {EditorSnapshot} snapshot
   */
  function render(snapshot) {
    renderEntities(snapshot);
    renderTiles(snapshot);
    renderStrokePreview();
    applyCamera(snapshot);
    applyTransition(snapshot);
  }

  return {
    render,
    invalidate: resetSignatures,
    /**
     * Test bridge: force the transition overlay to a specific opacity.
     * Passing 0 hides it; any positive value shows it.
     * @param {number} opacity
     */
    forceTransition(opacity) {
      applyTransition({
        transitionActive: opacity > 0,
        transitionOpacity: opacity,
        playtest: { active: true },
      });
    },
    /** @returns {boolean} True if the transition overlay is currently visible. */
    isTransitionVisible() {
      return transitionOverlay !== null && transitionOverlay.style.display !== "none";
    },
  };
}
