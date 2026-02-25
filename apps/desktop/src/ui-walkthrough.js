const WALKTHROUGHS = {
  zelda_room: {
    title: "Zelda-like Room",
    steps: [
      {
        label: "Scaffold RPG starter room",
        action: "new_rpg",
        why: "Start from a playable baseline instead of a blank canvas.",
        expected: "Starter room appears with baseline entities and tiles.",
      },
      {
        label: "Add one interactable object",
        action: "add_entity",
        why: "Interaction hotspots make the room feel alive.",
        expected: "Map Entities list shows one additional entity.",
      },
      {
        label: "Paint one navigation tile",
        action: "paint_tile",
        why: "A traversable path communicates movement intention.",
        expected: "At least one map tile appears on the surface.",
      },
      {
        label: "Run playtest once",
        action: "playtest",
        why: "Validate the gameplay loop while context is fresh.",
        expected: "HUD switches from Edit to Playtest mode.",
      },
      {
        label: "Save your walkthrough build",
        action: "save_project",
        why: "Lock in progress before iterating further.",
        expected: "Log reports project saved.",
      },
    ],
  },
  chrono_town: {
    title: "Chrono-style Town",
    steps: [
      {
        label: "Scaffold RPG starter town",
        action: "new_rpg",
        why: "Town scenes benefit from a stable base layout first.",
        expected: "Starter town scene is loaded.",
      },
      {
        label: "Add an NPC hotspot",
        action: "add_entity",
        why: "NPC interaction is core to town storytelling.",
        expected: "Entity list increments with new hotspot/NPC anchor.",
      },
      {
        label: "Paint a plaza tile",
        action: "paint_tile",
        why: "Ground detail improves scene readability.",
        expected: "One plaza/path tile is visible in map canvas.",
      },
      {
        label: "Run playtest once",
        action: "playtest",
        why: "Check pacing and navigability immediately.",
        expected: "Playtest controls appear and mode changes.",
      },
      {
        label: "Save your walkthrough build",
        action: "save_project",
        why: "Capture the town baseline before adding complexity.",
        expected: "Save confirmation appears in Log Console.",
      },
    ],
  },
  platformer_room: {
    title: "Platformer Room",
    steps: [
      {
        label: "Scaffold platformer starter room",
        action: "new_platformer",
        why: "Platforming layout is fastest to iterate from a seeded room.",
        expected: "Starter platform room loads with base floor.",
      },
      {
        label: "Add one extra gameplay object",
        action: "add_entity",
        why: "Extra objects create player goals/obstacles.",
        expected: "Entity list includes one new object.",
      },
      {
        label: "Paint one additional platform tile",
        action: "paint_tile",
        why: "Tile changes define jump rhythm and route choices.",
        expected: "Additional tile appears in map surface.",
      },
      {
        label: "Run playtest once",
        action: "playtest",
        why: "Confirm jump/path readability before expanding.",
        expected: "Playtest mode starts successfully.",
      },
      {
        label: "Save your walkthrough build",
        action: "save_project",
        why: "Preserve a stable checkpoint before tuning.",
        expected: "Project save is logged as successful.",
      },
    ],
  },
  puzzle_room: {
    title: "Sokoban-style Puzzle Room",
    steps: [
      {
        label: "Scaffold puzzle starter room",
        action: "new_puzzle",
        why: "Start with puzzle-focused map and logic baseline.",
        expected: "Puzzle starter map loads with player and puzzle tiles.",
      },
      {
        label: "Add one crate or blocker entity",
        action: "add_entity",
        why: "Puzzle loops need movable/blocking objects.",
        expected: "Entity list shows one additional object.",
      },
      {
        label: "Paint one target tile",
        action: "paint_tile",
        why: "Goals must be visible and reachable.",
        expected: "At least one additional tile appears on the map.",
      },
      {
        label: "Run playtest once",
        action: "playtest",
        why: "Validate movement and puzzle loop immediately.",
        expected: "Playtest starts and HUD mode switches.",
      },
      {
        label: "Save your walkthrough build",
        action: "save_project",
        why: "Lock puzzle baseline before adding more levels.",
        expected: "Project save is logged.",
      },
    ],
  },
};

function walkthroughSelectorForAction(action) {
  if (action === "new_rpg" || action === "new_platformer" || action === "new_puzzle") {
    return ".topbar button[data-command='new']";
  }
  if (action === "add_entity") {
    return "#map-create";
  }
  if (action === "paint_tile") {
    return "#tool-paint";
  }
  if (action === "playtest") {
    return ".topbar button[data-command='play']";
  }
  if (action === "save_project") {
    return ".topbar button[data-command='save']";
  }
  return "";
}

export function createWalkthroughController({
  elements,
  runOnboardingAction,
  enterPlaytest,
  exportPreview,
  render,
  log,
}) {
  let activeWalkthroughId = "";
  let walkthroughActive = false;
  let walkthroughCompletedActions = new Set();
  let walkthroughFocusedElement = null;
  let walkthroughFocusStep = null;
  let eventsBound = false;
  const listeners = [];

  function requestRender() {
    if (typeof render === "function") {
      render();
    }
  }

  function addListener(target, event, handler) {
    if (!target) {
      return;
    }
    target.addEventListener(event, handler);
    listeners.push(() => target.removeEventListener(event, handler));
  }

  function selectedKey() {
    return activeWalkthroughId || elements.walkthroughSelect?.value || "zelda_room";
  }

  function activeDefinition() {
    return WALKTHROUGHS[selectedKey()] || null;
  }

  function clearWalkthroughFocus() {
    if (walkthroughFocusedElement instanceof HTMLElement) {
      walkthroughFocusedElement.classList.remove("tour-focus");
    }
    walkthroughFocusedElement = null;
    walkthroughFocusStep = null;
  }

  function renderWalkthroughFocusHint() {
    if (
      !elements.walkthroughFocusHint ||
      !elements.walkthroughFocusTitle ||
      !elements.walkthroughFocusWhy ||
      !elements.walkthroughFocusExpected
    ) {
      return;
    }
    if (!(walkthroughFocusedElement instanceof HTMLElement) || !walkthroughFocusStep) {
      elements.walkthroughFocusHint.hidden = true;
      return;
    }

    const rect = walkthroughFocusedElement.getBoundingClientRect();
    const left = Math.min(window.innerWidth - 340, Math.max(8, rect.left));
    const top = Math.min(window.innerHeight - 150, Math.max(8, rect.bottom + 8));
    elements.walkthroughFocusHint.style.left = `${left}px`;
    elements.walkthroughFocusHint.style.top = `${top}px`;
    elements.walkthroughFocusTitle.textContent = walkthroughFocusStep.label || "Current step";
    elements.walkthroughFocusWhy.textContent = `Why: ${walkthroughFocusStep.why || "Build toward a playable loop."}`;
    elements.walkthroughFocusExpected.textContent = `Expected: ${walkthroughFocusStep.expected || "Visible state change in editor."}`;
    elements.walkthroughFocusHint.hidden = false;
  }

  function focusWalkthroughControl(selector, step = null) {
    clearWalkthroughFocus();
    if (!selector) {
      return;
    }
    const target = document.querySelector(selector);
    if (!(target instanceof HTMLElement)) {
      return;
    }
    target.classList.add("tour-focus");
    target.scrollIntoView({ block: "nearest", inline: "nearest" });
    walkthroughFocusedElement = target;
    walkthroughFocusStep = step;
    if (elements.walkthroughStatus) {
      const label = target.textContent?.trim() || selector;
      elements.walkthroughStatus.textContent = `Focused control: ${label}`;
    }
    renderWalkthroughFocusHint();
  }

  function nextWalkthroughStep() {
    const def = activeDefinition();
    if (!def) {
      return null;
    }
    return def.steps.find((step) => !walkthroughCompletedActions.has(step.action)) || null;
  }

  function focusCurrentWalkthroughStep() {
    const step = nextWalkthroughStep();
    if (!step) {
      clearWalkthroughFocus();
      renderWalkthroughFocusHint();
      return;
    }
    const selector = step.selector || walkthroughSelectorForAction(step.action);
    focusWalkthroughControl(selector, step);
  }

  function startWalkthrough(key) {
    const def = WALKTHROUGHS[key];
    if (!def) {
      return;
    }
    activeWalkthroughId = key;
    walkthroughActive = true;
    walkthroughCompletedActions = new Set();
    clearWalkthroughFocus();
    focusCurrentWalkthroughStep();
  }

  async function runActiveWalkthroughStep() {
    if (!walkthroughActive) {
      return;
    }
    const step = nextWalkthroughStep();
    const action = step?.action || null;
    if (!action) {
      walkthroughActive = false;
      return;
    }
    await runOnboardingAction(action);
    walkthroughCompletedActions.add(action);
    focusCurrentWalkthroughStep();
  }

  async function runWalkthroughCompletionAction(action) {
    if (action === "playtest") {
      await enterPlaytest();
      return;
    }
    if (action === "export_preview") {
      await exportPreview();
      return;
    }
    if (action === "restart") {
      startWalkthrough(selectedKey());
    }
  }

  async function handleStepsClick(targetNode) {
    const target =
      targetNode instanceof HTMLElement
        ? targetNode
        : targetNode instanceof globalThis.Node
          ? targetNode.parentElement
          : null;
    if (!(target instanceof HTMLElement)) {
      return false;
    }
    const actionBtn = target.closest("[data-walkthrough-action]");
    if (actionBtn instanceof HTMLElement) {
      const action = actionBtn.getAttribute("data-walkthrough-action");
      if (!action) {
        return false;
      }
      await runWalkthroughCompletionAction(action);
      return true;
    }
    const focusBtn = target.closest("[data-walkthrough-focus]");
    if (!(focusBtn instanceof HTMLElement)) {
      return false;
    }
    const selector = focusBtn.getAttribute("data-walkthrough-focus");
    if (!selector) {
      return false;
    }
    const def = activeDefinition();
    const step = def?.steps?.find(
      (item) => (item.selector || walkthroughSelectorForAction(item.action)) === selector
    );
    focusWalkthroughControl(selector, step || null);
    return true;
  }

  function renderWalkthrough() {
    if (
      !elements.walkthroughStatus ||
      !elements.walkthroughSteps ||
      !elements.walkthroughRunStepBtn ||
      !elements.walkthroughStartBtn
    ) {
      return;
    }
    const def = activeDefinition();
    if (!def) {
      elements.walkthroughStatus.textContent = "Walkthrough unavailable.";
      const emptyRow = document.createElement("li");
      emptyRow.textContent = "No walkthrough steps found.";
      elements.walkthroughSteps.replaceChildren(emptyRow);
      elements.walkthroughRunStepBtn.disabled = true;
      return;
    }

    const completed = def.steps.filter((step) =>
      walkthroughCompletedActions.has(step.action)
    ).length;
    const defaultStatus = walkthroughActive
      ? `${def.title}: Step ${Math.min(completed + 1, def.steps.length)}/${def.steps.length}`
      : "Walkthrough idle.";
    elements.walkthroughStatus.textContent = defaultStatus;

    const rows = document.createDocumentFragment();
    def.steps.forEach((step) => {
      const row = document.createElement("li");
      if (walkthroughCompletedActions.has(step.action)) {
        row.classList.add("done");
      }

      const labelRow = document.createElement("div");
      labelRow.textContent = `${walkthroughCompletedActions.has(step.action) ? "[Done] " : "[Next] "}${step.label}`;
      row.append(labelRow);

      const actionRow = document.createElement("div");
      const selector = step.selector || walkthroughSelectorForAction(step.action);
      if (selector) {
        const focusButton = document.createElement("button");
        focusButton.className = "onboarding-action-btn";
        focusButton.setAttribute("data-walkthrough-focus", selector);
        focusButton.textContent = "Show Me";
        actionRow.append(focusButton);
      }
      row.append(actionRow);

      const whyRow = document.createElement("div");
      whyRow.className = "walkthrough-meta";
      const whyStrong = document.createElement("strong");
      whyStrong.textContent = "Why:";
      whyRow.append(whyStrong, ` ${step.why || "Build toward a playable loop."}`);
      row.append(whyRow);

      const expectRow = document.createElement("div");
      expectRow.className = "walkthrough-meta";
      const expectStrong = document.createElement("strong");
      expectStrong.textContent = "Expected:";
      expectRow.append(expectStrong, ` ${step.expected || "Visible state change in editor."}`);
      row.append(expectRow);

      rows.append(row);
    });
    elements.walkthroughSteps.replaceChildren(rows);

    const allDone = completed >= def.steps.length;
    if (allDone) {
      elements.walkthroughStatus.textContent = `${def.title}: Complete.`;
      walkthroughActive = false;
      const nextRow = document.createElement("li");
      nextRow.className = "done";
      const nextLabel = document.createElement("strong");
      nextLabel.textContent = "Next:";
      nextRow.append(nextLabel, " Try the result in playtest.");
      elements.walkthroughSteps.append(nextRow);

      const actionRow = document.createElement("li");
      const playtestButton = document.createElement("button");
      playtestButton.className = "onboarding-action-btn";
      playtestButton.setAttribute("data-walkthrough-action", "playtest");
      playtestButton.textContent = "Playtest";
      const exportButton = document.createElement("button");
      exportButton.className = "onboarding-action-btn";
      exportButton.setAttribute("data-walkthrough-action", "export_preview");
      exportButton.textContent = "Export Preview (Authored)";
      const restartButton = document.createElement("button");
      restartButton.className = "onboarding-action-btn";
      restartButton.setAttribute("data-walkthrough-action", "restart");
      restartButton.textContent = "Start Over";
      actionRow.append(playtestButton, " ", exportButton, " ", restartButton);
      elements.walkthroughSteps.append(actionRow);
    } else if (walkthroughFocusedElement instanceof HTMLElement) {
      const label = walkthroughFocusedElement.textContent?.trim() || "control";
      elements.walkthroughStatus.textContent = `Focused control: ${label}`;
    }
    elements.walkthroughRunStepBtn.disabled = !walkthroughActive || allDone;
    elements.walkthroughStartBtn.disabled = walkthroughActive && !allDone;
    renderWalkthroughFocusHint();
  }

  function bindEvents() {
    if (eventsBound) {
      return;
    }
    eventsBound = true;

    addListener(elements.walkthroughStartBtn, "click", () => {
      const key = elements.walkthroughSelect?.value || "zelda_room";
      startWalkthrough(key);
      requestRender();
    });

    addListener(elements.walkthroughRunStepBtn, "click", async () => {
      await runActiveWalkthroughStep();
      requestRender();
    });

    addListener(elements.walkthroughSteps, "click", (event) => {
      handleStepsClick(event.target)
        .then((handled) => {
          if (handled) {
            requestRender();
          }
        })
        .catch((error) => {
          if (typeof log === "function") {
            log(`Walkthrough action failed: ${error?.message || String(error)}`);
          }
        });
    });
  }

  function dispose() {
    listeners.forEach((unsubscribe) => unsubscribe());
    listeners.length = 0;
    eventsBound = false;
    clearWalkthroughFocus();
    renderWalkthroughFocusHint();
  }

  return {
    bindEvents,
    dispose,
    startWalkthrough,
    runActiveWalkthroughStep,
    handleStepsClick,
    renderWalkthrough,
  };
}
