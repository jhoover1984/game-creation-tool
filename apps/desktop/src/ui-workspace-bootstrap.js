import { createEntityListController } from "./ui-entity-list.js";
import { createWorkspaceBindingsController } from "./ui-workspace-bindings.js";
import { createEventGraphController } from "./ui-event-graph.js";
import { attachEntityGraph } from "./project-api.js";

/**
 * @typedef {import("./types.js").EditorSnapshot} EditorSnapshot
 * @typedef {import("./ui-assisted-guardrail.js").AssistedGuardrail} AssistedGuardrail
 * @typedef {import("./ui-shell-bootstrap-elements.js").WorkspaceBootstrapElementsSource} WorkspaceBootstrapElementsSource
 */

/** @typedef {import("./ui-shell-module-bundle.js").WorkspaceEditorModuleBundle} WorkspaceEditorModuleBundle */

/**
 * @typedef {{
 *   state: {
 *     snapshot: () => EditorSnapshot,
 *     enterPlaytest: () => Promise<unknown>,
 *     exportPreview: (outputDir: string, profile: string, debug?: boolean) => Promise<unknown>,
 *     selectEntities: (next: number[]) => Promise<unknown>,
 *     setProjectName: (name: string) => void,
 *     addAudioBinding?: (event: string, clip: string) => void,
 *     removeAudioBinding?: (event: string) => void,
 *     addScene?: (id: string, name: string) => Promise<unknown>,
 *     removeScene?: (id: string) => Promise<unknown>,
 *     switchScene?: (id: string) => Promise<unknown>,
 *     fetchSelectedComponents?: () => Promise<unknown>,
 *     setSelectedEntityComponents?: (components: Record<string, unknown>) => Promise<unknown>,
 *     events?: { on: (event: string, handler: (snapshot: EditorSnapshot) => void) => void }
 *   },
 *   loadEditorModuleBundle: () => Promise<WorkspaceEditorModuleBundle>,
 *   tileSize: number,
 *   helpTourSteps: Array<{ title: string, selector: string, message: string, action: string }>,
 *   elements: WorkspaceBootstrapElementsSource,
 *   callbacks: {
 *     render: () => void,
 *     log: (message: string) => void,
 *     capitalize: (value: string) => string,
 *     togglePlaytest: () => Promise<unknown>,
 *     toggleBreakpoint: (kind: string) => void,
 *     markPlaytestEntered?: () => void,
 *     markPlaytestFirstFrame?: () => void,
 *     markPlaytestMetricUpdate?: () => void,
 *     resetPlaytestMetrics?: () => void,
 *     triggerAssistedGeneration: (
 *       kind: string,
 *       profile: string,
 *       source: string,
 *       options?: Record<string, unknown>
 *     ) => Promise<void>,
 *     resolveAssistedGuardrail: (snapshot: EditorSnapshot) => AssistedGuardrail
 *   }
 * }} WorkspaceBootstrapDeps
 */

/**
 * @param {WorkspaceBootstrapDeps} deps
 */
export async function initializeWorkspaceControllers({
  state,
  loadEditorModuleBundle,
  tileSize,
  helpTourSteps,
  elements,
  callbacks,
}) {
  const modules = /** @type {WorkspaceEditorModuleBundle} */ (await loadEditorModuleBundle());
  const [
    { createWalkthroughController },
    { createDrawSeedController },
    { createPlaytestController },
    { createMapInteractionController },
    { createHelpTourController },
    { createOnboardingController },
    { createDebugPanelsController },
    { createScriptTemplatesController },
    { createScriptLabController },
    { createPreferencesController },
    { createCommandBarController },
    { createEditorInputController },
    { createMapViewportController },
    { createDrawAssistControlsController },
    { createLayoutPanelsController },
    { createCanvasRendererController },
    { createFlipbookStudioController },
    { createAnimationTransitionsController },
    { createIssuesRecoveryController },
  ] = modules;

  const controllerBundle = {};
  let issuesRecoveryController = null;
  let scriptLabController = null;

  const drawSeedController = createDrawSeedController({
    elements: {
      drawAssistedPrimitiveSelect: elements.drawAssistedPrimitiveSelect,
      drawAssistedProfileSelect: elements.drawAssistedProfileSelect,
      drawAssistedOffsetXInput: elements.drawAssistedOffsetXInput,
      drawAssistedOffsetYInput: elements.drawAssistedOffsetYInput,
      drawAssistedMirrorXInput: elements.drawAssistedMirrorXInput,
      drawSeedCanvas: elements.drawSeedCanvas,
      drawSeedPreview: elements.drawSeedPreview,
      drawSeedSummary: elements.drawSeedSummary,
      drawSeedPresetSelect: elements.drawSeedPresetSelect,
      drawSeedPresetDeleteBtn: elements.drawSeedPresetDeleteBtn,
      drawSeedPresetNameInput: elements.drawSeedPresetNameInput,
      drawSeedPresetJson: elements.drawSeedPresetJson,
    },
    capitalize: callbacks.capitalize,
    log: callbacks.log,
  });

  const drawAssistControlsController = createDrawAssistControlsController({
    elements: {
      assistedGenerateBtn: elements.assistedGenerateBtn,
      assistedPrimitiveSelect: elements.assistedPrimitiveSelect,
      assistedProfileSelect: elements.assistedProfileSelect,
      drawAssistedGenerateBtn: elements.drawAssistedGenerateBtn,
      drawAssistedPrimitiveSelect: elements.drawAssistedPrimitiveSelect,
      drawAssistedProfileSelect: elements.drawAssistedProfileSelect,
      drawAssistedOffsetXInput: elements.drawAssistedOffsetXInput,
      drawAssistedOffsetYInput: elements.drawAssistedOffsetYInput,
      drawAssistedMirrorXInput: elements.drawAssistedMirrorXInput,
      drawSeedPresetClusterBtn: elements.drawSeedPresetClusterBtn,
      drawSeedPresetLineBtn: elements.drawSeedPresetLineBtn,
      drawSeedPresetRingBtn: elements.drawSeedPresetRingBtn,
      drawSeedPresetTreeBtn: elements.drawSeedPresetTreeBtn,
      drawSeedPresetBushBtn: elements.drawSeedPresetBushBtn,
      drawSeedPresetRockBtn: elements.drawSeedPresetRockBtn,
      drawSeedPresetApplyBtn: elements.drawSeedPresetApplyBtn,
      drawSeedPresetSelect: elements.drawSeedPresetSelect,
      drawSeedPresetSaveBtn: elements.drawSeedPresetSaveBtn,
      drawSeedPresetCopyBtn: elements.drawSeedPresetCopyBtn,
      drawSeedPresetDeleteBtn: elements.drawSeedPresetDeleteBtn,
      drawSeedPresetExportBtn: elements.drawSeedPresetExportBtn,
      drawSeedPresetImportBtn: elements.drawSeedPresetImportBtn,
    },
    drawSeedController,
    triggerAssistedGeneration: callbacks.triggerAssistedGeneration,
    render: callbacks.render,
  });

  const mapViewportController = createMapViewportController({
    elements: {
      canvasSurface: elements.canvasSurface,
      overlayGridBtn: elements.overlayGridBtn,
      overlayCollisionBtn: elements.overlayCollisionBtn,
      overlayIdsBtn: elements.overlayIdsBtn,
      mapZoomFitBtn: elements.mapZoomFitBtn,
      mapZoom1xBtn: elements.mapZoom1xBtn,
      mapZoom2xBtn: elements.mapZoom2xBtn,
      mapZoom3xBtn: elements.mapZoom3xBtn,
    },
    state,
    render: callbacks.render,
    tileSize,
    mapMinViewportWidth: 160,
    mapMinViewportHeight: 144,
  });

  const mapInteractionController = createMapInteractionController({
    elements: {
      canvasSurface: elements.canvasSurface,
      entityLayer: elements.entityLayer,
      marqueeBox: elements.marqueeBox,
    },
    state,
    render: callbacks.render,
    log: callbacks.log,
    getMapZoomScale: () => mapViewportController.getMapZoomScale(),
  });

  const canvasRendererController = createCanvasRendererController({
    elements: {
      tileLayer: elements.tileLayer,
      entityLayer: elements.entityLayer,
    },
    mapInteractionController,
    tileSize,
  });

  // Test bridge: allows E2E tests to drive transition overlay state without Tauri.
  if (typeof window !== "undefined") {
    window.__canvasBridge = {
      forceTransition: (opacity) => canvasRendererController.forceTransition(opacity),
      isTransitionVisible: () => canvasRendererController.isTransitionVisible(),
    };
  }

  const entityListController = createEntityListController({
    elements: {
      entityList: elements.entityList,
    },
  });

  const eventGraphController = createEventGraphController(
    {
      addRuleBtn: elements.eventGraphAddRuleBtn,
      pickTemplateBtn: elements.eventGraphPickTemplateBtn,
      templatePicker: elements.eventGraphTemplatePicker,
      templateBtns: elements.eventGraphTemplateBtns ?? [],
      ruleList: elements.eventGraphRuleList,
      statusEl: elements.eventGraphStatus,
    },
    async (cmd, payload) => {
      if (cmd === "entity_attach_graph") {
        return await attachEntityGraph(payload.entity_id, payload.graph);
      }
      return null;
    },
  );

  const scriptTemplatesController = createScriptTemplatesController({
    elements: {
      scriptGraphInput: elements.scriptGraphInput,
      scriptTemplateSelect: elements.scriptTemplateSelect,
      scriptTemplateUseBtn: elements.scriptTemplateUseBtn,
      scriptTemplateSaveBtn: elements.scriptTemplateSaveBtn,
      scriptTemplateDeleteBtn: elements.scriptTemplateDeleteBtn,
      scriptTemplateNameInput: elements.scriptTemplateNameInput,
    },
    state,
    render: callbacks.render,
    log: callbacks.log,
  });

  scriptLabController = createScriptLabController({
    elements: {
      scriptGraphInput: elements.scriptGraphInput,
      scriptValidateBtn: elements.scriptValidateBtn,
      scriptValidationSummary: elements.scriptValidationSummary,
    },
    state,
    render: callbacks.render,
    log: callbacks.log,
  });

  const preferencesController = createPreferencesController({
    elements: {
      uiProfileSelect: elements.uiProfileSelect,
      themeSelect: elements.themeSelect,
      densitySelect: elements.densitySelect,
    },
    render: callbacks.render,
    log: callbacks.log,
  });

  const layoutPanelsController = createLayoutPanelsController({
    elements: {
      toggleLeftPanelBtn: elements.panelToggleLeftBtn,
      toggleRightPanelBtn: elements.panelToggleRightBtn,
      rightTabs: elements.rightPanelTabs,
      rightTabButtons: elements.rightPanelTabButtons,
      rightTabSections: elements.rightPanelSections,
    },
    render: callbacks.render,
    log: callbacks.log,
  });

  const animationTransitionsController = createAnimationTransitionsController({
    elements: {
      animationTransitionList: elements.animationTransitionList,
      animationTransitionAddBtn: elements.animationTransitionAddBtn,
      animationTransitionSaveBtn: elements.animationTransitionSaveBtn,
      animationTransitionFromInput: elements.animationTransitionFromInput,
      animationTransitionToInput: elements.animationTransitionToInput,
      animationTransitionKindSelect: elements.animationTransitionKindSelect,
      animationTransitionStatus: elements.animationTransitionStatus,
    },
    state,
    render: callbacks.render,
    log: callbacks.log,
  });

  const flipbookStudioController = createFlipbookStudioController({
    elements: {
      flipbookSummary: elements.flipbookSummary,
      flipbookClipSelect: elements.flipbookClipSelect,
      flipbookFrameDurationInput: elements.flipbookFrameDurationInput,
      flipbookLoopModeSelect: elements.flipbookLoopModeSelect,
      flipbookClipAddBtn: elements.flipbookClipAddBtn,
      flipbookClipRenameBtn: elements.flipbookClipRenameBtn,
      flipbookClipDeleteBtn: elements.flipbookClipDeleteBtn,
      flipbookFrameStrip: elements.flipbookFrameStrip,
      flipbookScrubInput: elements.flipbookScrubInput,
      flipbookScrubLabel: elements.flipbookScrubLabel,
      flipbookFrameAddBtn: elements.flipbookFrameAddBtn,
      flipbookFrameRemoveBtn: elements.flipbookFrameRemoveBtn,
      flipbookFrameDuplicateBtn: elements.flipbookFrameDuplicateBtn,
      flipbookFrameLeftBtn: elements.flipbookFrameLeftBtn,
      flipbookFrameRightBtn: elements.flipbookFrameRightBtn,
      flipbookPreviewToggleBtn: elements.flipbookPreviewToggleBtn,
      flipbookStatus: elements.flipbookStatus,
    },
    state,
    render: callbacks.render,
    log: callbacks.log,
  });

  const commandBarController = createCommandBarController({
    elements: {
      commandButtons: elements.topbarCommandButtons,
    },
    state,
    render: callbacks.render,
    log: callbacks.log,
    togglePlaytest: callbacks.togglePlaytest,
    getNewProjectTemplate: () =>
      /** @type {HTMLSelectElement | null} */ (elements.newProjectTemplateSelect)?.value || "rpg",
    applyStarterScriptForTemplate: async (template) =>
      scriptTemplatesController.applyStarterScriptForTemplate(template),
  });

  const editorInputController = createEditorInputController({
    elements: {
      commandButtons: elements.commandButtons,
      toolButtons: elements.toolButtons,
    },
    state,
    mapInteractionController,
    render: callbacks.render,
    togglePlaytest: callbacks.togglePlaytest,
  });

  const onboardingController = createOnboardingController({
    elements: {
      onboardingStatus: elements.onboardingStatus,
      onboardingHint: elements.onboardingHint,
      onboardingChecklist: elements.onboardingChecklist,
    },
    state,
    render: callbacks.render,
    mapInteractionController,
    newProjectTemplateSelect: elements.newProjectTemplateSelect,
    buildAssistedGuardrail: (snapshot) => callbacks.resolveAssistedGuardrail(snapshot),
    applyStarterScriptForTemplate: (templateKey) =>
      scriptTemplatesController.applyStarterScriptForTemplate(templateKey),
  });

  const walkthroughController = createWalkthroughController({
    elements: {
      walkthroughSelect: elements.walkthroughSelect,
      walkthroughStartBtn: elements.walkthroughStartBtn,
      walkthroughRunStepBtn: elements.walkthroughRunStepBtn,
      walkthroughStatus: elements.walkthroughStatus,
      walkthroughSteps: elements.walkthroughSteps,
      walkthroughFocusHint: elements.walkthroughFocusHint,
      walkthroughFocusTitle: elements.walkthroughFocusTitle,
      walkthroughFocusWhy: elements.walkthroughFocusWhy,
      walkthroughFocusExpected: elements.walkthroughFocusExpected,
    },
    runOnboardingAction: onboardingController.runOnboardingAction,
    enterPlaytest: async () => {
      if (!state.snapshot().playtest.active) {
        await state.enterPlaytest();
      }
    },
    exportPreview: async () => {
      await state.exportPreview("export-artifacts/html5-preview", "game_boy");
    },
    render: callbacks.render,
    log: callbacks.log,
  });

  const helpTourController = createHelpTourController({
    elements: {
      helpToggleBtn: elements.helpToggleBtn,
      helpOverlay: elements.helpOverlay,
      helpContext: elements.helpContext,
      helpList: elements.helpList,
      helpTourStartBtn: elements.helpTourStartBtn,
      helpTourPrevBtn: elements.helpTourPrevBtn,
      helpTourNextBtn: elements.helpTourNextBtn,
      helpTourDoBtn: elements.helpTourDoBtn,
      helpTourStopBtn: elements.helpTourStopBtn,
      helpTourStatus: elements.helpTourStatus,
    },
    render: callbacks.render,
    state,
    runOnboardingAction: onboardingController.runOnboardingAction,
    steps: helpTourSteps,
  });

  const playtestController = createPlaytestController({
    elements: {
      playtestViewportWrap: elements.playtestViewportWrap,
      playtestViewport: elements.playtestViewport,
      tileLayer: elements.tileLayer,
      entityLayer: elements.entityLayer,
      marqueeBox: elements.marqueeBox,
      playtestOverlay: elements.playtestOverlay,
      playtestPauseBtn: elements.playtestPauseBtn,
      playtestStepBtn: elements.playtestStepBtn,
      playtestSpeed1xBtn: elements.playtestSpeed1xBtn,
      playtestSpeedHalfBtn: elements.playtestSpeedHalfBtn,
      playtestSpeedQuarterBtn: elements.playtestSpeedQuarterBtn,
      playtestZoomFitBtn: elements.playtestZoomFitBtn,
      playtestZoom2xBtn: elements.playtestZoom2xBtn,
      playtestZoom3xBtn: elements.playtestZoom3xBtn,
      playtestZoom4xBtn: elements.playtestZoom4xBtn,
      playtestTraceBtn: elements.playtestTraceBtn,
      breakpointTickBtn: elements.breakpointTickBtn,
      breakpointItemBtn: elements.breakpointItemBtn,
      breakpointQuestBtn: elements.breakpointQuestBtn,
      playtestExitBtn: elements.playtestExitBtn,
      playtestMetricFrame: elements.playtestMetricFrame,
      playtestMetricDelta: elements.playtestMetricDelta,
      playtestMetricSteps: elements.playtestMetricSteps,
      playtestMetricBreak: elements.playtestMetricBreak,
      playtestMetricFeedback: elements.playtestMetricFeedback,
    },
    state,
    render: callbacks.render,
    log: callbacks.log,
    onToggleBreakpoint: (kind) => callbacks.toggleBreakpoint(kind),
    onPlaytestEntered: () => callbacks.markPlaytestEntered?.(),
    onPlaytestFirstFrame: () => callbacks.markPlaytestFirstFrame?.(),
    onPlaytestMetricUpdate: () => callbacks.markPlaytestMetricUpdate?.(),
    onPlaytestExited: () => callbacks.resetPlaytestMetrics?.(),
  });

  const debugPanelsController = createDebugPanelsController({
    elements: {
      traceLines: elements.traceLines,
      traceFilters: elements.traceFilters,
      watchSelected: elements.watchSelected,
      watchFlags: elements.watchFlags,
      watchFilterAllBtn: elements.watchFilterAllBtn,
      watchFilterFlagsBtn: elements.watchFilterFlagsBtn,
      watchFilterVarsBtn: elements.watchFilterVarsBtn,
      watchFilterInventoryBtn: elements.watchFilterInventoryBtn,
      issuesList: elements.issuesList,
    },
    render: callbacks.render,
  });

  issuesRecoveryController = createIssuesRecoveryController({
    elements: {
      assistedProfileSelect: elements.assistedProfileSelect,
    },
    state,
    drawSeedController,
    debugPanelsController,
    render: callbacks.render,
  });

  const workspaceBindingsController = createWorkspaceBindingsController({
    elements: {
      issuesList: elements.issuesList,
      entityList: elements.entityList,
      inspectorNameInput: /** @type {HTMLInputElement | null} */ (elements.inspectorNameInput),
    },
    state,
    render: callbacks.render,
    getIssuesRecoveryController: () => issuesRecoveryController,
    getScriptLabController: () => scriptLabController,
  });

  helpTourController.bindEvents();
  mapViewportController.bindEvents();
  mapInteractionController.bindEvents();
  onboardingController.bindEvents();
  walkthroughController.bindEvents();
  playtestController.bindUiEvents();
  debugPanelsController.bindEvents();
  scriptTemplatesController.bindEvents();
  scriptLabController.bindEvents();
  eventGraphController.bindEvents();
  preferencesController.bindEvents();
  layoutPanelsController.bindEvents();
  animationTransitionsController.bindEvents();
  flipbookStudioController.bindEvents();
  commandBarController.bindEvents();
  editorInputController.bindEvents();
  drawAssistControlsController.bindEvents();
  workspaceBindingsController.bindEvents();

  scriptTemplatesController.init();
  drawSeedController.refreshPresetOptions();
  callbacks.log("Editor workspace initialized.");

  controllerBundle.issuesRecoveryController = issuesRecoveryController;
  controllerBundle.drawSeedController = drawSeedController;
  controllerBundle.drawAssistControlsController = drawAssistControlsController;
  controllerBundle.mapViewportController = mapViewportController;
  controllerBundle.mapInteractionController = mapInteractionController;
  controllerBundle.canvasRendererController = canvasRendererController;
  controllerBundle.scriptTemplatesController = scriptTemplatesController;
  controllerBundle.scriptLabController = scriptLabController;
  controllerBundle.preferencesController = preferencesController;
  controllerBundle.layoutPanelsController = layoutPanelsController;
  controllerBundle.animationTransitionsController = animationTransitionsController;
  controllerBundle.flipbookStudioController = flipbookStudioController;
  controllerBundle.commandBarController = commandBarController;
  controllerBundle.editorInputController = editorInputController;
  controllerBundle.onboardingController = onboardingController;
  controllerBundle.walkthroughController = walkthroughController;
  controllerBundle.helpTourController = helpTourController;
  controllerBundle.playtestController = playtestController;
  controllerBundle.debugPanelsController = debugPanelsController;
  controllerBundle.entityListController = entityListController;
  controllerBundle.workspaceBindingsController = workspaceBindingsController;
  controllerBundle.eventGraphController = eventGraphController;

  // Tile palette picker
  if (elements.tilePaletteSwatches) {
    for (const swatch of elements.tilePaletteSwatches) {
      swatch.addEventListener("click", () => {
        const id = Number(swatch.dataset.tileId);
        if (!id) return;
        mapInteractionController.setActiveTileId(id);
        for (const s of elements.tilePaletteSwatches) {
          s.classList.toggle("active", s === swatch);
        }
      });
    }
  }

  // Export panel
  if (elements.exportRunBtn) {
    elements.exportRunBtn.addEventListener("click", async () => {
      const profile = elements.exportProfileSelect?.value || "game_boy";
      const debug = !!elements.exportDebugCheck?.checked;
      const statusEl = elements.exportStatus;
      if (statusEl) statusEl.textContent = "Exporting...";
      try {
        const outputDir = "export-output";
        await state.exportPreview(outputDir, profile, debug);
        if (statusEl) statusEl.textContent = "Export complete!";
      } catch (err) {
        if (statusEl) statusEl.textContent = `Export failed: ${err.message || err}`;
      }
    });
  }

  // Audio routing
  if (elements.audioBindingAddBtn) {
    elements.audioBindingAddBtn.addEventListener("click", () => {
      const eventVal = elements.audioEventInput?.value || "";
      const clipVal = (elements.audioClipInput?.value || "").trim();
      if (!eventVal || !clipVal) {
        if (elements.audioRoutingStatus) elements.audioRoutingStatus.textContent = "Both event and clip ID required.";
        return;
      }
      if (state.addAudioBinding) {
        state.addAudioBinding(eventVal, clipVal);
      }
      if (elements.audioClipInput) elements.audioClipInput.value = "";
      if (elements.audioRoutingStatus) elements.audioRoutingStatus.textContent = `Bound ${eventVal} \u2192 ${clipVal}`;
    });
  }

  // Render audio bindings list
  if (state.events && elements.audioBindingsList) {
    const renderAudioBindings = (snap) => {
      const bindings = snap.audioBindings || {};
      const entries = Object.entries(bindings);
      if (entries.length === 0) {
        const empty = document.createElement("p");
        empty.className = "audio-bindings-empty";
        empty.textContent = "No audio bindings. Add one below or define in script graph.";
        elements.audioBindingsList.replaceChildren(empty);
        return;
      }
      elements.audioBindingsList.replaceChildren(
        ...entries.map(([event, clipId]) => {
          const row = document.createElement("div");
          row.className = "audio-binding-row";
          const evSpan = document.createElement("span");
          evSpan.className = "audio-binding-event";
          evSpan.textContent = event;
          const arrow = document.createElement("span");
          arrow.className = "audio-binding-arrow";
          arrow.textContent = "\u2192";
          const clipSpan = document.createElement("span");
          clipSpan.className = "audio-binding-clip";
          clipSpan.textContent = clipId;
          const btn = document.createElement("button");
          btn.className = "audio-binding-remove danger";
          btn.dataset.event = event;
          btn.title = "Remove";
          btn.textContent = "\u00d7";
          btn.addEventListener("click", () => {
            if (state.removeAudioBinding) state.removeAudioBinding(event);
          });
          row.append(evSpan, arrow, clipSpan, btn);
          return row;
        })
      );
    };
    state.events.on("audio:bindings-updated", renderAudioBindings);
  }

  // Scene management
  if (elements.sceneAddBtn) {
    elements.sceneAddBtn.addEventListener("click", async () => {
      const input = elements.sceneNameInput;
      const rawName = (input?.value || "").trim();
      if (!rawName) return;
      const id = rawName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
      if (!id) return;
      if (state.addScene) {
        await state.addScene(id, rawName);
      }
      if (input) input.value = "";
    });
  }

  // Render scene list on updates
  if (state.events && elements.sceneList) {
    state.events.on("scenes:updated", (snap) => {
      const list = elements.sceneList;
      const scenes = snap.scenes || [];
      if (scenes.length === 0) {
        const empty = document.createElement("li");
        empty.className = "scene-empty";
        empty.textContent = "No scenes yet.";
        list.replaceChildren(empty);
        return;
      }
      list.replaceChildren(
        ...scenes.map((s) => {
          const active = s.id === snap.activeSceneId;
          const li = document.createElement("li");
          li.className = `scene-item${active ? " active" : ""}`;
          li.dataset.sceneId = s.id;
          const selectBtn = document.createElement("button");
          selectBtn.className = "scene-select-btn";
          selectBtn.dataset.sceneId = s.id;
          selectBtn.textContent = s.name;
          selectBtn.addEventListener("click", async () => {
            if (state.switchScene) await state.switchScene(s.id);
          });
          const removeBtn = document.createElement("button");
          removeBtn.className = "scene-remove-btn danger";
          removeBtn.dataset.sceneId = s.id;
          removeBtn.title = "Remove";
          removeBtn.textContent = "\u00d7";
          removeBtn.addEventListener("click", async () => {
            if (state.removeScene) await state.removeScene(s.id);
          });
          li.append(selectBtn, removeBtn);
          return li;
        })
      );
    });
  }

  // Component inspector on selection change
  if (state.events && elements.componentDetails) {
    const collisionInputs = [
      elements.compCollisionSolidInput,
      elements.compCollisionWidth,
      elements.compCollisionHeight,
      elements.compCollisionOffsetX,
      elements.compCollisionOffsetY,
      elements.compCollisionSave,
    ];

    const setCollisionInputsDisabled = (disabled) => {
      for (const input of collisionInputs) {
        if (input) {
          input.disabled = disabled;
        }
      }
    };

    const toInteger = (value, fallback = 0) => {
      const parsed = Number.parseInt(String(value ?? ""), 10);
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    state.events.on("components:updated", (snap) => {
      const comp = snap.selectedComponents;
      if (!comp) {
        elements.componentDetails.hidden = true;
        if (elements.componentEmpty) elements.componentEmpty.hidden = false;
        if (elements.componentStatus) {
          elements.componentStatus.textContent = "Select one entity to edit components.";
        }
        return;
      }
      elements.componentDetails.hidden = false;
      if (elements.componentEmpty) elements.componentEmpty.hidden = true;

      // Collision
      const col = /** @type {{ solid: boolean, width: number, height: number, offset_x: number, offset_y: number } | undefined} */ (comp.collision);
      if (elements.componentCollisionSection) elements.componentCollisionSection.hidden = false;
      if (col) {
        if (elements.compCollisionEnabled) elements.compCollisionEnabled.checked = true;
        if (elements.compCollisionSolidInput) elements.compCollisionSolidInput.checked = !!col.solid;
        if (elements.compCollisionWidth) elements.compCollisionWidth.value = String(col.width ?? 16);
        if (elements.compCollisionHeight) elements.compCollisionHeight.value = String(col.height ?? 16);
        if (elements.compCollisionOffsetX) elements.compCollisionOffsetX.value = String(col.offset_x ?? 0);
        if (elements.compCollisionOffsetY) elements.compCollisionOffsetY.value = String(col.offset_y ?? 0);
      } else if (elements.compCollisionEnabled) {
        elements.compCollisionEnabled.checked = false;
      }
      setCollisionInputsDisabled(!(elements.compCollisionEnabled?.checked));
      if (elements.componentStatus) elements.componentStatus.textContent = "Ready.";

      // Sprite
      const spr = /** @type {{ asset_id: string, frame: number } | undefined} */ (comp.sprite);
      if (elements.componentSpriteSection) elements.componentSpriteSection.hidden = !spr;
      if (spr) {
        if (elements.compSpriteAsset) elements.compSpriteAsset.textContent = spr.asset_id;
        if (elements.compSpriteFrame) elements.compSpriteFrame.textContent = String(spr.frame);
      }

      // Movement / Velocity
      if (elements.componentMovementSection) elements.componentMovementSection.hidden = !comp.has_movement;
      if (elements.componentVelocitySection) elements.componentVelocitySection.hidden = !comp.has_velocity;
    });

    // Fetch components when selection changes
    state.events.on("editor:state-updated", async (_snap) => {
      if (state.fetchSelectedComponents) {
        await state.fetchSelectedComponents();
      }
    });

    if (elements.compCollisionEnabled) {
      elements.compCollisionEnabled.addEventListener("change", () => {
        setCollisionInputsDisabled(!elements.compCollisionEnabled.checked);
      });
    }

    if (elements.compCollisionSave) {
      elements.compCollisionSave.addEventListener("click", async () => {
        if (!state.setSelectedEntityComponents) {
          return;
        }
        const snap = state.snapshot();
        const selectedId = snap.selection?.[0];
        if (snap.selection.length !== 1 || !selectedId) {
          if (elements.componentStatus) {
            elements.componentStatus.textContent = "Select exactly one entity.";
          }
          return;
        }
        const selectedEntity = snap.entities.find((entity) => entity.id === selectedId);
        const nextComponents = JSON.parse(JSON.stringify(selectedEntity?.components || {}));
        if (elements.compCollisionEnabled?.checked) {
          nextComponents.collision = {
            solid: !!elements.compCollisionSolidInput?.checked,
            width: Math.max(1, toInteger(elements.compCollisionWidth?.value, 16)),
            height: Math.max(1, toInteger(elements.compCollisionHeight?.value, 16)),
            offset_x: toInteger(elements.compCollisionOffsetX?.value, 0),
            offset_y: toInteger(elements.compCollisionOffsetY?.value, 0),
          };
        } else {
          delete nextComponents.collision;
        }
        if (elements.componentStatus) {
          elements.componentStatus.textContent = "Saving...";
        }
        await state.setSelectedEntityComponents(nextComponents);
        if (elements.componentStatus) {
          elements.componentStatus.textContent = "Collision updated.";
        }
      });
    }
  }

  return controllerBundle;
}

