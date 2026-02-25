import test from "node:test";
import assert from "node:assert/strict";

import { createPerfMetricsController } from "../src/ui-perf-metrics.js";

test("perf metrics controller publishes initial metrics surface", () => {
  const previousWindow = globalThis.window;
  globalThis.window = {};

  try {
    const controller = createPerfMetricsController();
    const snapshot = controller.snapshot();
    assert.equal(typeof snapshot.bootStartMs, "number");
    assert.equal(snapshot.dashboardFirstPaintMs, null);
    assert.equal(snapshot.editorInitStartMs, null);
    assert.equal(snapshot.editorInitEndMs, null);
    assert.equal(snapshot.workspaceEnteredMs, null);

    const published = globalThis.window.__gcsPerfMetrics;
    assert.ok(published);
    assert.equal(typeof published.bootStartMs, "number");
    assert.equal(published.dashboardFirstPaintDeltaMs, null);
    assert.equal(published.editorInitDurationMs, null);
    assert.equal(published.workspaceEnteredDeltaMs, null);
    assert.equal(published.playtestFirstFrameDeltaMs, null);
    assert.equal(published.playtestLastMetricUpdateDeltaMs, null);
  } finally {
    if (previousWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = previousWindow;
    }
  }
});

test("perf metrics marks update published deltas and preload source deterministically", () => {
  const previousWindow = globalThis.window;
  globalThis.window = {};

  try {
    const controller = createPerfMetricsController();
    controller.markDashboardFirstPaint();
    controller.markPreloadScheduled();
    controller.markPreloadSource("idle_preload");
    controller.markPreloadSource("init_on_demand");
    controller.markPreloadResolved();
    controller.markEditorInitStart();
    controller.markEditorInitEnd();
    controller.markWorkspaceEntered();
    controller.markPlaytestEntered();
    controller.markPlaytestMetricUpdate();
    controller.markPlaytestFirstFrame();

    const published = globalThis.window.__gcsPerfMetrics;
    assert.ok(published);
    assert.equal(published.preloadSource, "idle_preload");
    assert.equal(typeof published.dashboardFirstPaintDeltaMs, "number");
    assert.equal(typeof published.editorInitDurationMs, "number");
    assert.equal(typeof published.workspaceEnteredDeltaMs, "number");
    assert.ok(published.dashboardFirstPaintDeltaMs >= 0);
    assert.ok(published.editorInitDurationMs >= 0);
    assert.ok(published.workspaceEnteredDeltaMs >= 0);
    assert.equal(typeof published.playtestFirstFrameDeltaMs, "number");
    assert.equal(typeof published.playtestLastMetricUpdateDeltaMs, "number");
    assert.ok(published.playtestFirstFrameDeltaMs >= 0);
    assert.ok(published.playtestLastMetricUpdateDeltaMs >= 0);

    controller.resetPlaytestMetrics();
    const reset = globalThis.window.__gcsPerfMetrics;
    assert.equal(reset.playtestFirstFrameDeltaMs, null);
    assert.equal(reset.playtestLastMetricUpdateDeltaMs, null);
  } finally {
    if (previousWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = previousWindow;
    }
  }
});
