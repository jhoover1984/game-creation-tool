const PLAYTEST_TILE_SIZE_PX = 8;
const PLAYTEST_MAX_DELTA_MS = 100;
const PLAYTEST_LOOP_WARM_START_MS = 34;
const PLAYTEST_VIEWPORT_PADDING_PX = 24;

/** @typedef {import("./types.js").EditorSnapshot} EditorSnapshot */
/** @typedef {import("./types.js").MapTile} MapTile */
/** @typedef {import("./types.js").EditorEntity} EditorEntity */

/**
 * @typedef {{
 *   snapshot: () => EditorSnapshot,
 *   togglePlayPause: () => Promise<unknown>,
 *   stepPlaytestFrame: () => Promise<unknown>,
 *   setPlaytestSpeed: (speed: number) => Promise<unknown>,
 *   exitPlaytest: () => Promise<unknown>,
 *   setTraceEnabled: (enabled: boolean) => Promise<unknown>,
 *   tickPlaytest: (deltaMs: number) => Promise<unknown>
 * }} PlaytestStateAdapter
 */

/**
 * @typedef {{
 *   playtestViewportWrap: HTMLElement | null,
 *   playtestViewport: HTMLCanvasElement | null,
 *   tileLayer: HTMLElement | null,
 *   entityLayer: HTMLElement | null,
 *   marqueeBox: HTMLElement | null,
 *   playtestOverlay: HTMLElement | null,
 *   playtestPauseBtn: HTMLElement | null,
 *   playtestStepBtn: HTMLButtonElement | null,
 *   playtestSpeed1xBtn: HTMLElement | null,
 *   playtestSpeedHalfBtn: HTMLElement | null,
 *   playtestSpeedQuarterBtn: HTMLElement | null,
 *   playtestZoomFitBtn: HTMLElement | null,
 *   playtestZoom2xBtn: HTMLElement | null,
 *   playtestZoom3xBtn: HTMLElement | null,
 *   playtestZoom4xBtn: HTMLElement | null,
 *   playtestTraceBtn: HTMLElement | null,
 *   breakpointTickBtn: HTMLElement | null,
 *   breakpointItemBtn: HTMLElement | null,
 *   breakpointQuestBtn: HTMLElement | null,
 *   playtestExitBtn: HTMLElement | null,
 *   playtestMetricFrame: HTMLElement | null,
 *   playtestMetricDelta: HTMLElement | null,
 *   playtestMetricSteps: HTMLElement | null,
 *   playtestMetricBreak: HTMLElement | null,
 *   playtestMetricFeedback: HTMLElement | null
 * }} PlaytestControllerElements
 */

const DEFAULT_DIAGNOSTICS = {
  grid: true,
  collision: false,
  ids: false,
  trace: false,
};

/**
 * @param {{
 *   elements: PlaytestControllerElements,
 *   state: PlaytestStateAdapter,
 *   render: (() => void) | undefined,
 *   log: (message: string) => void,
 *   onToggleBreakpoint: (kind: string) => void,
 *   onPlaytestEntered?: () => void,
 *   onPlaytestFirstFrame?: () => void,
 *   onPlaytestMetricUpdate?: () => void,
 *   onPlaytestExited?: () => void
 * }} deps
 */
export function createPlaytestController({
  elements,
  state,
  render,
  log,
  onToggleBreakpoint,
  onPlaytestEntered,
  onPlaytestFirstFrame,
  onPlaytestMetricUpdate,
  onPlaytestExited,
}) {
  let playtestRafId = null;
  let playtestLastTs = null;
  let playtestTickInFlight = false;
  let playtestZoomMode = "fit";
  let viewportResizeObserver = null;
  let eventsBound = false;
  let telemetryLastActive = false;
  let telemetryFirstFrameMarked = false;
  let telemetryLastFrame = null;
  let telemetryLastSteps = null;
  const listeners = [];

  const requestRender = () => {
    if (typeof render === "function") {
      render();
    }
  };

  /**
   * @param {EventTarget | null | undefined} target
   * @param {string} event
   * @param {(event: Event) => void} handler
   */
  function addListener(target, event, handler) {
    if (!target) {
      return;
    }
    target.addEventListener(event, handler);
    listeners.push(() => target.removeEventListener(event, handler));
  }

  function computeFitScale(baseWidth, baseHeight) {
    if (!elements.playtestViewportWrap) {
      return 2;
    }
    const availableWidth = Math.max(
      0,
      elements.playtestViewportWrap.clientWidth - PLAYTEST_VIEWPORT_PADDING_PX
    );
    const availableHeight = Math.max(
      0,
      elements.playtestViewportWrap.clientHeight - PLAYTEST_VIEWPORT_PADDING_PX
    );
    const fit = Math.floor(Math.min(availableWidth / baseWidth, availableHeight / baseHeight));
    return Math.max(1, fit);
  }

  function applyPlaytestViewportScale() {
    if (!(elements.playtestViewport instanceof HTMLCanvasElement)) {
      return;
    }
    const baseWidth = elements.playtestViewport.width;
    const baseHeight = elements.playtestViewport.height;
    const scale =
      playtestZoomMode === "fit"
        ? computeFitScale(baseWidth, baseHeight)
        : Number.parseInt(playtestZoomMode, 10);
    const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
    elements.playtestViewport.style.width = `${baseWidth * safeScale}px`;
    elements.playtestViewport.style.height = `${baseHeight * safeScale}px`;
  }

  /**
   * @param {EditorSnapshot} snapshot
   */
  function renderPlaytestViewport(snapshot) {
    if (!(elements.playtestViewport instanceof HTMLCanvasElement)) {
      return;
    }
    const ctx = elements.playtestViewport.getContext("2d");
    if (!ctx) {
      return;
    }

    const width = elements.playtestViewport.width;
    const height = elements.playtestViewport.height;
    const frame = snapshot.playtest?.frame ?? 0;
    const diagnostics = snapshot.diagnostics || DEFAULT_DIAGNOSTICS;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#9bbc0f";
    ctx.fillRect(0, 0, width, height);

    for (const tile of /** @type {MapTile[]} */ (snapshot.tiles || [])) {
      const x = tile.x * PLAYTEST_TILE_SIZE_PX;
      const y = tile.y * PLAYTEST_TILE_SIZE_PX;
      const pulse = frame % 30 < 15;
      ctx.fillStyle = pulse ? "#8bac0f" : "#306230";
      ctx.fillRect(x, y, PLAYTEST_TILE_SIZE_PX, PLAYTEST_TILE_SIZE_PX);
    }

    if (diagnostics.grid) {
      ctx.strokeStyle = "rgba(15, 56, 15, 0.22)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= width; x += PLAYTEST_TILE_SIZE_PX) {
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += PLAYTEST_TILE_SIZE_PX) {
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(width, y + 0.5);
        ctx.stroke();
      }
    }

    for (const entity of /** @type {EditorEntity[]} */ (snapshot.entities || [])) {
      const x = Math.max(0, Math.min(width - PLAYTEST_TILE_SIZE_PX, entity.position.x));
      const y = Math.max(0, Math.min(height - PLAYTEST_TILE_SIZE_PX, entity.position.y));
      ctx.fillStyle = "#0f380f";
      ctx.fillRect(x, y, PLAYTEST_TILE_SIZE_PX, PLAYTEST_TILE_SIZE_PX);

      if (diagnostics.collision) {
        ctx.strokeStyle = "#306230";
        ctx.strokeRect(x - 1, y - 1, PLAYTEST_TILE_SIZE_PX + 2, PLAYTEST_TILE_SIZE_PX + 2);
      }

      if (diagnostics.ids) {
        ctx.fillStyle = "#0f380f";
        ctx.font = "6px monospace";
        ctx.fillText(`#${entity.id}`, x, Math.max(6, y - 2));
      }
    }

    ctx.fillStyle = "#0f380f";
    ctx.font = "8px monospace";
    ctx.fillText(`F:${frame}`, 4, height - 6);
    if (snapshot.playtest?.paused) {
      ctx.fillText("PAUSED", width - 40, height - 6);
    }

    applyPlaytestViewportScale();
  }

  /**
   * @param {EditorSnapshot} snapshot
   */
  function renderPlaytest(snapshot) {
    const active = !!snapshot.playtest?.active;
    const frame = snapshot.playtest?.frame ?? 0;
    const lastSteps = snapshot.playtest.last_tick_steps ?? 0;
    if (active && !telemetryLastActive) {
      telemetryFirstFrameMarked = false;
      telemetryLastFrame = null;
      telemetryLastSteps = null;
      onPlaytestEntered?.();
    } else if (!active && telemetryLastActive) {
      telemetryFirstFrameMarked = false;
      telemetryLastFrame = null;
      telemetryLastSteps = null;
      onPlaytestExited?.();
    }
    if (active && !telemetryFirstFrameMarked && (frame > 0 || lastSteps > 0)) {
      telemetryFirstFrameMarked = true;
      onPlaytestFirstFrame?.();
    }
    if (active && (frame !== telemetryLastFrame || lastSteps !== telemetryLastSteps)) {
      telemetryLastFrame = frame;
      telemetryLastSteps = lastSteps;
      onPlaytestMetricUpdate?.();
    }
    telemetryLastActive = active;

    if (elements.playtestOverlay) {
      elements.playtestOverlay.hidden = !active;
    }
    if (elements.playtestViewportWrap) {
      elements.playtestViewportWrap.hidden = !active;
    }
    if (elements.tileLayer) {
      elements.tileLayer.hidden = active;
    }
    if (elements.entityLayer) {
      elements.entityLayer.hidden = active;
    }
    if (elements.marqueeBox) {
      elements.marqueeBox.style.display = active ? "none" : elements.marqueeBox.style.display;
    }
    if (active) {
      renderPlaytestViewport(snapshot);
    }
    if (!active) {
      return;
    }

    if (elements.playtestPauseBtn) {
      elements.playtestPauseBtn.textContent = snapshot.playtest.paused ? "Resume" : "Pause";
    }
    if (elements.playtestStepBtn) {
      elements.playtestStepBtn.disabled = !snapshot.playtest.paused;
    }
    const lastDelta = snapshot.playtest.last_tick_delta_ms ?? 0;
    if (elements.playtestMetricFrame) {
      elements.playtestMetricFrame.textContent = `Frame: ${snapshot.playtest.frame}`;
    }
    if (elements.playtestMetricDelta) {
      elements.playtestMetricDelta.textContent = `Tick: ${lastDelta}ms`;
    }
    if (elements.playtestMetricSteps) {
      elements.playtestMetricSteps.textContent = `Steps: ${lastSteps}`;
    }
    if (elements.playtestMetricBreak) {
      const hit = snapshot.lastBreakpointHit;
      elements.playtestMetricBreak.textContent = hit
        ? `Break: ${hit.kind} @ f${hit.frame}`
        : "Break: none";
    }
    if (elements.playtestMetricFeedback) {
      const metrics =
        typeof window !== "undefined" &&
        typeof window["__gcsPerfMetrics"] === "object" &&
        window["__gcsPerfMetrics"] !== null
          ? /** @type {{ playtestFirstFrameDeltaMs?: number, playtestLastMetricUpdateDeltaMs?: number }} */ (
              window["__gcsPerfMetrics"]
            )
          : {};
      const firstFrame = metrics.playtestFirstFrameDeltaMs;
      const lastUpdate = metrics.playtestLastMetricUpdateDeltaMs;
      const firstText = typeof firstFrame === "number" ? `${Math.round(firstFrame)}ms` : "pending";
      const updateText = typeof lastUpdate === "number" ? `${Math.round(lastUpdate)}ms` : "pending";
      elements.playtestMetricFeedback.textContent = `Feedback: first frame ${firstText} | last update ${updateText}`;
    }
    elements.playtestSpeed1xBtn?.classList.toggle("active", snapshot.playtest.speed === 1);
    elements.playtestSpeedHalfBtn?.classList.toggle("active", snapshot.playtest.speed === 0.5);
    elements.playtestSpeedQuarterBtn?.classList.toggle("active", snapshot.playtest.speed === 0.25);
    elements.playtestZoomFitBtn?.classList.toggle("active", playtestZoomMode === "fit");
    elements.playtestZoom2xBtn?.classList.toggle("active", playtestZoomMode === "2x");
    elements.playtestZoom3xBtn?.classList.toggle("active", playtestZoomMode === "3x");
    elements.playtestZoom4xBtn?.classList.toggle("active", playtestZoomMode === "4x");
    elements.playtestTraceBtn?.classList.toggle("active", !!snapshot.diagnostics?.trace);
    const breakpoints = snapshot.playtestBreakpoints || [];
    elements.breakpointTickBtn?.classList.toggle(
      "active",
      breakpoints.some((entry) => entry.key === "playtest_tick" && entry.value)
    );
    elements.breakpointItemBtn?.classList.toggle(
      "active",
      breakpoints.some((entry) => entry.key === "item_pickup" && entry.value)
    );
    elements.breakpointQuestBtn?.classList.toggle(
      "active",
      breakpoints.some((entry) => entry.key === "quest_state" && entry.value)
    );
  }

  /**
   * @param {number} ts
   */
  async function playtestLoop(ts) {
    playtestRafId = null;
    const snapshot = state.snapshot();
    if (!snapshot.playtest.active || snapshot.playtest.paused) {
      syncPlaytestLoop(snapshot);
      return;
    }

    // Schedule the next frame immediately — decoupled from the Tauri tick
    // latency. Without this, the RAF loop runs at IPC speed (~20fps) rather
    // than the display refresh rate. The in-flight guard below prevents
    // concurrent ticks when the Tauri call takes longer than one frame.
    playtestRafId = window.requestAnimationFrame(playtestLoop);

    if (playtestLastTs === null) {
      playtestLastTs = ts;
    }
    const deltaMs = Math.max(0, Math.min(PLAYTEST_MAX_DELTA_MS, ts - playtestLastTs));
    playtestLastTs = ts;

    if (!playtestTickInFlight && deltaMs > 0) {
      playtestTickInFlight = true;
      try {
        await state.tickPlaytest(Math.round(deltaMs));
        requestRender();
      } finally {
        playtestTickInFlight = false;
      }
    }
  }

  /**
   * @param {EditorSnapshot} snapshot
   */
  function syncPlaytestLoop(snapshot) {
    const shouldRun = snapshot.playtest.active && !snapshot.playtest.paused;
    if (shouldRun && playtestRafId === null) {
      playtestLastTs = window.performance.now() - PLAYTEST_LOOP_WARM_START_MS;
      playtestRafId = window.requestAnimationFrame(playtestLoop);
      return;
    }
    if (!shouldRun && playtestRafId !== null) {
      window.cancelAnimationFrame(playtestRafId);
      playtestRafId = null;
      playtestLastTs = null;
    }
  }

  function setPlaytestZoomMode(mode) {
    playtestZoomMode = mode;
    requestRender();
  }

  function bindUiEvents() {
    if (eventsBound) {
      return;
    }
    eventsBound = true;

    addListener(elements.playtestPauseBtn, "click", async () => {
      await state.togglePlayPause();
      requestRender();
    });
    addListener(elements.playtestStepBtn, "click", async () => {
      await state.stepPlaytestFrame();
      requestRender();
    });
    addListener(elements.playtestSpeed1xBtn, "click", async () => {
      await state.setPlaytestSpeed(1);
      requestRender();
    });
    addListener(elements.playtestSpeedHalfBtn, "click", async () => {
      await state.setPlaytestSpeed(0.5);
      requestRender();
    });
    addListener(elements.playtestSpeedQuarterBtn, "click", async () => {
      await state.setPlaytestSpeed(0.25);
      requestRender();
    });
    addListener(elements.playtestZoomFitBtn, "click", () => setPlaytestZoomMode("fit"));
    addListener(elements.playtestZoom2xBtn, "click", () => setPlaytestZoomMode("2x"));
    addListener(elements.playtestZoom3xBtn, "click", () => setPlaytestZoomMode("3x"));
    addListener(elements.playtestZoom4xBtn, "click", () => setPlaytestZoomMode("4x"));
    addListener(elements.playtestExitBtn, "click", async () => {
      await state.exitPlaytest();
      requestRender();
    });

    addListener(elements.playtestTraceBtn, "click", () => {
      const enabled = !state.snapshot().diagnostics.trace;
      state
        .setTraceEnabled(enabled)
        .then(() => requestRender())
        .catch((error) => log(`Trace toggle failed: ${error?.message || String(error)}`));
    });

    addListener(elements.breakpointTickBtn, "click", () => onToggleBreakpoint("playtest_tick"));
    addListener(elements.breakpointItemBtn, "click", () => onToggleBreakpoint("item_pickup"));
    addListener(elements.breakpointQuestBtn, "click", () => onToggleBreakpoint("quest_state"));
  }

  function observeViewport() {
    if (typeof window.ResizeObserver === "undefined" || !elements.playtestViewportWrap) {
      return;
    }
    viewportResizeObserver = new window.ResizeObserver(() => {
      if (playtestZoomMode === "fit") {
        applyPlaytestViewportScale();
      }
    });
    viewportResizeObserver.observe(elements.playtestViewportWrap);
  }

  function dispose() {
    if (playtestRafId !== null) {
      window.cancelAnimationFrame(playtestRafId);
      playtestRafId = null;
    }
    playtestLastTs = null;
    playtestTickInFlight = false;
    telemetryLastActive = false;
    telemetryFirstFrameMarked = false;
    telemetryLastFrame = null;
    telemetryLastSteps = null;
    if (viewportResizeObserver) {
      viewportResizeObserver.disconnect();
      viewportResizeObserver = null;
    }
    listeners.forEach((unsubscribe) => unsubscribe());
    listeners.length = 0;
    eventsBound = false;
  }

  observeViewport();

  return {
    bindUiEvents,
    dispose,
    renderPlaytest,
    syncPlaytestLoop,
  };
}
