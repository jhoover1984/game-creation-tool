import assert from "node:assert/strict";
import test from "node:test";

import { renderEditorWorkspace } from "../src/ui-shell-render.js";

test("renderEditorWorkspace updates shell text fields and delegates to controllers", () => {
  const calls = [];
  const snapshot = {
    projectName: "Starter Town",
    playtest: { active: true, paused: false, speed: 0.5, frame: 12 },
    health: {
      warnings: ["warn-a"],
      near_limits: [],
      missing_assets: [],
      trashed_refs: [],
    },
    lastError: null,
    scriptValidation: { parseError: null, errors: [] },
    selection: [2],
    entities: [{ id: 2, name: "Player", position: { x: 16, y: 16 } }],
    runtimeMode: "web",
    canUndo: true,
    canRedo: true,
  };
  const projectTitle = { textContent: "" };
  const inspectorNameInput = { value: "" };
  const healthSummary = { textContent: "" };

  renderEditorWorkspace(snapshot, {
    projectTitle,
    inspectorNameInput,
    healthSummary,
    controllers: {
      issuesRecoveryController: {
        renderIssues(nextSnapshot, issues) {
          calls.push(["issues", nextSnapshot, issues.length]);
        },
      },
      scriptLabController: {
        renderValidationSummary(nextSnapshot) {
          calls.push(["script", nextSnapshot.projectName]);
        },
      },
      entityListController: {
        renderEntityList(nextSnapshot) {
          calls.push(["entities", nextSnapshot.projectName]);
        },
      },
      canvasRendererController: {
        render(nextSnapshot) {
          calls.push(["canvas", nextSnapshot.playtest.frame]);
        },
      },
      mapInteractionController: {
        renderMarquee() {
          calls.push(["marquee"]);
        },
        getActiveTool() {
          return "paint";
        },
      },
      playtestController: {
        renderPlaytest(nextSnapshot) {
          calls.push(["playtest", nextSnapshot.playtest.active]);
        },
      },
      debugPanelsController: {
        renderTrace() {
          calls.push(["trace"]);
        },
        renderWatch() {
          calls.push(["watch"]);
        },
      },
      onboardingController: {
        render() {
          calls.push(["onboarding"]);
        },
      },
      walkthroughController: {
        renderWalkthrough() {
          calls.push(["walkthrough"]);
        },
      },
      helpTourController: {
        renderHelpOverlay() {
          calls.push(["help-overlay"]);
        },
        isVisible() {
          return true;
        },
      },
      drawSeedController: {
        renderDraftPreview() {
          calls.push(["draw-seed"]);
        },
      },
      shellStatusController: {
        renderStatus(nextSnapshot, context) {
          calls.push(["status", nextSnapshot.projectName, context.activeTool, context.helpVisible]);
        },
      },
      layoutPanelsController: { kind: "layout" },
      mapViewportController: { kind: "viewport" },
      preferencesController: { kind: "prefs" },
    },
    resolveAssistedGuardrail: () => null,
  });

  assert.equal(projectTitle.textContent, "Starter Town");
  assert.equal(inspectorNameInput.value, "Player");
  assert.equal(healthSummary.textContent, "1 warning(s) detected.");
  assert.ok(calls.some((entry) => entry[0] === "issues"));
  assert.ok(
    calls.some((entry) => entry[0] === "status" && entry[2] === "paint" && entry[3] === true)
  );
});
