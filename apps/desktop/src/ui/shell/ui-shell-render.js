import { buildHealthIssuesModel } from "../../ui-health-issues.js";

/**
 * @typedef {import("../../types.js").EditorSnapshot} EditorSnapshot
 * @typedef {import("../../ui-assisted-guardrail.js").AssistedGuardrail} AssistedGuardrail
 */

/**
 * @param {EditorSnapshot} snapshot
 * @param {{
 *   projectTitle: HTMLElement | null,
 *   inspectorNameInput: HTMLInputElement | null,
 *   healthSummary: HTMLElement | null,
 *   controllers: {
 *     issuesRecoveryController: { renderIssues?: (snapshot: EditorSnapshot, issues: unknown[]) => void } | null,
 *     scriptLabController: { renderValidationSummary?: (snapshot: EditorSnapshot) => void } | null,
 *     entityListController: { renderEntityList?: (snapshot: EditorSnapshot) => void } | null,
 *     canvasRendererController: { render?: (snapshot: EditorSnapshot) => void } | null,
 *     mapInteractionController: { renderMarquee?: () => void, getActiveTool?: () => string } | null,
 *     playtestController: { renderPlaytest?: (snapshot: EditorSnapshot) => void } | null,
 *     debugPanelsController: { renderTrace?: (snapshot: EditorSnapshot) => void, renderWatch?: (snapshot: EditorSnapshot) => void } | null,
 *     onboardingController: { render?: (snapshot: EditorSnapshot) => void } | null,
 *     walkthroughController: { renderWalkthrough?: (snapshot: EditorSnapshot) => void } | null,
 *     helpTourController: { renderHelpOverlay?: (snapshot: EditorSnapshot) => void, isVisible?: () => boolean } | null,
 *     drawSeedController: { renderDraftPreview?: () => void } | null,
 *     shellStatusController: {
 *       renderStatus?: (
 *         snapshot: EditorSnapshot,
 *         context: {
 *           activeTool: string,
 *           helpVisible: boolean,
 *           isPaused: boolean,
 *           isPlaytest: boolean,
 *           layoutPanelsController: unknown,
 *           mapViewportController: unknown,
 *           playSpeed: number,
 *           preferencesController: unknown
 *         }
 *       ) => void
 *     } | null,
 *     layoutPanelsController: unknown,
 *     mapViewportController: unknown,
 *     preferencesController: unknown
 *   },
 *   resolveAssistedGuardrail: (snapshot: EditorSnapshot) => AssistedGuardrail
 * }} deps
 */
export function renderEditorWorkspace(
  snapshot,
  { projectTitle, inspectorNameInput, healthSummary, controllers, resolveAssistedGuardrail }
) {
  if (projectTitle) {
    projectTitle.textContent = snapshot.projectName || "Starter Town";
  }
  if (
    inspectorNameInput &&
    (typeof document === "undefined" || document.activeElement !== inspectorNameInput)
  ) {
    const selectedEntity =
      snapshot.selection?.length === 1
        ? snapshot.entities?.find((e) => e.id === snapshot.selection[0])
        : null;
    inspectorNameInput.value = selectedEntity ? selectedEntity.name : "";
    inspectorNameInput.placeholder = selectedEntity ? "Entity name" : "No entity selected";
    inspectorNameInput.disabled = !selectedEntity;
  }
  const isPlaytest = !!snapshot.playtest?.active;
  const playSpeed = snapshot.playtest?.speed ?? 1;
  const isPaused = !!snapshot.playtest?.paused;

  const healthModel = buildHealthIssuesModel(snapshot, resolveAssistedGuardrail(snapshot));
  if (healthSummary) {
    healthSummary.textContent = healthModel.healthText;
  }
  controllers.issuesRecoveryController?.renderIssues?.(snapshot, healthModel.issues);

  controllers.scriptLabController?.renderValidationSummary?.(snapshot);
  controllers.entityListController?.renderEntityList?.(snapshot);
  controllers.canvasRendererController?.render?.(snapshot);
  controllers.mapInteractionController?.renderMarquee?.();

  const canvasEmptyState =
    typeof document !== "undefined" ? document.getElementById("canvas-empty-state") : null;
  if (canvasEmptyState) {
    const hasContent =
      (snapshot.entities?.length ?? 0) > 0 || (snapshot.tiles?.length ?? 0) > 0;
    canvasEmptyState.style.display = hasContent || isPlaytest ? "none" : "";
  }
  controllers.playtestController?.renderPlaytest?.(snapshot);
  controllers.debugPanelsController?.renderTrace?.(snapshot);
  controllers.debugPanelsController?.renderWatch?.(snapshot);
  controllers.onboardingController?.render?.(snapshot);
  controllers.walkthroughController?.renderWalkthrough?.(snapshot);
  controllers.helpTourController?.renderHelpOverlay?.(snapshot);
  controllers.drawSeedController?.renderDraftPreview?.();

  const activeTool = controllers.mapInteractionController?.getActiveTool?.() || "select";
  controllers.shellStatusController?.renderStatus?.(snapshot, {
    activeTool,
    helpVisible: controllers.helpTourController?.isVisible?.() || false,
    isPaused,
    isPlaytest,
    layoutPanelsController: controllers.layoutPanelsController,
    mapViewportController: controllers.mapViewportController,
    playSpeed,
    preferencesController: controllers.preferencesController,
  });
}


