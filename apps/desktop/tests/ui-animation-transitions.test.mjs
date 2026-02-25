import test from "node:test";
import assert from "node:assert/strict";

import { createAnimationTransitionsController } from "../src/ui-animation-transitions.js";
import { createEventBus } from "../src/event-bus.js";

function createButtonStub() {
  const handlers = new Map();
  return {
    addEventListener(event, handler) {
      handlers.set(event, handler);
    },
    removeEventListener(event) {
      handlers.delete(event);
    },
    click() {
      const handler = handlers.get("click");
      if (handler) handler();
    },
  };
}

test("animation transitions controller syncs selected entity transitions", () => {
  const events = createEventBus();
  const elements = {
    animationTransitionList: { textContent: "" },
    animationTransitionAddBtn: null,
    animationTransitionSaveBtn: null,
    animationTransitionFromInput: null,
    animationTransitionToInput: null,
    animationTransitionKindSelect: null,
    animationTransitionStatus: { textContent: "" },
  };
  const state = {
    events,
    snapshot: () => ({
      selection: [1],
      entities: [
        {
          id: 1,
          animation: {
            transitions: [
              {
                from_state: "idle",
                to_state: "run",
                condition: { kind: "int_gte", key: "speed_tier", value: 2 },
              },
            ],
          },
        },
      ],
    }),
  };

  const controller = createAnimationTransitionsController({ elements, state });
  controller.bindEvents();

  assert.match(elements.animationTransitionList.textContent, /idle -> run \(int_gte\)/);
});

test("animation transitions controller adds and saves draft transitions", async () => {
  const addBtn = createButtonStub();
  const saveBtn = createButtonStub();
  const events = createEventBus();
  /** @type {Array<unknown>} */
  const savedPayloads = [];

  const elements = {
    animationTransitionList: { textContent: "" },
    animationTransitionAddBtn: addBtn,
    animationTransitionSaveBtn: saveBtn,
    animationTransitionFromInput: { value: "idle" },
    animationTransitionToInput: { value: "run" },
    animationTransitionKindSelect: { value: "int_between" },
    animationTransitionStatus: { textContent: "" },
  };
  const state = {
    events,
    snapshot: () => ({ selection: [1], entities: [{ id: 1, animation: { transitions: [] } }] }),
    buildAnimationTransitionDraft: ({ from_state, to_state, kind }) => ({
      from_state,
      to_state,
      condition: { kind, key: "speed_tier", min: "1", max: "3" },
    }),
    finalizeAnimationTransitionDraft: (draft) => ({
      ...draft,
      condition: { ...draft.condition, min: 1, max: 3 },
    }),
    setSelectedEntityAnimationTransitions: async (transitions) => {
      savedPayloads.push(transitions);
    },
  };

  const controller = createAnimationTransitionsController({ elements, state });
  controller.bindEvents();

  addBtn.click();
  assert.match(elements.animationTransitionList.textContent, /idle -> run \(int_between\)/);

  saveBtn.click();
  await Promise.resolve();
  assert.equal(savedPayloads.length, 1);
  assert.equal(savedPayloads[0][0].condition.min, 1);
  assert.equal(savedPayloads[0][0].condition.max, 3);
  assert.equal(elements.animationTransitionStatus.textContent, "Transitions saved.");
});
