function perfNow() {
  if (
    typeof globalThis.performance !== "undefined" &&
    typeof globalThis.performance.now === "function"
  ) {
    return globalThis.performance.now();
  }
  return Date.now();
}

export function createPerfMetricsController() {
  const state = {
    bootStartMs: perfNow(),
    dashboardFirstPaintMs: null,
    preloadScheduledMs: null,
    preloadResolvedMs: null,
    preloadSource: null,
    editorInitStartMs: null,
    editorInitEndMs: null,
    workspaceEnteredMs: null,
    playtestEnterMs: null,
    playtestFirstFrameMs: null,
    playtestLastMetricUpdateMs: null,
  };

  function publish(patch = {}) {
    Object.assign(state, patch);
    const metrics = {
      ...state,
      dashboardFirstPaintDeltaMs:
        state.dashboardFirstPaintMs === null
          ? null
          : Number((state.dashboardFirstPaintMs - state.bootStartMs).toFixed(2)),
      editorInitDurationMs:
        state.editorInitStartMs === null || state.editorInitEndMs === null
          ? null
          : Number((state.editorInitEndMs - state.editorInitStartMs).toFixed(2)),
      workspaceEnteredDeltaMs:
        state.workspaceEnteredMs === null
          ? null
          : Number((state.workspaceEnteredMs - state.bootStartMs).toFixed(2)),
      playtestFirstFrameDeltaMs:
        state.playtestEnterMs === null || state.playtestFirstFrameMs === null
          ? null
          : Number((state.playtestFirstFrameMs - state.playtestEnterMs).toFixed(2)),
      playtestLastMetricUpdateDeltaMs:
        state.playtestEnterMs === null || state.playtestLastMetricUpdateMs === null
          ? null
          : Number((state.playtestLastMetricUpdateMs - state.playtestEnterMs).toFixed(2)),
    };

    if (typeof window !== "undefined") {
      const metricsWindow = /** @type {Window & { __gcsPerfMetrics?: unknown }} */ (window);
      metricsWindow.__gcsPerfMetrics = metrics;
    }
    return metrics;
  }

  function markDashboardFirstPaint() {
    if (state.dashboardFirstPaintMs === null) {
      publish({ dashboardFirstPaintMs: perfNow() });
    }
  }

  function markPreloadScheduled() {
    if (state.preloadScheduledMs === null) {
      publish({ preloadScheduledMs: perfNow() });
    }
  }

  function markPreloadSource(source) {
    if (state.preloadSource === null) {
      publish({ preloadSource: source });
    }
  }

  function markPreloadResolved() {
    if (state.preloadResolvedMs === null) {
      publish({ preloadResolvedMs: perfNow() });
    }
  }

  function markEditorInitStart() {
    if (state.editorInitStartMs === null) {
      publish({ editorInitStartMs: perfNow() });
    }
  }

  function markEditorInitEnd() {
    if (state.editorInitEndMs === null) {
      publish({ editorInitEndMs: perfNow() });
    }
  }

  function markWorkspaceEntered() {
    publish({ workspaceEnteredMs: perfNow() });
  }

  function markPlaytestEntered() {
    publish({
      playtestEnterMs: perfNow(),
      playtestFirstFrameMs: null,
      playtestLastMetricUpdateMs: null,
    });
  }

  function markPlaytestFirstFrame() {
    if (state.playtestFirstFrameMs === null) {
      publish({ playtestFirstFrameMs: perfNow() });
    }
  }

  function markPlaytestMetricUpdate() {
    if (state.playtestEnterMs !== null) {
      publish({ playtestLastMetricUpdateMs: perfNow() });
    }
  }

  function resetPlaytestMetrics() {
    publish({
      playtestEnterMs: null,
      playtestFirstFrameMs: null,
      playtestLastMetricUpdateMs: null,
    });
  }

  function snapshot() {
    return { ...state };
  }

  publish();

  return {
    markDashboardFirstPaint,
    markPreloadScheduled,
    markPreloadSource,
    markPreloadResolved,
    markEditorInitStart,
    markEditorInitEnd,
    markWorkspaceEntered,
    markPlaytestEntered,
    markPlaytestFirstFrame,
    markPlaytestMetricUpdate,
    resetPlaytestMetrics,
    snapshot,
  };
}
