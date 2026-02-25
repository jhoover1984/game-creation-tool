export function createHelpTourController({ elements, render, state, runOnboardingAction, steps }) {
  let helpVisible = false;
  let helpTourActive = false;
  let helpTourStepIndex = 0;
  let helpTourFocusedElement = null;
  let helpTourCompleted = false;
  let helpSummaryStatus = "";
  let eventsBound = false;
  const listeners = [];

  const requestRender = () => {
    if (typeof render === "function") {
      render();
    }
  };

  function addListener(target, event, handler) {
    if (!target) {
      return;
    }
    target.addEventListener(event, handler);
    listeners.push(() => target.removeEventListener(event, handler));
  }

  function clearHelpTourFocus() {
    if (helpTourFocusedElement instanceof HTMLElement) {
      helpTourFocusedElement.classList.remove("tour-focus");
    }
    helpTourFocusedElement = null;
  }

  function syncHelpTourFocus() {
    clearHelpTourFocus();
    if (!helpTourActive) {
      return;
    }
    const step = steps[helpTourStepIndex];
    if (!step?.selector) {
      return;
    }
    const target = document.querySelector(step.selector);
    if (!(target instanceof HTMLElement)) {
      return;
    }
    target.classList.add("tour-focus");
    target.scrollIntoView({ block: "nearest", inline: "nearest" });
    helpTourFocusedElement = target;
  }

  function startHelpTour() {
    helpVisible = true;
    helpTourActive = true;
    helpTourStepIndex = 0;
    helpTourCompleted = false;
    helpSummaryStatus = "";
    syncHelpTourFocus();
  }

  function stopHelpTour() {
    helpTourActive = false;
    helpTourStepIndex = 0;
    clearHelpTourFocus();
  }

  async function runHelpTourAction() {
    if (!helpTourActive) {
      return;
    }
    const step = steps[helpTourStepIndex];
    const action = step?.action;
    if (!action) {
      return;
    }
    await runOnboardingAction(action);
    if (!helpTourActive) {
      return;
    }
    if (helpTourStepIndex >= steps.length - 1) {
      helpTourCompleted = true;
      stopHelpTour();
      return;
    }
    helpTourStepIndex += 1;
    syncHelpTourFocus();
  }

  async function runHelpSummaryAction(action) {
    if (action === "playtest_again") {
      if (!state.snapshot().playtest.active) {
        helpSummaryStatus = "Playtest started from tour summary.";
        requestRender();
        await state.enterPlaytest();
      } else {
        helpSummaryStatus = "Playtest is already running.";
      }
      requestRender();
      return;
    }

    if (action === "export_preview") {
      if (!state.snapshot().exportPreviewReport) {
        helpSummaryStatus = "Export preview generated.";
        requestRender();
        await state.exportPreview("export-artifacts/html5-preview", "game_boy");
      } else {
        helpSummaryStatus = "Export preview already exists for this session.";
      }
      requestRender();
    }
  }

  function bindEvents() {
    if (eventsBound) {
      return;
    }
    eventsBound = true;

    addListener(elements.helpToggleBtn, "click", () => {
      helpVisible = !helpVisible;
      if (!helpVisible) {
        stopHelpTour();
      }
      requestRender();
    });

    addListener(elements.helpTourStartBtn, "click", () => {
      startHelpTour();
      requestRender();
    });

    addListener(elements.helpTourPrevBtn, "click", () => {
      if (!helpTourActive) {
        return;
      }
      helpTourStepIndex = Math.max(0, helpTourStepIndex - 1);
      syncHelpTourFocus();
      requestRender();
    });

    addListener(elements.helpTourNextBtn, "click", () => {
      if (!helpTourActive) {
        return;
      }
      if (helpTourStepIndex >= steps.length - 1) {
        helpTourCompleted = true;
        stopHelpTour();
        requestRender();
        return;
      }
      helpTourStepIndex += 1;
      syncHelpTourFocus();
      requestRender();
    });

    addListener(elements.helpTourDoBtn, "click", async () => {
      await runHelpTourAction();
      requestRender();
    });

    addListener(elements.helpTourStopBtn, "click", () => {
      stopHelpTour();
      requestRender();
    });

    addListener(elements.helpList, "click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const actionTarget = target.closest("[data-help-summary-action]");
      if (!(actionTarget instanceof HTMLElement)) {
        return;
      }
      const action = actionTarget.getAttribute("data-help-summary-action");
      if (!action) {
        return;
      }
      await runHelpSummaryAction(action);
    });
  }

  function renderHelpOverlay(snapshot) {
    if (
      !elements.helpOverlay ||
      !elements.helpContext ||
      !elements.helpList ||
      !elements.helpTourStatus ||
      !elements.helpTourStartBtn ||
      !elements.helpTourPrevBtn ||
      !elements.helpTourNextBtn ||
      !elements.helpTourDoBtn ||
      !elements.helpTourStopBtn
    ) {
      return;
    }

    elements.helpOverlay.hidden = !helpVisible;
    if (!helpVisible) {
      return;
    }

    const playtestActive = !!snapshot.playtest?.active;
    const tips = playtestActive
      ? {
          title: "Playtest Help",
          rows: [
            "Use Pause/Resume to inspect behavior between frames.",
            "Use Step to advance one frame when paused.",
            "Toggle Trace to inspect recent runtime events.",
            "Use BP Tick / BP Item / BP Quest to pause on runtime events.",
            "Press Esc to exit Playtest quickly.",
          ],
        }
      : {
          title: "Map Help",
          rows: [
            "Use Add Entity to place gameplay objects.",
            "Use Select tool for click, drag, and marquee selection.",
            "Use Paint Tile / Erase Tile for map block layout.",
            "Use Undo/Redo to recover from edits quickly.",
            "Press B, E, V to switch tools from keyboard.",
          ],
        };

    if (helpTourActive) {
      const step = steps[helpTourStepIndex];
      if (step) {
        elements.helpContext.textContent = "Guided Tour";
        elements.helpTourStatus.textContent = `Step ${helpTourStepIndex + 1}/${steps.length}: ${step.title}`;
        const rows = document.createDocumentFragment();
        const doRow = document.createElement("li");
        const doLabel = document.createElement("strong");
        doLabel.textContent = "Do this:";
        doRow.append(doLabel, ` ${step.message}`);
        rows.append(doRow);
        const expectedRow = document.createElement("li");
        const expectedLabel = document.createElement("strong");
        expectedLabel.textContent = "Expected:";
        expectedRow.append(expectedLabel, " Focus highlight appears on the required control.");
        rows.append(expectedRow);
        elements.helpList.replaceChildren(rows);
      }
    } else if (helpTourCompleted) {
      elements.helpContext.textContent = "Guided Tour";
      elements.helpTourStatus.textContent =
        helpSummaryStatus || "Tour complete. Choose a next action:";
      const playtestDisabled = !!snapshot.playtest?.active;
      const exportDisabled = !!snapshot.exportPreviewReport;
      const playtestLabel = playtestDisabled ? "Playtest Running" : "Playtest Again";
      const exportLabel = exportDisabled ? "Export Preview Ready" : "Export Preview";
      const rows = document.createDocumentFragment();
      const summaryRow = document.createElement("li");
      const strong = document.createElement("strong");
      strong.textContent = "Nice work.";
      summaryRow.append(strong, " You completed the first-run guided tour.");
      rows.append(summaryRow);

      const playtestRow = document.createElement("li");
      const playtestButton = document.createElement("button");
      playtestButton.setAttribute("data-help-summary-action", "playtest_again");
      playtestButton.disabled = playtestDisabled;
      playtestButton.textContent = playtestLabel;
      playtestRow.append(playtestButton);
      rows.append(playtestRow);

      const exportRow = document.createElement("li");
      const exportButton = document.createElement("button");
      exportButton.setAttribute("data-help-summary-action", "export_preview");
      exportButton.disabled = exportDisabled;
      exportButton.textContent = exportLabel;
      exportRow.append(exportButton);
      rows.append(exportRow);
      elements.helpList.replaceChildren(rows);
    } else {
      elements.helpContext.textContent = tips.title;
      elements.helpTourStatus.textContent = "Tour idle.";
      const rows = document.createDocumentFragment();
      tips.rows.forEach((rowText) => {
        const row = document.createElement("li");
        row.textContent = rowText;
        rows.append(row);
      });
      elements.helpList.replaceChildren(rows);
    }

    elements.helpTourStartBtn.disabled = helpTourActive;
    elements.helpTourPrevBtn.disabled = !helpTourActive || helpTourStepIndex === 0;
    elements.helpTourNextBtn.disabled = !helpTourActive;
    elements.helpTourDoBtn.disabled = !helpTourActive;
    elements.helpTourStopBtn.disabled = !helpTourActive;
    syncHelpTourFocus();
  }

  function dispose() {
    stopHelpTour();
    while (listeners.length > 0) {
      const remove = listeners.pop();
      remove?.();
    }
    eventsBound = false;
  }

  return {
    bindEvents,
    dispose,
    isVisible: () => helpVisible,
    renderHelpOverlay,
  };
}
