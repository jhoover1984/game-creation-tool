const SCRIPT_TEMPLATE_STORAGE_KEY = "gcs.script_templates.v1";

const SCRIPT_TEMPLATE_BUILTIN = {
  starter_event: {
    title: "Starter Event",
    graph: {
      nodes: [
        { id: "event_start", kind: "event" },
        { id: "action_spawn", kind: "action" },
      ],
      edges: [{ from: "event_start", to: "action_spawn" }],
    },
  },
  quest_trigger: {
    title: "Quest Trigger",
    graph: {
      nodes: [
        { id: "event_interact", kind: "event" },
        { id: "cond_has_key", kind: "condition" },
        { id: "action_set_quest", kind: "action" },
      ],
      edges: [
        { from: "event_interact", to: "cond_has_key" },
        { from: "cond_has_key", to: "action_set_quest" },
      ],
    },
  },
  item_pickup: {
    title: "Item Pickup",
    graph: {
      nodes: [
        { id: "event_overlap_item", kind: "event" },
        { id: "action_add_item", kind: "action" },
        { id: "action_flag_pickup", kind: "action" },
      ],
      edges: [
        { from: "event_overlap_item", to: "action_add_item" },
        { from: "action_add_item", to: "action_flag_pickup" },
      ],
    },
  },
  entity_chest_give_item: {
    title: "Chest: Give Item",
    graph: {
      nodes: [
        { id: "trigger_interact", kind: "event", behavior: { type: "on_interact" } },
        { id: "action_open", kind: "action", behavior: { type: "set_entity_state", entity_id: "", state: "open" } },
        { id: "action_give", kind: "action", behavior: { type: "give_item", item_id: "key" } },
        { id: "action_msg", kind: "action", behavior: { type: "show_message", text: "You got the Key!" } },
      ],
      edges: [
        { from: "trigger_interact", to: "action_open" },
        { from: "action_open", to: "action_give" },
        { from: "action_give", to: "action_msg" },
      ],
    },
  },
  entity_door_require_item: {
    title: "Door: Require Item",
    graph: {
      nodes: [
        { id: "trigger_interact", kind: "event", behavior: { type: "on_interact" } },
        { id: "cond_has_key", kind: "condition", behavior: { type: "has_item", item_id: "key" } },
        { id: "action_open", kind: "action", behavior: { type: "set_entity_state", entity_id: "", state: "open" } },
        { id: "action_msg_open", kind: "action", behavior: { type: "show_message", text: "Door unlocked!" } },
        { id: "action_msg_locked", kind: "action", behavior: { type: "show_message", text: "It's locked. You need a key." } },
      ],
      edges: [
        { from: "trigger_interact", to: "cond_has_key" },
        { from: "cond_has_key", to: "action_open", label: "true" },
        { from: "action_open", to: "action_msg_open" },
        { from: "cond_has_key", to: "action_msg_locked", label: "false" },
      ],
    },
  },
  entity_npc_greeting: {
    title: "NPC: Simple Greeting",
    graph: {
      nodes: [
        { id: "trigger_interact", kind: "event", behavior: { type: "on_interact" } },
        { id: "action_greet", kind: "action", behavior: { type: "show_message", text: "Hello, traveler!" } },
      ],
      edges: [{ from: "trigger_interact", to: "action_greet" }],
    },
  },
  sokoban_push_rules: {
    title: "Sokoban Push Rules",
    graph: {
      nodes: [
        { id: "event_move_input", kind: "event" },
        { id: "flow_branch_walkable", kind: "flow" },
        { id: "cond_next_tile_walkable", kind: "condition" },
        { id: "cond_next_tile_has_crate", kind: "condition" },
        { id: "cond_crate_target_free", kind: "condition" },
        { id: "action_push_crate", kind: "action" },
        { id: "action_move_player", kind: "action" },
        { id: "action_check_goals", kind: "action" },
        { id: "cond_all_crates_on_goal", kind: "condition" },
        { id: "action_level_complete", kind: "action" },
      ],
      edges: [
        { from: "event_move_input", to: "flow_branch_walkable" },
        { from: "flow_branch_walkable", to: "cond_next_tile_walkable" },
        { from: "cond_next_tile_walkable", to: "action_move_player" },
        { from: "flow_branch_walkable", to: "cond_next_tile_has_crate" },
        { from: "cond_next_tile_has_crate", to: "cond_crate_target_free" },
        { from: "cond_crate_target_free", to: "action_push_crate" },
        { from: "action_push_crate", to: "action_move_player" },
        { from: "action_move_player", to: "action_check_goals" },
        { from: "action_check_goals", to: "cond_all_crates_on_goal" },
        { from: "cond_all_crates_on_goal", to: "action_level_complete" },
      ],
    },
  },
};

const STARTER_TEMPLATE_BY_PROJECT = {
  rpg: "quest_trigger",
  platformer: "item_pickup",
  puzzle: "sokoban_push_rules",
};

export function createScriptTemplatesController({ elements, state, render, log }) {
  let scriptTemplates = {};
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

  function writeLocalStorageValueSafe(storageKey, value) {
    if (typeof window === "undefined" || !window.localStorage) {
      return false;
    }
    try {
      window.localStorage.setItem(storageKey, value);
      return true;
    } catch (error) {
      const quotaExceeded =
        error && typeof error === "object" && error.name === "QuotaExceededError";
      const reason = quotaExceeded ? "storage quota exceeded" : "storage unavailable";
      log(`Local preference save skipped: ${reason}.`);
      return false;
    }
  }

  function readCustomScriptTemplates() {
    if (typeof window === "undefined" || !window.localStorage) {
      return {};
    }
    try {
      const raw = window.localStorage.getItem(SCRIPT_TEMPLATE_STORAGE_KEY);
      if (!raw) {
        return {};
      }
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function writeCustomScriptTemplates(templates) {
    writeLocalStorageValueSafe(SCRIPT_TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
  }

  function selectedScriptTemplateKey() {
    return elements.scriptTemplateSelect?.value || "starter_event";
  }

  function syncTemplateDeleteButton() {
    if (!elements.scriptTemplateDeleteBtn) {
      return;
    }
    elements.scriptTemplateDeleteBtn.disabled = !selectedScriptTemplateKey().startsWith("custom_");
  }

  function refreshTemplateOptions() {
    if (!elements.scriptTemplateSelect) {
      return;
    }
    scriptTemplates = {
      ...SCRIPT_TEMPLATE_BUILTIN,
      ...readCustomScriptTemplates(),
    };
    const existing = elements.scriptTemplateSelect.value;
    const options = Object.entries(scriptTemplates).map(([key, entry]) => {
      const title = entry?.title || key;
      const customMark = key.startsWith("custom_") ? " (Custom)" : "";
      const option = document.createElement("option");
      option.value = key;
      option.textContent = `${title}${customMark}`;
      return option;
    });
    elements.scriptTemplateSelect.replaceChildren(...options);
    if (scriptTemplates[existing]) {
      elements.scriptTemplateSelect.value = existing;
    } else if (scriptTemplates.starter_event) {
      elements.scriptTemplateSelect.value = "starter_event";
    }
    syncTemplateDeleteButton();
  }

  async function applyTemplateByKey(templateKey, { logApply = true, rerender = true } = {}) {
    if (!elements.scriptGraphInput) {
      return;
    }
    const key = templateKey || selectedScriptTemplateKey();
    const template = scriptTemplates[key];
    if (!template || !template.graph) {
      log("Template not found.");
      return;
    }
    if (elements.scriptTemplateSelect) {
      elements.scriptTemplateSelect.value = key;
      syncTemplateDeleteButton();
    }
    elements.scriptGraphInput.value = JSON.stringify(template.graph, null, 2);
    await state.validateScriptGraphInput(elements.scriptGraphInput.value);
    if (logApply) {
      log(`Script template applied: ${template.title || key}`);
    }
    if (rerender) {
      requestRender();
    }
  }

  async function saveScriptTemplateFromInput() {
    if (
      !elements.scriptTemplateNameInput ||
      !elements.scriptGraphInput ||
      !elements.scriptTemplateSelect
    ) {
      return;
    }
    const rawName = elements.scriptTemplateNameInput.value.trim();
    if (!rawName) {
      log("Template save failed: name is required.");
      return;
    }
    let graph;
    try {
      graph = JSON.parse(elements.scriptGraphInput.value);
    } catch (error) {
      log(`Template save failed: invalid JSON (${error?.message || String(error)}).`);
      return;
    }

    const slug = rawName
      .toLowerCase()
      .replaceAll(/[^a-z0-9_ -]/g, "")
      .replaceAll(/[ -]+/g, "_")
      .replaceAll(/^_+|_+$/g, "");
    if (!slug) {
      log("Template save failed: name must include letters or numbers.");
      return;
    }

    const key = `custom_${slug}`;
    const custom = readCustomScriptTemplates();
    custom[key] = { title: rawName, graph };
    writeCustomScriptTemplates(custom);
    refreshTemplateOptions();
    elements.scriptTemplateSelect.value = key;
    elements.scriptTemplateNameInput.value = "";
    syncTemplateDeleteButton();
    log(`Script template saved: ${rawName}`);
  }

  async function deleteSelectedCustomTemplate() {
    const key = selectedScriptTemplateKey();
    if (!key.startsWith("custom_")) {
      return;
    }
    const custom = readCustomScriptTemplates();
    delete custom[key];
    writeCustomScriptTemplates(custom);
    refreshTemplateOptions();
    log(`Script template deleted: ${key}`);
    await applyTemplateByKey(selectedScriptTemplateKey());
  }

  async function applyStarterScriptForTemplate(templateKey) {
    const scriptTemplateKey = STARTER_TEMPLATE_BY_PROJECT[templateKey];
    if (!scriptTemplateKey || !elements.scriptGraphInput) {
      return;
    }
    if (!scriptTemplates[scriptTemplateKey]) {
      refreshTemplateOptions();
    }
    await applyTemplateByKey(scriptTemplateKey, { logApply: false, rerender: false });
  }

  function init() {
    refreshTemplateOptions();
    if (elements.scriptGraphInput && !elements.scriptGraphInput.value.trim()) {
      const starter = scriptTemplates.starter_event?.graph;
      if (starter) {
        elements.scriptGraphInput.value = JSON.stringify(starter, null, 2);
      }
    }
  }

  function bindEvents() {
    if (eventsBound) {
      return;
    }
    eventsBound = true;

    addListener(elements.scriptTemplateUseBtn, "click", async () => {
      await applyTemplateByKey(selectedScriptTemplateKey());
    });

    addListener(elements.scriptTemplateSaveBtn, "click", async () => {
      await saveScriptTemplateFromInput();
    });

    addListener(elements.scriptTemplateDeleteBtn, "click", async () => {
      await deleteSelectedCustomTemplate();
    });

    addListener(elements.scriptTemplateSelect, "change", () => {
      syncTemplateDeleteButton();
    });
  }

  function dispose() {
    listeners.forEach((unsubscribe) => unsubscribe());
    listeners.length = 0;
    eventsBound = false;
  }

  return {
    init,
    bindEvents,
    dispose,
    applyStarterScriptForTemplate,
  };
}
