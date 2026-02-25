/**
 * Event Sheet UI Controller — S4-EG1
 *
 * GDevelop-style event sheet (list view) for per-entity script graphs.
 * Each "rule" = one Event trigger + connected Condition nodes + Action nodes.
 * No canvas drag-drop — beginner-first, row-based layout.
 *
 * @module ui-event-graph
 */

// ---------------------------------------------------------------------------
// Entity-level starter templates (Zelda demo loop)
// ---------------------------------------------------------------------------

/** @type {Record<string, { title: string, graph: { nodes: Array<object>, edges: Array<object> } }>} */
export const ENTITY_TEMPLATES = {
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
};

// ---------------------------------------------------------------------------
// Graph parsing — convert flat node/edge list into rule rows
// ---------------------------------------------------------------------------

/**
 * Parse a ScriptGraph into display rules.
 * Each rule has one event-kind trigger, zero or more conditions, and zero or
 * more actions — determined by BFS from that trigger node.
 *
 * @param {{ nodes: Array<object>, edges: Array<object> }} graph
 * @returns {Array<{ trigger: object, conditions: object[], actions: object[] }>}
 */
function parseRules(graph) {
  if (!graph || !Array.isArray(graph.nodes)) return [];
  /** @type {Record<string, Array<{ to: string, label: string|null }>>} */
  const adjacent = {};
  for (const edge of graph.edges || []) {
    if (!adjacent[edge.from]) adjacent[edge.from] = [];
    adjacent[edge.from].push({ to: edge.to, label: edge.label ?? null });
  }
  /** @type {Record<string, object>} */
  const nodeById = {};
  for (const node of graph.nodes) nodeById[node.id] = node;

  const rules = [];
  for (const node of graph.nodes) {
    if (node.kind !== "event") continue;
    /** @type {{ trigger: object, conditions: object[], actions: object[] }} */
    const rule = { trigger: node, conditions: [], actions: [] };
    const queue = [node.id];
    const visited = new Set([node.id]);
    while (queue.length > 0) {
      const id = queue.shift();
      for (const { to } of adjacent[id] ?? []) {
        if (visited.has(to)) continue;
        visited.add(to);
        const target = nodeById[to];
        if (!target) continue;
        if (target.kind === "condition") rule.conditions.push(target);
        else if (target.kind === "action") rule.actions.push(target);
        queue.push(to);
      }
    }
    rules.push(rule);
  }
  return rules;
}

// ---------------------------------------------------------------------------
// Human-readable labels for each behavior type
// ---------------------------------------------------------------------------

/**
 * @param {object} node
 * @returns {string}
 */
function behaviorLabel(node) {
  const b = node.behavior;
  if (!b) return node.id;
  switch (b.type) {
    case "on_interact":
      return "Player interacts with entity";
    case "on_event":
      return `Event: "${b.event}"`;
    case "check_flag":
      return `Flag "${b.flag}" is ${b.expected}`;
    case "has_item":
      return `Has item "${b.item_id}"`;
    case "set_flag":
      return `Set flag "${b.flag}" \u2192 ${b.value}`;
    case "set_variable":
      return `Set "${b.variable}" \u2192 ${b.value}`;
    case "give_item":
      return `Give item "${b.item_id}"`;
    case "remove_item":
      return `Remove item "${b.item_id}"`;
    case "set_entity_state":
      return b.entity_id
        ? `Set "${b.entity_id}" state \u2192 "${b.state}"`
        : `Set entity state \u2192 "${b.state}"`;
    case "show_message":
      return `Show: "${b.text}"`;
    case "change_scene":
      return `Change scene \u2192 "${b.target_scene}"`;
    case "play_audio":
      return `Play audio "${b.audio_id}"`;
    case "log_message":
      return `Log: "${b.message}"`;
    default:
      return String(b.type ?? node.id);
  }
}

// ---------------------------------------------------------------------------
// DOM helpers — never use innerHTML
// ---------------------------------------------------------------------------

/**
 * @param {string} tag
 * @param {string} [cls]
 * @param {string} [text]
 * @returns {HTMLElement}
 */
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== null && text !== undefined) e.textContent = text;
  return e;
}

/**
 * Render one rule row into a <li>.
 *
 * @param {{ trigger: object, conditions: object[], actions: object[] }} rule
 * @param {number} index
 * @returns {HTMLLIElement}
 */
function renderRuleRow(rule, index) {
  const li = /** @type {HTMLLIElement} */ (el("li", "event-rule"));
  li.dataset.ruleIndex = String(index);

  // Condition column
  const condCol = el("div", "event-rule-conditions");
  condCol.appendChild(el("span", "event-rule-trigger", behaviorLabel(rule.trigger)));
  for (const cond of rule.conditions) {
    condCol.appendChild(el("span", "event-rule-condition-chip", behaviorLabel(cond)));
  }

  // Action column
  const actCol = el("div", "event-rule-actions");
  if (rule.actions.length === 0) {
    actCol.appendChild(el("span", "event-rule-empty-hint", "(no actions yet)"));
  } else {
    for (const action of rule.actions) {
      actCol.appendChild(el("span", "event-rule-action-chip", behaviorLabel(action)));
    }
  }

  li.appendChild(condCol);
  li.appendChild(actCol);
  return li;
}

// ---------------------------------------------------------------------------
// Controller factory
// ---------------------------------------------------------------------------

/**
 * @typedef {{
 *   addRuleBtn: HTMLElement | null,
 *   pickTemplateBtn: HTMLElement | null,
 *   templatePicker: HTMLElement | null,
 *   templateBtns: HTMLElement[],
 *   ruleList: HTMLElement | null,
 *   statusEl: HTMLElement | null,
 * }} EventGraphElements
 */

/**
 * Create the event sheet controller.
 *
 * @param {EventGraphElements} elements
 * @param {(cmd: string, payload: object) => Promise<unknown>} dispatch
 *   Called with `entity_attach_graph` to persist graph changes.
 * @returns {{
 *   init: (entityId: number | null) => void,
 *   setGraph: (graph: object | null) => void,
 *   bindEvents: () => void,
 *   dispose: () => void,
 * }}
 */
export function createEventGraphController(elements, dispatch) {
  /** @type {{ nodes: Array<object>, edges: Array<object> } | null} */
  let currentGraph = null;
  /** @type {number | null} */
  let currentEntityId = null;
  /** @type {Array<() => void>} */
  const listeners = [];

  function addListener(target, event, handler) {
    if (!target) return;
    target.addEventListener(event, handler);
    listeners.push(() => target.removeEventListener(event, handler));
  }

  function setStatus(msg) {
    if (elements.statusEl) elements.statusEl.textContent = msg;
  }

  /** @param {{ nodes: Array<object>, edges: Array<object> } | null} graph */
  function renderGraph(graph) {
    currentGraph = graph ?? null;
    const list = elements.ruleList;
    if (!list) return;

    if (!graph || !Array.isArray(graph.nodes) || graph.nodes.length === 0) {
      list.replaceChildren(el("li", "event-graph-empty", "No rules yet. Click \u201C+ Add Rule\u201D or apply a template."));
      return;
    }
    const rules = parseRules(graph);
    if (rules.length === 0) {
      list.replaceChildren(el("li", "event-graph-empty", "No event triggers found in graph."));
      return;
    }
    list.replaceChildren(...rules.map((rule, i) => renderRuleRow(rule, i)));
  }

  /** Persist the current graph to the backend. */
  async function pushGraph() {
    if (currentEntityId === null || currentEntityId === undefined || !dispatch || !currentGraph) return;
    try {
      await dispatch("entity_attach_graph", { entity_id: currentEntityId, graph: currentGraph });
      setStatus("Graph saved.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus(`Save failed: ${msg}`);
    }
  }

  /** Add a default OnInteract \u2192 LogMessage rule skeleton. */
  function addDefaultRule() {
    const graph = currentGraph ?? { nodes: [], edges: [] };
    const stamp = Date.now();
    const triggerId = `trigger_${stamp}`;
    const actionId = `action_log_${stamp}`;
    graph.nodes.push(
      { id: triggerId, kind: "event", behavior: { type: "on_interact" } },
      { id: actionId, kind: "action", behavior: { type: "log_message", message: "Interacted!" } },
    );
    graph.edges.push({ from: triggerId, to: actionId });
    renderGraph(graph);
    pushGraph();
  }

  /** Apply a named entity template. */
  function applyTemplate(key) {
    const tpl = ENTITY_TEMPLATES[key];
    if (!tpl) return;
    // Deep-clone so templates stay immutable
    const graph = JSON.parse(JSON.stringify(tpl.graph));
    renderGraph(graph);
    currentGraph = graph;
    pushGraph();
    setStatus(`Template \u201C${tpl.title}\u201D applied.`);
  }

  function toggleTemplatePicker() {
    if (!elements.templatePicker) return;
    elements.templatePicker.hidden = !elements.templatePicker.hidden;
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /** @param {number | null} entityId */
  function init(entityId) {
    currentEntityId = entityId ?? null;
    currentGraph = null;
    setStatus("");
    renderGraph(null);
  }

  /** Called from outside when the backend graph is loaded for an entity. */
  function setGraph(graph) {
    renderGraph(graph ?? null);
  }

  function bindEvents() {
    addListener(elements.addRuleBtn, "click", () => addDefaultRule());
    addListener(elements.pickTemplateBtn, "click", () => toggleTemplatePicker());
    for (const btn of elements.templateBtns) {
      addListener(btn, "click", () => {
        const key = btn.dataset.template;
        if (key) applyTemplate(key);
        if (elements.templatePicker) elements.templatePicker.hidden = true;
      });
    }
  }

  function dispose() {
    listeners.forEach((unsub) => unsub());
    listeners.length = 0;
  }

  return { init, setGraph, bindEvents, dispose };
}
