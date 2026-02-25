const CHECKS = [
  {
    label: "Choose a starter template and click New",
    action: "new_rpg",
    actionLabel: "Use RPG Starter",
    hint: "Click Use RPG Starter to scaffold a starter map and script.",
    expect: "You should see starter entities and tiles appear immediately.",
  },
  {
    label: "Place at least one entity",
    action: "add_entity",
    actionLabel: "Add Entity",
    hint: "Click Add Entity to place a game object on the map.",
    expect: "Map Entities should list at least one entry.",
  },
  {
    label: "Paint at least one tile",
    action: "paint_tile",
    actionLabel: "Paint Tile",
    hint: "Click Paint Tile to stamp a starter tile at the top-left cell.",
    expect: "The map surface should show at least one filled tile.",
  },
  {
    label: "Run Playtest once",
    action: "playtest",
    actionLabel: "Start Playtest",
    hint: "Click Start Playtest to verify your game loop is running.",
    expect: "HUD mode should switch to Playtest.",
  },
  {
    label: "Save your project",
    action: "save_project",
    actionLabel: "Save Project",
    hint: "Click Save Project so your current starter build is persisted.",
    expect: "Log Console should report Project saved.",
  },
];

export function createOnboardingController({
  elements,
  state,
  render,
  mapInteractionController,
  newProjectTemplateSelect,
  buildAssistedGuardrail,
  applyStarterScriptForTemplate,
}) {
  let onboardingTemplateChosen = false;
  let onboardingPlaytested = false;
  let onboardingSaved = false;
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

  function bindEvents() {
    if (eventsBound) {
      return;
    }
    eventsBound = true;
    addListener(elements.onboardingChecklist, "click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const actionTarget = target.closest("[data-onboarding-action]");
      if (!(actionTarget instanceof HTMLElement)) {
        return;
      }
      const action = actionTarget.getAttribute("data-onboarding-action");
      if (!action) {
        return;
      }
      await runOnboardingAction(action);
    });
  }

  function dispose() {
    listeners.forEach((unsubscribe) => unsubscribe());
    listeners.length = 0;
    eventsBound = false;
  }

  function onProjectNew() {
    onboardingTemplateChosen = true;
    onboardingPlaytested = false;
    onboardingSaved = false;
  }

  function onPlaytestChanged(snapshot) {
    if (snapshot?.playtest?.active) {
      onboardingPlaytested = true;
    }
  }

  function onProjectSaved() {
    onboardingSaved = true;
  }

  function completeForCheck(check, snapshot) {
    if (check.action === "new_rpg") {
      return onboardingTemplateChosen;
    }
    if (check.action === "add_entity") {
      return (snapshot.entities || []).length > 0;
    }
    if (check.action === "paint_tile") {
      return (snapshot.tiles || []).length > 0;
    }
    if (check.action === "playtest") {
      return onboardingPlaytested;
    }
    if (check.action === "save_project") {
      return onboardingSaved;
    }
    return false;
  }

  function renderOnboarding(snapshot) {
    if (!elements.onboardingChecklist || !elements.onboardingStatus || !elements.onboardingHint) {
      return;
    }

    const checks = CHECKS.map((item) => ({
      ...item,
      complete: completeForCheck(item, snapshot),
    }));
    const completed = checks.filter((item) => item.complete).length;
    elements.onboardingStatus.textContent =
      completed === checks.length
        ? "Quick Start complete. Keep building or export when ready."
        : `Quick Start progress: ${completed}/${checks.length}`;

    const next = checks.find((item) => !item.complete);
    const assistedGuardrail =
      typeof buildAssistedGuardrail === "function" ? buildAssistedGuardrail(snapshot) : { tip: "" };
    const baseHint = next
      ? `Tip: ${next.hint} Expected: ${next.expect}`
      : "Tip: Great job. Continue iterating, then export when your loop feels right.";

    elements.onboardingHint.textContent = assistedGuardrail.tip
      ? `${baseHint} Guardrail: ${assistedGuardrail.tip}`
      : baseHint;

    const listFragment = document.createDocumentFragment();
    checks.forEach((item) => {
      const row = document.createElement("li");
      row.className = item.complete ? "complete" : "pending";
      row.append(`${item.complete ? "[Done] " : "[Next] "}${item.label}`);
      if (!item.complete) {
        row.append(" ");
        const button = document.createElement("button");
        button.className = "onboarding-action-btn";
        button.setAttribute("data-onboarding-action", item.action);
        button.textContent = item.actionLabel;
        row.append(button);
      }
      listFragment.append(row);
    });
    elements.onboardingChecklist.replaceChildren(listFragment);
  }

  async function runOnboardingAction(action) {
    if (action === "select_template_rpg") {
      if (newProjectTemplateSelect) {
        newProjectTemplateSelect.value = "rpg";
      }
      requestRender();
      return;
    }

    if (action === "new_rpg") {
      if (newProjectTemplateSelect) {
        newProjectTemplateSelect.value = "rpg";
      }
      await state.newProjectFromTemplate("rpg");
      await applyStarterScriptForTemplate("rpg");
      requestRender();
      return;
    }

    if (action === "new_platformer") {
      if (newProjectTemplateSelect) {
        newProjectTemplateSelect.value = "platformer";
      }
      await state.newProjectFromTemplate("platformer");
      await applyStarterScriptForTemplate("platformer");
      requestRender();
      return;
    }

    if (action === "new_puzzle") {
      if (newProjectTemplateSelect) {
        newProjectTemplateSelect.value = "puzzle";
      }
      await state.newProjectFromTemplate("puzzle");
      await applyStarterScriptForTemplate("puzzle");
      requestRender();
      return;
    }

    if (action === "add_entity") {
      await state.addEntity();
      requestRender();
      return;
    }

    if (action === "paint_tile") {
      if (state.snapshot().playtest.active) {
        await state.exitPlaytest();
      }
      if (typeof mapInteractionController?.setTool === "function") {
        mapInteractionController.setTool("paint");
      }
      await state.paintTileAt(0, 0, 1);
      requestRender();
      return;
    }

    if (action === "playtest") {
      if (!state.snapshot().playtest.active) {
        await state.enterPlaytest();
        requestRender();
      }
      return;
    }

    if (action === "save_project") {
      await state.save();
      requestRender();
    }
  }

  return {
    bindEvents,
    dispose,
    render: renderOnboarding,
    runOnboardingAction,
    onProjectNew,
    onPlaytestChanged,
    onProjectSaved,
  };
}
