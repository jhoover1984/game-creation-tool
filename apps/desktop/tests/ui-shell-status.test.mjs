import test from "node:test";
import assert from "node:assert/strict";

import { buildShellStatusModel } from "../src/ui-shell-status.js";

test("buildShellStatusModel sets edit mode controls and labels", () => {
  const snapshot = {
    canUndo: true,
    canRedo: false,
    selection: [1],
    runtimeMode: "web",
  };
  const model = buildShellStatusModel(snapshot, {
    isPlaytest: false,
    isPaused: false,
    playSpeed: 1,
    activeTool: "paint",
    helpVisible: false,
  });

  assert.deepEqual(model.commandDisabled, {
    undo: false,
    redo: true,
    move: false,
    delete: false,
    reselect: false,
    create: false,
  });
  assert.equal(model.playButtonLabel, "Playtest");
  assert.equal(model.hudModeText, "Edit");
  assert.equal(model.hudSelectionText, "Selected: 1");
  assert.equal(model.runtimeModeText, "Web Mode");
});

test("buildShellStatusModel sets playtest mode controls and labels", () => {
  const snapshot = {
    canUndo: false,
    canRedo: false,
    selection: [],
    runtimeMode: "desktop_local",
  };
  const model = buildShellStatusModel(snapshot, {
    isPlaytest: true,
    isPaused: true,
    playSpeed: 0.5,
    activeTool: "select",
    helpVisible: true,
  });

  assert.deepEqual(model.commandDisabled, {
    undo: true,
    redo: true,
    move: true,
    delete: true,
    reselect: true,
    create: true,
  });
  assert.equal(model.playButtonLabel, "Exit Playtest");
  assert.equal(model.hudModeText, "Playtest (Paused)");
  assert.equal(model.runtimeModeText, "Desktop Local");
  assert.equal(model.runtimeIsDesktop, true);
  assert.equal(model.helpVisible, true);
});
