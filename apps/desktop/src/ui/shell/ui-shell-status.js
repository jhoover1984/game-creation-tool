/** @typedef {import("../../types.js").EditorSnapshot} EditorSnapshot */

/**
 * @typedef {{
 *   isPlaytest: boolean,
 *   isPaused: boolean,
 *   playSpeed: number,
 *   activeTool: string,
 *   helpVisible: boolean
 * }} ShellStatusInput
 */

/**
 * @param {EditorSnapshot} snapshot
 * @param {ShellStatusInput} input
 */
export function buildShellStatusModel(snapshot, input) {
  const isPlaytest = !!input.isPlaytest;
  const selectionCount = snapshot.selection?.length || 0;
  const runtimeIsDesktop = snapshot.runtimeMode === "desktop_local";
  return {
    commandDisabled: {
      undo: !snapshot.canUndo,
      redo: !snapshot.canRedo,
      move: isPlaytest || selectionCount === 0,
      delete: isPlaytest || selectionCount === 0,
      reselect: isPlaytest,
      create: isPlaytest,
    },
    toolDisabled: {
      select: isPlaytest,
      paint: isPlaytest,
      erase: isPlaytest,
      fill: isPlaytest,
    },
    activeTool: input.activeTool || "select",
    playButtonLabel: isPlaytest ? "Exit Playtest" : "Playtest",
    hudModeText: isPlaytest
      ? `Playtest (${input.isPaused ? "Paused" : `${input.playSpeed}x`})`
      : "Edit",
    hudToolText: `Tool: ${input.activeTool}`,
    hudSelectionText: `Selected: ${selectionCount}`,
    runtimeModeText: runtimeIsDesktop ? "Desktop Local" : "Web Mode",
    runtimeIsDesktop,
    helpVisible: !!input.helpVisible,
  };
}

/**
 * @typedef {{
 *   commandButtons: {
 *     undo: HTMLButtonElement,
 *     redo: HTMLButtonElement,
 *     move: HTMLButtonElement,
 *     delete: HTMLButtonElement,
 *     reselect: HTMLButtonElement,
 *     create: HTMLButtonElement
 *   },
 *   toolButtons: {
 *     select: HTMLButtonElement | null,
 *     paint: HTMLButtonElement | null,
 *     erase: HTMLButtonElement | null
 *   },
 *   playButton: HTMLButtonElement | null,
 *   hudMode: HTMLElement | null,
 *   hudTool: HTMLElement | null,
 *   hudSelection: HTMLElement | null,
 *   runtimeModeBadge: HTMLElement | null,
 *   helpToggleBtn: HTMLButtonElement | null
 * }} ShellStatusElements
 */

/**
 * @param {{
 *   elements: ShellStatusElements,
 *   capitalize: (value: string) => string
 * }} deps
 */
export function createShellStatusController({ elements, capitalize }) {
  /**
   * @param {EditorSnapshot} snapshot
   * @param {ShellStatusInput & {
   *   mapViewportController?: { renderViewport?: (snapshot: EditorSnapshot) => void } | null,
   *   preferencesController?: { applyUiProfile?: () => void } | null,
   *   layoutPanelsController?: { renderLayout?: () => void } | null
   * }} input
   */
  function renderStatus(snapshot, input) {
    const activeTool = input.activeTool || "select";
    const model = buildShellStatusModel(snapshot, {
      ...input,
      activeTool,
    });

    elements.commandButtons.undo.disabled = model.commandDisabled.undo;
    elements.commandButtons.redo.disabled = model.commandDisabled.redo;
    elements.commandButtons.move.disabled = model.commandDisabled.move;
    elements.commandButtons.delete.disabled = model.commandDisabled.delete;
    elements.commandButtons.reselect.disabled = model.commandDisabled.reselect;
    elements.commandButtons.create.disabled = model.commandDisabled.create;

    elements.toolButtons.select &&
      (elements.toolButtons.select.disabled = model.toolDisabled.select);
    elements.toolButtons.paint && (elements.toolButtons.paint.disabled = model.toolDisabled.paint);
    elements.toolButtons.erase && (elements.toolButtons.erase.disabled = model.toolDisabled.erase);
    elements.toolButtons.fill && (elements.toolButtons.fill.disabled = model.toolDisabled.fill);

    elements.toolButtons.select?.classList.toggle("active", activeTool === "select");
    elements.toolButtons.paint?.classList.toggle("active", activeTool === "paint");
    elements.toolButtons.erase?.classList.toggle("active", activeTool === "erase");
    elements.toolButtons.fill?.classList.toggle("active", activeTool === "fill");

    if (elements.playButton) {
      elements.playButton.textContent = model.playButtonLabel;
    }
    if (elements.hudMode) {
      elements.hudMode.textContent = model.hudModeText;
    }
    if (elements.hudTool) {
      elements.hudTool.textContent = `Tool: ${capitalize(activeTool)}`;
    }
    if (elements.hudSelection) {
      elements.hudSelection.textContent = model.hudSelectionText;
    }
    if (elements.runtimeModeBadge) {
      elements.runtimeModeBadge.textContent = model.runtimeModeText;
      elements.runtimeModeBadge.classList.toggle("desktop", model.runtimeIsDesktop);
    }
    elements.helpToggleBtn?.classList.toggle("active", model.helpVisible);
    input.mapViewportController?.renderViewport?.(snapshot);
    input.preferencesController?.applyUiProfile?.();
    input.layoutPanelsController?.renderLayout?.();
  }

  function dispose() {
    // No listeners in this controller.
  }

  return {
    dispose,
    renderStatus,
  };
}


