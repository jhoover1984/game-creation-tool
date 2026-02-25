import test from "node:test";
import assert from "node:assert/strict";

import { createEventBus } from "../src/event-bus.js";
import { createShellEventsController } from "../src/ui-shell-events.js";

function buildSnapshot(overrides = {}) {
  return {
    projectName: "Starter Project",
    entities: [],
    playtest: { active: false, paused: false, speed: 1, frame: 0 },
    lastBreakpointHit: null,
    diagnostics: { grid: false, collision: false, ids: false, trace: false },
    primitiveKind: "tree",
    primitiveProfile: "game_boy",
    removedCount: 0,
    lastError: null,
    scriptValidation: { parseError: null, errors: [] },
    exportPreviewReport: null,
    runtimeMode: "web",
    ...overrides,
  };
}

test("shell events controller routes state events to onboarding/playtest/log channels", () => {
  const state = { events: createEventBus() };
  const logs = [];
  let renderCount = 0;
  let onboardingProjectNewCount = 0;
  let onboardingPlaytestChangedCount = 0;
  let playtestSyncCount = 0;

  const controller = createShellEventsController({
    state,
    log(message) {
      logs.push(message);
    },
    render() {
      renderCount += 1;
    },
    getOnboardingController() {
      return {
        onProjectNew() {
          onboardingProjectNewCount += 1;
        },
        onPlaytestChanged() {
          onboardingPlaytestChangedCount += 1;
        },
      };
    },
    getPlaytestController() {
      return {
        syncPlaytestLoop() {
          playtestSyncCount += 1;
        },
      };
    },
  });

  controller.bindEvents();

  state.events.emit("project:new", buildSnapshot({ projectName: "RPG Starter" }));
  assert.equal(onboardingProjectNewCount, 1);
  assert.equal(
    logs.some((line) => line.includes("New starter project: RPG Starter")),
    true
  );
  state.events.emit(
    "project:export-preview",
    buildSnapshot({
      runtimeMode: "desktop_local",
      exportPreviewReport: {
        output_dir: "export-artifacts/html5-preview",
        files: ["index.html"],
        scene_count: 1,
        asset_count: 0,
        profile: "game_boy",
        mode: "release",
      },
    })
  );
  assert.equal(
    logs.some((line) => line.includes("desktop authored lane")),
    true
  );

  const playtestSnapshot = buildSnapshot({
    playtest: { active: true, paused: false, speed: 1, frame: 5 },
    lastBreakpointHit: { seq: 7, frame: 5, kind: "playtest_tick", message: "bp" },
  });
  state.events.emit("playtest:changed", playtestSnapshot);
  assert.equal(onboardingPlaytestChangedCount, 1);
  assert.equal(playtestSyncCount, 1);
  assert.equal(
    logs.some((line) => line.includes("Playtest running @ 1x")),
    true
  );
  assert.equal(
    logs.some((line) => line.includes("Breakpoint hit: playtest_tick @ frame 5")),
    true
  );

  const logsAfterFirstPlaytestEvent = logs.length;
  state.events.emit("playtest:changed", playtestSnapshot);
  assert.equal(playtestSyncCount, 2);
  assert.equal(logs.length, logsAfterFirstPlaytestEvent);

  state.events.emit(
    "app:error",
    buildSnapshot({
      lastError: { action: "window:error", message: "simulated failure" },
    })
  );
  assert.equal(renderCount, 1);
  assert.equal(
    logs.some((line) => line.includes("Error (window:error): simulated failure")),
    true
  );

  state.events.emit(
    "script:validated",
    buildSnapshot({
      scriptValidation: { parseError: "bad graph", errors: [] },
    })
  );
  assert.equal(
    logs.some((line) => line.includes("Script validation failed: bad graph")),
    true
  );

  controller.dispose();
  const logsBeforeDisposedEmit = logs.length;
  state.events.emit("project:health-updated", buildSnapshot());
  assert.equal(logs.length, logsBeforeDisposedEmit);
});
