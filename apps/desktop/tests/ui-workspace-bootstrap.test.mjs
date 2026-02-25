import assert from "node:assert/strict";
import test from "node:test";

import { initializeWorkspaceControllers } from "../src/ui-workspace-bootstrap.js";

function createStubFactory(label, hooks = {}) {
  const calls = [];

  return {
    calls,
    create(deps = {}) {
      calls.push({ type: "create", deps });
      return {
        bindEvents: () => calls.push({ type: "bindEvents" }),
        bindUiEvents: () => calls.push({ type: "bindUiEvents" }),
        init: () => calls.push({ type: "init" }),
        refreshPresetOptions: () => calls.push({ type: "refreshPresetOptions" }),
        applyStarterScriptForTemplate: async () =>
          calls.push({ type: "applyStarterScriptForTemplate" }),
        runOnboardingAction: async () => calls.push({ type: "runOnboardingAction" }),
        getMapZoomScale: () => 1,
        ...hooks,
      };
    },
    label,
  };
}

test("workspace bootstrap initializes, binds, and returns controller bundle", async () => {
  const drawSeedFactory = createStubFactory("draw-seed");
  const drawAssistFactory = createStubFactory("draw-assist");
  const mapViewportFactory = createStubFactory("map-viewport");
  const mapInteractionFactory = createStubFactory("map-interaction");
  const canvasRendererFactory = createStubFactory("canvas-renderer");
  const walkthroughFactory = createStubFactory("walkthrough");
  const playtestFactory = createStubFactory("playtest");
  const helpTourFactory = createStubFactory("help-tour");
  const onboardingFactory = createStubFactory("onboarding");
  const debugFactory = createStubFactory("debug-panels");
  const scriptTemplatesFactory = createStubFactory("script-templates");
  const scriptLabFactory = createStubFactory("script-lab");
  const preferencesFactory = createStubFactory("preferences");
  const commandBarFactory = createStubFactory("command-bar");
  const editorInputFactory = createStubFactory("editor-input");
  const layoutFactory = createStubFactory("layout-panels");
  const issuesRecoveryFactory = createStubFactory("issues-recovery");
  const animationTransitionsFactory = createStubFactory("animation-transitions");
  const flipbookStudioFactory = createStubFactory("flipbook-studio");

  const logs = [];
  const guardrails = [];
  const state = {
    snapshot: () => ({ playtest: { active: false } }),
    enterPlaytest: async () => {},
    exportPreview: async () => {},
    selectEntities: async () => {},
    setProjectName: () => {},
  };

  const controllers = await initializeWorkspaceControllers({
    state,
    loadEditorModuleBundle: async () => [
      { createWalkthroughController: (deps) => walkthroughFactory.create(deps) },
      { createDrawSeedController: (deps) => drawSeedFactory.create(deps) },
      { createPlaytestController: (deps) => playtestFactory.create(deps) },
      { createMapInteractionController: (deps) => mapInteractionFactory.create(deps) },
      { createHelpTourController: (deps) => helpTourFactory.create(deps) },
      { createOnboardingController: (deps) => onboardingFactory.create(deps) },
      { createDebugPanelsController: (deps) => debugFactory.create(deps) },
      { createScriptTemplatesController: (deps) => scriptTemplatesFactory.create(deps) },
      { createScriptLabController: (deps) => scriptLabFactory.create(deps) },
      { createPreferencesController: (deps) => preferencesFactory.create(deps) },
      { createCommandBarController: (deps) => commandBarFactory.create(deps) },
      { createEditorInputController: (deps) => editorInputFactory.create(deps) },
      { createMapViewportController: (deps) => mapViewportFactory.create(deps) },
      { createDrawAssistControlsController: (deps) => drawAssistFactory.create(deps) },
      { createLayoutPanelsController: (deps) => layoutFactory.create(deps) },
      { createCanvasRendererController: (deps) => canvasRendererFactory.create(deps) },
      { createFlipbookStudioController: (deps) => flipbookStudioFactory.create(deps) },
      { createAnimationTransitionsController: (deps) => animationTransitionsFactory.create(deps) },
      { createIssuesRecoveryController: (deps) => issuesRecoveryFactory.create(deps) },
    ],
    tileSize: 16,
    helpTourSteps: [{ title: "Step", selector: "#id", message: "desc", action: "noop" }],
    elements: {
      uiProfileSelect: { id: "ui-profile" },
      themeSelect: { id: "theme" },
      densitySelect: { id: "density" },
      commandButtons: {},
      toolButtons: {},
      topbarCommandButtons: [],
      rightPanelTabButtons: [],
      rightPanelSections: [],
    },
    callbacks: {
      render: () => {},
      log: (message) => logs.push(message),
      capitalize: (value) => value.toUpperCase(),
      togglePlaytest: async () => {},
      toggleBreakpoint: () => {},
      triggerAssistedGeneration: async () => {},
      resolveAssistedGuardrail: (snapshot) => {
        guardrails.push(snapshot);
        return { level: "info", message: "ok", actions: [] };
      },
    },
  });

  assert.ok(controllers.drawSeedController);
  assert.ok(controllers.drawAssistControlsController);
  assert.ok(controllers.mapViewportController);
  assert.ok(controllers.mapInteractionController);
  assert.ok(controllers.canvasRendererController);
  assert.ok(controllers.scriptTemplatesController);
  assert.ok(controllers.scriptLabController);
  assert.ok(controllers.preferencesController);
  assert.ok(controllers.layoutPanelsController);
  assert.ok(controllers.flipbookStudioController);
  assert.ok(controllers.commandBarController);
  assert.ok(controllers.editorInputController);
  assert.ok(controllers.onboardingController);
  assert.ok(controllers.walkthroughController);
  assert.ok(controllers.helpTourController);
  assert.ok(controllers.playtestController);
  assert.ok(controllers.debugPanelsController);
  assert.ok(controllers.issuesRecoveryController);
  assert.ok(controllers.workspaceBindingsController);

  assert.ok(helpTourFactory.calls.some((entry) => entry.type === "bindEvents"));
  assert.ok(mapViewportFactory.calls.some((entry) => entry.type === "bindEvents"));
  assert.ok(mapInteractionFactory.calls.some((entry) => entry.type === "bindEvents"));
  assert.ok(onboardingFactory.calls.some((entry) => entry.type === "bindEvents"));
  assert.ok(walkthroughFactory.calls.some((entry) => entry.type === "bindEvents"));
  assert.ok(playtestFactory.calls.some((entry) => entry.type === "bindUiEvents"));
  assert.ok(debugFactory.calls.some((entry) => entry.type === "bindEvents"));
  assert.ok(scriptTemplatesFactory.calls.some((entry) => entry.type === "bindEvents"));
  assert.ok(scriptTemplatesFactory.calls.some((entry) => entry.type === "init"));
  assert.ok(scriptLabFactory.calls.some((entry) => entry.type === "bindEvents"));
  assert.ok(preferencesFactory.calls.some((entry) => entry.type === "bindEvents"));
  assert.ok(layoutFactory.calls.some((entry) => entry.type === "bindEvents"));
  assert.ok(flipbookStudioFactory.calls.some((entry) => entry.type === "bindEvents"));
  assert.ok(animationTransitionsFactory.calls.some((entry) => entry.type === "bindEvents"));
  assert.ok(commandBarFactory.calls.some((entry) => entry.type === "bindEvents"));
  assert.ok(editorInputFactory.calls.some((entry) => entry.type === "bindEvents"));
  assert.ok(drawAssistFactory.calls.some((entry) => entry.type === "bindEvents"));
  assert.ok(drawSeedFactory.calls.some((entry) => entry.type === "refreshPresetOptions"));
  assert.deepEqual(logs, ["Editor workspace initialized."]);

  const onboardingCreateCall = onboardingFactory.calls.find((entry) => entry.type === "create");
  const resolved = onboardingCreateCall.deps.buildAssistedGuardrail({ projectName: "test" });
  assert.equal(resolved?.message, "ok");
  assert.deepEqual(guardrails, [{ projectName: "test" }]);

  const playtestCreateCall = playtestFactory.calls.find((entry) => entry.type === "create");
  assert.equal(typeof playtestCreateCall.deps.onPlaytestEntered, "function");
  assert.equal(typeof playtestCreateCall.deps.onPlaytestFirstFrame, "function");
  assert.equal(typeof playtestCreateCall.deps.onPlaytestMetricUpdate, "function");
  assert.equal(typeof playtestCreateCall.deps.onPlaytestExited, "function");

  const preferencesCreateCall = preferencesFactory.calls.find((entry) => entry.type === "create");
  assert.equal(preferencesCreateCall.deps.elements.uiProfileSelect.id, "ui-profile");
  assert.equal(preferencesCreateCall.deps.elements.themeSelect.id, "theme");
  assert.equal(preferencesCreateCall.deps.elements.densitySelect.id, "density");
});
