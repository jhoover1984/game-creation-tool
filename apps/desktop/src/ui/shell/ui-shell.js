import { createAppState } from "../../app-state.js";
import { showToast } from "../../ui-toast.js";
import { resolveAssistedGuardrail } from "../../ui-assisted-guardrail.js";
import {
  buildWorkspaceBootstrapElements,
  createHelpTourSteps,
} from "./ui-shell-bootstrap-elements.js";
import { collectShellElements } from "./ui-shell-elements.js";
import { createLaunchDashboardController } from "../../ui-launch-dashboard.js";
import { createPerfMetricsController } from "../../ui-perf-metrics.js";
import { createShellEntryController } from "./ui-shell-entry.js";
import { createShellEventsController } from "./ui-shell-events.js";
import { createShellLifecycleController } from "./ui-shell-lifecycle.js";
import { formatShellLogLine } from "./ui-shell-log.js";
import { createEditorModuleBundleLoader } from "./ui-shell-module-bundle.js";
import { renderEditorWorkspace } from "./ui-shell-render.js";
import { createShellRuntimeController } from "./ui-shell-runtime.js";
import { createShellStatusController } from "./ui-shell-status.js";
import { initializeWorkspaceControllers } from "../../ui-workspace-bootstrap.js";

const state = createAppState();
const perfMetricsController = createPerfMetricsController();

const shellElements = collectShellElements(document);
const {
  logLines,
  launchDashboardRoot,
  editorWorkspaceRoot,
  dashboardRuntimeModeBadge,
  dashboardStatus,
  dashboardActionNewBtn,
  dashboardActionOpenBtn,
  dashboardActionContinueBtn,
  dashboardActionRecoverBtn,
  dashboardTemplateSelect,
  dashboardProfileSelect,
  dashboardUiModeSelect,
  dashboardRecentList,
  dashboardTemplateGrid,
  healthSummary,
  runtimeModeBadge,
  projectTitle,
  inspectorNameInput,
  hudMode,
  hudTool,
  hudSelection,
  helpToggleBtn,
  playButton,
  uiProfileSelect,
  newProjectTemplateSelect,
  commandButtons,
  toolButtons,
} = shellElements;

const TILE_SIZE = 16;
let editorWorkspaceInitialized = false;
let issuesRecoveryController = null;
let launchDashboardController = null;
let drawSeedController = null;
let drawAssistControlsController = null;
let mapViewportController = null;
let mapInteractionController = null;
let canvasRendererController = null;
let scriptTemplatesController = null;
let scriptLabController = null;
let preferencesController = null;
let layoutPanelsController = null;
let flipbookStudioController = null;
let commandBarController = null;
let editorInputController = null;
let onboardingController = null;
let walkthroughController = null;
let helpTourController = null;
let playtestController = null;
let debugPanelsController = null;
let entityListController = null;
let shellStatusController = null;
let workspaceBindingsController = null;
const HELP_TOUR_STEPS = createHelpTourSteps();
const editorModuleBundleLoader = createEditorModuleBundleLoader({
  markPreloadSource: (source) => perfMetricsController.markPreloadSource(source),
  markPreloadResolved: () => perfMetricsController.markPreloadResolved(),
});
const shellEntryController = createShellEntryController({
  getIsWorkspaceInitialized: () => editorWorkspaceInitialized,
  hasModuleBundlePromise: () => editorModuleBundleLoader.hasModuleBundlePromise(),
  initializeWorkspace: async () => initializeEditorWorkspace(),
  preloadModuleBundle: async (source) => editorModuleBundleLoader.loadEditorModuleBundle(source),
  markWorkspaceEntered: () => perfMetricsController.markWorkspaceEntered(),
  markPreloadScheduled: () => perfMetricsController.markPreloadScheduled(),
  reportError: (action, message) => state.reportError(action, message),
  render: () => render(),
});

async function initializeEditorWorkspace() {
  if (editorWorkspaceInitialized) {
    return;
  }
  perfMetricsController.markEditorInitStart();
  const bootstrapElements = buildWorkspaceBootstrapElements(
    /** @type {import("./ui-shell-bootstrap-elements.js").WorkspaceBootstrapElementsSource} */ (
      /** @type {unknown} */ (shellElements)
    )
  );
  const workspaceControllers = await initializeWorkspaceControllers({
    state,
    loadEditorModuleBundle: () => editorModuleBundleLoader.loadEditorModuleBundle(),
    tileSize: TILE_SIZE,
    helpTourSteps: HELP_TOUR_STEPS,
    elements: bootstrapElements,
    callbacks: {
      render: () => render(),
      log,
      capitalize,
      togglePlaytest: async () => shellRuntimeController.togglePlaytest(),
      toggleBreakpoint: (kind) => shellRuntimeController.toggleBreakpoint(kind),
      markPlaytestEntered: () => perfMetricsController.markPlaytestEntered(),
      markPlaytestFirstFrame: () => perfMetricsController.markPlaytestFirstFrame(),
      markPlaytestMetricUpdate: () => perfMetricsController.markPlaytestMetricUpdate(),
      resetPlaytestMetrics: () => perfMetricsController.resetPlaytestMetrics(),
      triggerAssistedGeneration: async (kind, profile, source, options = {}) =>
        triggerAssistedGeneration(kind, profile, source, options),
      resolveAssistedGuardrail: (snapshot) =>
        resolveAssistedGuardrail({
          issuesRecoveryController,
          snapshot,
        }),
    },
  });

  issuesRecoveryController = workspaceControllers.issuesRecoveryController;
  drawSeedController = workspaceControllers.drawSeedController;
  drawAssistControlsController = workspaceControllers.drawAssistControlsController;
  mapViewportController = workspaceControllers.mapViewportController;
  mapInteractionController = workspaceControllers.mapInteractionController;
  canvasRendererController = workspaceControllers.canvasRendererController;
  scriptTemplatesController = workspaceControllers.scriptTemplatesController;
  scriptLabController = workspaceControllers.scriptLabController;
  preferencesController = workspaceControllers.preferencesController;
  layoutPanelsController = workspaceControllers.layoutPanelsController;
  flipbookStudioController = workspaceControllers.flipbookStudioController;
  commandBarController = workspaceControllers.commandBarController;
  editorInputController = workspaceControllers.editorInputController;
  onboardingController = workspaceControllers.onboardingController;
  walkthroughController = workspaceControllers.walkthroughController;
  helpTourController = workspaceControllers.helpTourController;
  playtestController = workspaceControllers.playtestController;
  debugPanelsController = workspaceControllers.debugPanelsController;
  entityListController = workspaceControllers.entityListController;
  workspaceBindingsController = workspaceControllers.workspaceBindingsController;

  // Wire inspector name input: save name on change, focus on entity:created
  if (inspectorNameInput) {
    inspectorNameInput.addEventListener("change", async () => {
      const snapshot = state.snapshot();
      const selectedId = snapshot.selection?.[0] ?? null;
      if (selectedId !== null && inspectorNameInput.value.trim()) {
        await state.renameEntity(selectedId, inspectorNameInput.value);
        render();
      }
    });

    state.events.on("entity:created", () => {
      // Switch to inspector tab and focus name input so user can rename right away
      const inspectorTabBtn = /** @type {HTMLElement | null} */ (
        document.querySelector("[data-right-panel-tab='inspector']")
      );
      inspectorTabBtn?.click();
      requestAnimationFrame(() => {
        inspectorNameInput.focus();
        inspectorNameInput.select();
      });
    });
  }

  editorWorkspaceInitialized = true;
  perfMetricsController.markEditorInitEnd();
  render();
}

launchDashboardController = createLaunchDashboardController({
  elements: {
    root: launchDashboardRoot,
    editorRoot: editorWorkspaceRoot,
    runtimeModeBadge: dashboardRuntimeModeBadge,
    status: dashboardStatus,
    newBtn: dashboardActionNewBtn,
    openBtn: dashboardActionOpenBtn,
    continueBtn: dashboardActionContinueBtn,
    recoverBtn: dashboardActionRecoverBtn,
    templateSelect: /** @type {HTMLSelectElement | null} */ (dashboardTemplateSelect),
    profileSelect: /** @type {HTMLSelectElement | null} */ (dashboardProfileSelect),
    uiModeSelect: /** @type {HTMLSelectElement | null} */ (dashboardUiModeSelect),
    recentList: dashboardRecentList,
    templateGrid: dashboardTemplateGrid,
    workspaceTemplateSelect: /** @type {HTMLSelectElement | null} */ (newProjectTemplateSelect),
    workspaceUiProfileSelect: /** @type {HTMLSelectElement | null} */ (uiProfileSelect),
    workspaceAssistedProfileSelect: /** @type {HTMLSelectElement | null} */ (
      shellElements.assistedProfileSelect
    ),
    workspaceDrawAssistedProfileSelect: /** @type {HTMLSelectElement | null} */ (
      shellElements.drawAssistedProfileSelect
    ),
  },
  state: {
    newProjectFromTemplate: async (template) => {
      await state.newProjectFromTemplate(template);
    },
    open: async (projectDir) => {
      await state.open(projectDir);
    },
    refreshEditorState: async () => {
      await state.refreshEditorState();
    },
    refreshHealth: async () => {
      await state.refreshHealth();
    },
  },
  applyStarterScriptForTemplate: async (template) => {
    await shellEntryController.ensureWorkspaceInitialization();
    await scriptTemplatesController?.applyStarterScriptForTemplate(template);
  },
  log,
  getEntryMode: () => shellEntryController.getEntryMode(),
  setEntryMode: (mode) => shellEntryController.setEntryMode(mode),
  render: () => render(),
});
const shellLifecycleController = createShellLifecycleController({
  state,
  disposeControllers: () => disposeEditorControllers(),
});
shellStatusController = createShellStatusController({
  elements: {
    commandButtons: {
      create: /** @type {HTMLButtonElement} */ (commandButtons.create),
      move: /** @type {HTMLButtonElement} */ (commandButtons.move),
      delete: /** @type {HTMLButtonElement} */ (commandButtons.delete),
      undo: /** @type {HTMLButtonElement} */ (commandButtons.undo),
      redo: /** @type {HTMLButtonElement} */ (commandButtons.redo),
      reselect: /** @type {HTMLButtonElement} */ (commandButtons.reselect),
    },
    toolButtons: {
      select: /** @type {HTMLButtonElement | null} */ (toolButtons.select),
      paint: /** @type {HTMLButtonElement | null} */ (toolButtons.paint),
      erase: /** @type {HTMLButtonElement | null} */ (toolButtons.erase),
      fill: /** @type {HTMLButtonElement | null} */ (toolButtons.fill),
    },
    playButton: /** @type {HTMLButtonElement | null} */ (playButton),
    hudMode,
    hudTool,
    hudSelection,
    runtimeModeBadge,
    helpToggleBtn: /** @type {HTMLButtonElement | null} */ (helpToggleBtn),
  },
  capitalize,
});
const shellEventsController = createShellEventsController({
  state,
  log,
  render: () => render(),
  getOnboardingController: () => onboardingController,
  getPlaytestController: () => playtestController,
});
const shellRuntimeController = createShellRuntimeController({
  state,
  render: () => render(),
  log,
});
launchDashboardController?.bindEvents();
shellEventsController.bindEvents();

// Window-level drag-and-drop: accept PNG files as sprite imports
window.addEventListener("dragover", (event) => {
  const items = event.dataTransfer?.items;
  const hasPng = items && Array.from(items).some((item) => item.type === "image/png");
  if (hasPng) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }
});

window.addEventListener("drop", async (event) => {
  const files = Array.from(event.dataTransfer?.files || []).filter(
    (f) => f.type === "image/png"
  );
  if (files.length === 0) return;
  event.preventDefault();
  for (const file of files) {
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(/** @type {string} */ (reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await state.importSprite(file.name, dataUrl);
      render();
      showToast(`Sprite imported: ${file.name}`, "success");
    } catch (_err) {
      showToast(`Import failed: ${file.name}`, "error");
    }
  }
});

function log(message) {
  const ts = new Date().toLocaleTimeString();
  logLines.textContent = formatShellLogLine(message, ts);
}

function render() {
  const snapshot = state.snapshot();
  launchDashboardController?.renderDashboard(snapshot);
  if (shellEntryController.getEntryMode() !== "editor_workspace") {
    perfMetricsController.markDashboardFirstPaint();
    shellEntryController.scheduleModulePreload();
    return;
  }
  if (!editorWorkspaceInitialized) {
    shellEntryController.ensureWorkspaceInitialization().catch(() => {
      // error is surfaced through app:error boundary
    });
    return;
  }
  renderEditorWorkspace(snapshot, {
    projectTitle,
    inspectorNameInput,
    healthSummary,
    controllers: {
      issuesRecoveryController,
      scriptLabController,
      entityListController,
      canvasRendererController,
      mapInteractionController,
      playtestController,
      debugPanelsController,
      onboardingController,
      walkthroughController,
      helpTourController,
      drawSeedController,
      shellStatusController,
      layoutPanelsController,
      mapViewportController,
      preferencesController,
    },
    resolveAssistedGuardrail: (nextSnapshot) =>
      resolveAssistedGuardrail({
        issuesRecoveryController,
        snapshot: nextSnapshot,
      }),
  });
}

async function triggerAssistedGeneration(kind, profile, source, options = {}) {
  await state.generatePrimitiveAsset(kind, profile, options);
  if (source === "draw_studio") {
    log(`Draw Studio seed generated: ${kind} (${profile})`);
  }
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function disposeEditorControllers() {
  shellRuntimeController.disposeControllers([
    shellEventsController,
    shellEntryController,
    onboardingController,
    helpTourController,
    walkthroughController,
    drawAssistControlsController,
    mapViewportController,
    mapInteractionController,
    playtestController,
    debugPanelsController,
    entityListController,
    shellStatusController,
    workspaceBindingsController,
    scriptTemplatesController,
    scriptLabController,
    preferencesController,
    layoutPanelsController,
    flipbookStudioController,
    commandBarController,
    editorInputController,
    launchDashboardController,
    shellLifecycleController,
  ]);
}

shellLifecycleController.installGlobalErrorBoundary();
shellLifecycleController.bindBeforeUnload();
render();


