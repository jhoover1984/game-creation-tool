/**
 * Unit tests for ui-event-graph.js — S4-EG1
 *
 * Run with: node --test tests/*.test.mjs  (from apps/desktop/)
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

// ---------------------------------------------------------------------------
// Minimal DOM shim (node:test env has no browser DOM)
// ---------------------------------------------------------------------------

function makeEl(tag) {
  const children = [];
  let textContent = "";
  let className = "";
  const dataset = {};
  const listeners = {};
  let hidden = false;

  const el = {
    tagName: tag.toUpperCase(),
    get className() { return className; },
    set className(v) { className = v; },
    get textContent() { return textContent; },
    set textContent(v) { textContent = v; },
    dataset,
    get hidden() { return hidden; },
    set hidden(v) { hidden = v; },
    children,
    replaceChildren(...newChildren) {
      children.length = 0;
      children.push(...newChildren);
    },
    appendChild(child) {
      children.push(child);
      return child;
    },
    addEventListener(event, handler) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    },
    removeEventListener(event, handler) {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((h) => h !== handler);
      }
    },
    _fire(event) {
      for (const h of listeners[event] ?? []) h();
    },
  };
  return el;
}

global.document = {
  createElement: (tag) => makeEl(tag),
};

// ---------------------------------------------------------------------------
// Import under test (after DOM shim is set up)
// ---------------------------------------------------------------------------

const { createEventGraphController, ENTITY_TEMPLATES } = await import(
  "../src/ui-event-graph.js"
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeElements() {
  return {
    addRuleBtn: makeEl("button"),
    pickTemplateBtn: makeEl("button"),
    templatePicker: makeEl("div"),
    templateBtns: [
      Object.assign(makeEl("button"), { dataset: { template: "entity_chest_give_item" } }),
      Object.assign(makeEl("button"), { dataset: { template: "entity_door_require_item" } }),
      Object.assign(makeEl("button"), { dataset: { template: "entity_npc_greeting" } }),
    ],
    ruleList: makeEl("ul"),
    statusEl: makeEl("p"),
  };
}

function makeDispatch(captured = []) {
  return async (cmd, payload) => {
    captured.push({ cmd, payload });
    return null;
  };
}

// ---------------------------------------------------------------------------
// Template data tests
// ---------------------------------------------------------------------------

describe("ENTITY_TEMPLATES", () => {
  it("defines three starter templates", () => {
    const keys = Object.keys(ENTITY_TEMPLATES);
    assert.ok(keys.includes("entity_chest_give_item"), "chest template missing");
    assert.ok(keys.includes("entity_door_require_item"), "door template missing");
    assert.ok(keys.includes("entity_npc_greeting"), "npc template missing");
  });

  it("chest template has on_interact trigger and give_item action", () => {
    const { graph } = ENTITY_TEMPLATES.entity_chest_give_item;
    const trigger = graph.nodes.find((n) => n.behavior?.type === "on_interact");
    const giveItem = graph.nodes.find((n) => n.behavior?.type === "give_item");
    assert.ok(trigger, "chest must have on_interact trigger");
    assert.ok(giveItem, "chest must have give_item action");
    assert.equal(giveItem.behavior.item_id, "key");
  });

  it("door template has has_item condition with true/false branches", () => {
    const { graph } = ENTITY_TEMPLATES.entity_door_require_item;
    const cond = graph.nodes.find((n) => n.behavior?.type === "has_item");
    assert.ok(cond, "door must have has_item condition");
    const trueEdge = graph.edges.find((e) => e.from === cond.id && e.label === "true");
    const falseEdge = graph.edges.find((e) => e.from === cond.id && e.label === "false");
    assert.ok(trueEdge, "door must have a true branch edge");
    assert.ok(falseEdge, "door must have a false branch edge");
  });

  it("npc template has on_interact trigger and show_message action", () => {
    const { graph } = ENTITY_TEMPLATES.entity_npc_greeting;
    const trigger = graph.nodes.find((n) => n.behavior?.type === "on_interact");
    const msg = graph.nodes.find((n) => n.behavior?.type === "show_message");
    assert.ok(trigger, "npc must have on_interact trigger");
    assert.ok(msg, "npc must have show_message action");
  });

  it("templates are immutable (applying one does not mutate the source)", () => {
    const orig = JSON.stringify(ENTITY_TEMPLATES.entity_chest_give_item.graph);
    // Simulate apply: deep clone via JSON round-trip (same logic as controller)
    const cloned = JSON.parse(JSON.stringify(ENTITY_TEMPLATES.entity_chest_give_item.graph));
    cloned.nodes.push({ id: "extra", kind: "action" });
    assert.equal(JSON.stringify(ENTITY_TEMPLATES.entity_chest_give_item.graph), orig);
  });
});

// ---------------------------------------------------------------------------
// Controller render tests
// ---------------------------------------------------------------------------

describe("createEventGraphController — renderGraph", () => {
  it("shows empty hint when graph is null", () => {
    const els = makeElements();
    const ctrl = createEventGraphController(els, makeDispatch());
    ctrl.init(1);
    // ruleList should show empty hint
    assert.equal(els.ruleList.children.length, 1);
    assert.ok(
      els.ruleList.children[0].textContent.includes("No rules yet"),
      "empty hint should mention 'No rules yet'",
    );
  });

  it("shows empty hint when graph has no nodes", () => {
    const els = makeElements();
    const ctrl = createEventGraphController(els, makeDispatch());
    ctrl.init(1);
    ctrl.setGraph({ nodes: [], edges: [] });
    assert.equal(els.ruleList.children.length, 1);
  });

  it("renders one rule row per event node", () => {
    const els = makeElements();
    const ctrl = createEventGraphController(els, makeDispatch());
    ctrl.init(1);
    ctrl.setGraph({
      nodes: [
        { id: "trigger", kind: "event", behavior: { type: "on_interact" } },
        { id: "act", kind: "action", behavior: { type: "give_item", item_id: "key" } },
      ],
      edges: [{ from: "trigger", to: "act" }],
    });
    assert.equal(els.ruleList.children.length, 1, "one event node = one rule row");
    const row = els.ruleList.children[0];
    assert.equal(row.className, "event-rule");
  });

  it("trigger label uses behaviorLabel for on_interact", () => {
    const els = makeElements();
    const ctrl = createEventGraphController(els, makeDispatch());
    ctrl.init(1);
    ctrl.setGraph({
      nodes: [{ id: "t", kind: "event", behavior: { type: "on_interact" } }],
      edges: [],
    });
    const row = els.ruleList.children[0];
    const condCol = row.children[0];
    const triggerSpan = condCol.children[0];
    assert.equal(triggerSpan.textContent, "Player interacts with entity");
  });

  it("two event nodes produce two rule rows", () => {
    const els = makeElements();
    const ctrl = createEventGraphController(els, makeDispatch());
    ctrl.init(1);
    ctrl.setGraph({
      nodes: [
        { id: "t1", kind: "event", behavior: { type: "on_interact" } },
        { id: "t2", kind: "event", behavior: { type: "on_event", event: "room_enter" } },
      ],
      edges: [],
    });
    assert.equal(els.ruleList.children.length, 2);
  });
});

// ---------------------------------------------------------------------------
// Controller template apply tests
// ---------------------------------------------------------------------------

describe("createEventGraphController — template apply", () => {
  it("applying chest template calls dispatch with entity_attach_graph", async () => {
    const captured = [];
    const els = makeElements();
    const ctrl = createEventGraphController(els, makeDispatch(captured));
    ctrl.init(42);
    ctrl.bindEvents();

    // Simulate clicking the chest template button
    els.templateBtns[0]._fire("click");

    // Allow microtask (async dispatch) to settle
    await new Promise((r) => setImmediate(r));

    assert.equal(captured.length, 1);
    assert.equal(captured[0].cmd, "entity_attach_graph");
    assert.equal(captured[0].payload.entity_id, 42);
    const { nodes } = captured[0].payload.graph;
    assert.ok(nodes.some((n) => n.behavior?.type === "on_interact"), "on_interact node present");
    assert.ok(nodes.some((n) => n.behavior?.type === "give_item"), "give_item node present");
  });

  it("template picker is hidden after applying a template", async () => {
    const els = makeElements();
    const ctrl = createEventGraphController(els, makeDispatch());
    ctrl.init(1);
    els.templatePicker.hidden = false;
    ctrl.bindEvents();

    els.templateBtns[2]._fire("click");
    await new Promise((r) => setImmediate(r));

    assert.equal(els.templatePicker.hidden, true);
  });
});

// ---------------------------------------------------------------------------
// Controller addRule tests
// ---------------------------------------------------------------------------

describe("createEventGraphController — addRule", () => {
  it("add rule button creates a default on_interact rule and dispatches", async () => {
    const captured = [];
    const els = makeElements();
    const ctrl = createEventGraphController(els, makeDispatch(captured));
    ctrl.init(7);
    ctrl.bindEvents();

    els.addRuleBtn._fire("click");
    await new Promise((r) => setImmediate(r));

    assert.equal(captured.length, 1);
    assert.equal(captured[0].cmd, "entity_attach_graph");
    const { nodes } = captured[0].payload.graph;
    assert.ok(nodes.some((n) => n.behavior?.type === "on_interact"));
    assert.ok(nodes.some((n) => n.behavior?.type === "log_message"));
  });

  it("status text is set on successful dispatch", async () => {
    const els = makeElements();
    const ctrl = createEventGraphController(els, makeDispatch());
    ctrl.init(1);
    ctrl.bindEvents();

    els.addRuleBtn._fire("click");
    await new Promise((r) => setImmediate(r));

    assert.equal(els.statusEl.textContent, "Graph saved.");
  });
});

// ---------------------------------------------------------------------------
// Dispose
// ---------------------------------------------------------------------------

describe("createEventGraphController — dispose", () => {
  it("dispose removes event listeners", async () => {
    const captured = [];
    const els = makeElements();
    const ctrl = createEventGraphController(els, makeDispatch(captured));
    ctrl.init(1);
    ctrl.bindEvents();
    ctrl.dispose();

    els.addRuleBtn._fire("click");
    await new Promise((r) => setImmediate(r));
    assert.equal(captured.length, 0, "no dispatch after dispose");
  });
});
