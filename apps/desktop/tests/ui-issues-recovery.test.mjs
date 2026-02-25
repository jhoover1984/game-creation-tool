import test from "node:test";
import assert from "node:assert/strict";

import { createIssuesRecoveryController } from "../src/ui-issues-recovery.js";

function createHarness(snapshotOverride = {}) {
  const calls = [];
  const captured = { payload: null };
  const snapshot = {
    entities: [],
    lastError: null,
    diagnostics: { trace: false },
    playtestBreakpoints: [],
    scriptValidation: { lastInput: "{}" },
    ...snapshotOverride,
  };
  const state = {
    snapshot: () => snapshot,
    refreshHealth: async () => calls.push(["refreshHealth"]),
    refreshEditorState: async () => calls.push(["refreshEditorState"]),
    addEntity: async () => calls.push(["addEntity"]),
    deleteSelected: async () => calls.push(["deleteSelected"]),
    undo: async () => calls.push(["undo"]),
    redo: async () => calls.push(["redo"]),
    reselectPrevious: async () => calls.push(["reselectPrevious"]),
    togglePlayPause: async () => calls.push(["togglePlayPause"]),
    stepPlaytestFrame: async () => calls.push(["stepPlaytestFrame"]),
    setTraceEnabled: async (enabled) => calls.push(["setTraceEnabled", enabled]),
    setBreakpoints: async (kinds) => calls.push(["setBreakpoints", kinds]),
    validateScriptGraphInput: async (input) => calls.push(["validateScriptGraphInput", input]),
    exportPreview: async () => calls.push(["exportPreview"]),
    open: async (projectDir) => calls.push(["open", projectDir]),
    save: async () => calls.push(["save"]),
    enterPlaytest: async () => calls.push(["enterPlaytest"]),
    exitPlaytest: async () => calls.push(["exitPlaytest"]),
    cleanupAssistedGenerated: async (profile) => calls.push(["cleanupAssistedGenerated", profile]),
  };
  const drawSeedController = {
    getImportWarnings: () => [],
    clearImportWarnings: () => calls.push(["clearImportWarnings"]),
  };
  const debugPanelsController = {
    renderIssues: (payload) => {
      captured.payload = payload;
    },
  };
  const controller = createIssuesRecoveryController({
    elements: {},
    state,
    drawSeedController,
    debugPanelsController,
    render: () => calls.push(["render"]),
  });
  return {
    calls,
    captured,
    controller,
    state,
    snapshot,
  };
}

test("issues recovery adds retry-last-action guidance for retryable app-state failures", () => {
  const harness = createHarness({
    lastError: { action: "addEntity", message: "simulated" },
  });
  harness.controller.renderIssues(harness.snapshot, []);

  const recoveryActions = harness.captured.payload.recoveryActions;
  assert.equal(recoveryActions.length, 2);
  assert.deepEqual(recoveryActions[0], {
    action: "retry_last_action",
    label: "Retry Add Entity",
    message: "Add entity failed.",
  });
  assert.deepEqual(recoveryActions[1], {
    action: "reload_editor",
    label: "Reload Editor State",
    message: "Recover by refreshing current editor state.",
  });
});

test("issues recovery falls back to reload-only action for non-retryable failures", () => {
  const harness = createHarness({
    lastError: { action: "paintTileAt", message: "simulated" },
  });
  harness.controller.renderIssues(harness.snapshot, []);

  const recoveryActions = harness.captured.payload.recoveryActions;
  assert.equal(recoveryActions.length, 1);
  assert.deepEqual(recoveryActions[0], {
    action: "reload_editor",
    label: "Reload Editor State",
    message: "Runtime command failed.",
  });
});

test("retry_last_action dispatches validation retry with last script input", async () => {
  const harness = createHarness({
    lastError: { action: "validateScriptGraphInput", message: "bad graph" },
    scriptValidation: { lastInput: '{"nodes":[]}' },
  });
  await harness.controller.runIssueRecoveryAction("retry_last_action");

  assert.deepEqual(harness.calls[0], ["validateScriptGraphInput", '{"nodes":[]}']);
  assert.deepEqual(harness.calls[1], ["render"]);
});

test("retry_last_action retries breakpoints using currently-enabled kinds", async () => {
  const harness = createHarness({
    lastError: { action: "setBreakpoints", message: "failed" },
    playtestBreakpoints: [
      { key: "playtest_tick", value: true },
      { key: "item_pickup", value: false },
      { key: "quest_state", value: true },
    ],
  });
  await harness.controller.runIssueRecoveryAction("retry_last_action");

  assert.deepEqual(harness.calls[0], ["setBreakpoints", ["playtest_tick", "quest_state"]]);
  assert.deepEqual(harness.calls[1], ["render"]);
});
