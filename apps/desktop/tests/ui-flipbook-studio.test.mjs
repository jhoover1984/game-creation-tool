import test from "node:test";
import assert from "node:assert/strict";

import { createFlipbookStudioController } from "../src/ui-flipbook-studio.js";

function createEventTarget(initial = {}) {
  const listeners = new Map();
  return {
    ...initial,
    addEventListener(event, handler) {
      const set = listeners.get(event) || new Set();
      set.add(handler);
      listeners.set(event, set);
    },
    removeEventListener(event, handler) {
      const set = listeners.get(event);
      if (!set) return;
      set.delete(handler);
      if (set.size === 0) listeners.delete(event);
    },
    dispatch(event) {
      const set = listeners.get(event);
      if (!set) return;
      for (const handler of set) handler({ type: event });
    },
  };
}

function createContainer(initial = {}) {
  const node = createEventTarget({
    textContent: "",
    className: "",
    children: [],
    ...initial,
  });
  node.replaceChildren = (...children) => {
    node.children = children;
  };
  node.append = (...children) => {
    node.children.push(...children);
  };
  node.setAttribute = () => {};
  return node;
}

function createSelect(initialValue = "") {
  const select = createContainer({ value: initialValue });
  select.options = [];
  select.append = (option) => {
    select.options.push(option);
  };
  select.replaceChildren = () => {
    select.options = [];
  };
  return select;
}

function createInput(initialValue = "") {
  return createEventTarget({ value: initialValue, disabled: false, min: "0", max: "0" });
}

function installDomStubs() {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const originalImage = globalThis.Image;
  const originalSetInterval = globalThis.setInterval;
  const originalClearInterval = globalThis.clearInterval;
  let intervalHandler = null;
  let intervalId = 0;

  globalThis.document = {
    createElement(tagName) {
      const node = createContainer({ tagName: String(tagName).toLowerCase(), style: {} });
      node.type = "button";
      node.title = "";
      return node;
    },
  };
  globalThis.window = {
    prompt: () => null,
  };
  globalThis.Image = class ImageStub {
    set src(_value) {}
  };
  globalThis.setInterval = (handler) => {
    intervalId += 1;
    intervalHandler = handler;
    return intervalId;
  };
  globalThis.clearInterval = () => {
    intervalHandler = null;
  };

  return {
    tickInterval() {
      if (typeof intervalHandler === "function") {
        intervalHandler();
      }
    },
    cleanup() {
      globalThis.document = originalDocument;
      globalThis.window = originalWindow;
      globalThis.Image = originalImage;
      globalThis.setInterval = originalSetInterval;
      globalThis.clearInterval = originalClearInterval;
    },
  };
}

function makeElements() {
  return {
    flipbookSummary: createContainer(),
    flipbookClipSelect: createSelect(""),
    flipbookFrameDurationInput: createInput("8"),
    flipbookLoopModeSelect: createSelect("loop"),
    flipbookClipAddBtn: createEventTarget({}),
    flipbookClipRenameBtn: createEventTarget({}),
    flipbookClipDeleteBtn: createEventTarget({}),
    flipbookFrameStrip: createContainer(),
    flipbookScrubInput: createInput("0"),
    flipbookScrubLabel: createContainer(),
    flipbookFrameAddBtn: createEventTarget({}),
    flipbookFrameRemoveBtn: createEventTarget({}),
    flipbookFrameDuplicateBtn: createEventTarget({}),
    flipbookFrameLeftBtn: createEventTarget({}),
    flipbookFrameRightBtn: createEventTarget({}),
    flipbookPreviewSpeedSelect: createEventTarget({ value: "1" }),
    flipbookPreviewToggleBtn: createEventTarget({ textContent: "Preview", setAttribute() {} }),
    flipbookStatus: createContainer(),
  };
}

test("flipbook controller shows selection hint when no entity selected", () => {
  const env = installDomStubs();
  const elements = makeElements();
  const controller = createFlipbookStudioController({
    elements,
    state: {
      snapshot: () => ({ selection: [], entities: [], selectedComponents: {}, spriteRegistry: {} }),
    },
  });

  controller.bindEvents();
  assert.match(elements.flipbookSummary.textContent, /Select exactly one entity/i);

  controller.dispose();
  env.cleanup();
});

test("flipbook controller renders selected entity clip metadata", () => {
  const env = installDomStubs();
  const elements = makeElements();
  const controller = createFlipbookStudioController({
    elements,
    state: {
      snapshot: () => ({
        selection: [1],
        selectedComponents: {},
        spriteRegistry: {},
        entities: [
          {
            id: 1,
            name: "Player",
            components: {},
            animation: {
              state: { current_clip_name: "idle", current_frame_index: 0 },
              clips: {
                idle: { frames: [0, 1], frame_duration_ticks: 4, loop_mode: "loop" },
              },
            },
          },
        ],
      }),
    },
  });

  controller.bindEvents();
  assert.match(elements.flipbookSummary.textContent, /Player: 1 clip/i);
  assert.equal(elements.flipbookClipSelect.value, "idle");
  assert.equal(elements.flipbookFrameDurationInput.value, "4");
  assert.equal(elements.flipbookLoopModeSelect.value, "loop");

  controller.dispose();
  env.cleanup();
});

test("flipbook controller add clip action calls state and updates status", async () => {
  const env = installDomStubs();
  const elements = makeElements();
  /** @type {Array<{ name: string, clip: { frames: number[], frame_duration_ticks: number, loop_mode?: string } }>} */
  const calls = [];
  /** @type {Array<string>} */
  const setStateCalls = [];

  const controller = createFlipbookStudioController({
    elements,
    state: {
      snapshot: () => ({
        selection: [1],
        selectedComponents: {},
        spriteRegistry: {},
        entities: [
          {
            id: 1,
            name: "Entity 1",
            components: {},
            animation: {
              state: { current_clip_name: "idle", current_frame_index: 0 },
              clips: {
                idle: { frames: [0], frame_duration_ticks: 8, loop_mode: "loop" },
              },
            },
          },
        ],
      }),
      addSelectedEntityAnimationClip: async (clipName, clip) => {
        calls.push({ name: clipName, clip });
      },
      setSelectedEntityAnimationState: async (name) => {
        setStateCalls.push(name);
      },
    },
  });

  controller.bindEvents();
  elements.flipbookClipAddBtn.dispatch("click");
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, "clip_1");
  assert.deepEqual(calls[0].clip, { frames: [0], frame_duration_ticks: 8, loop_mode: "loop" });
  assert.deepEqual(setStateCalls, ["clip_1"]);
  assert.match(elements.flipbookStatus.textContent, /Created clip 'clip_1'/);

  controller.dispose();
  env.cleanup();
});

test("flipbook preview ping_pong mode bounces between ends", () => {
  const env = installDomStubs();
  const elements = makeElements();
  const controller = createFlipbookStudioController({
    elements,
    state: {
      snapshot: () => ({
        selection: [1],
        selectedComponents: {},
        spriteRegistry: {},
        entities: [
          {
            id: 1,
            name: "Entity 1",
            components: {},
            animation: {
              state: { current_clip_name: "idle", current_frame_index: 0 },
              clips: {
                idle: { frames: [0, 1, 2], frame_duration_ticks: 1, loop_mode: "ping_pong" },
              },
            },
          },
        ],
      }),
    },
  });

  controller.bindEvents();
  elements.flipbookPreviewToggleBtn.dispatch("click");
  env.tickInterval();
  assert.match(elements.flipbookScrubLabel.textContent, /slot 1/);
  env.tickInterval();
  assert.match(elements.flipbookScrubLabel.textContent, /slot 2/);
  env.tickInterval();
  assert.match(elements.flipbookScrubLabel.textContent, /slot 1/);
  env.tickInterval();
  assert.match(elements.flipbookScrubLabel.textContent, /slot 0/);

  controller.dispose();
  env.cleanup();
});

test("flipbook preview once mode auto-stops at final frame", () => {
  const env = installDomStubs();
  const elements = makeElements();
  const controller = createFlipbookStudioController({
    elements,
    state: {
      snapshot: () => ({
        selection: [1],
        selectedComponents: {},
        spriteRegistry: {},
        entities: [
          {
            id: 1,
            name: "Entity 1",
            components: {},
            animation: {
              state: { current_clip_name: "idle", current_frame_index: 0 },
              clips: {
                idle: { frames: [0, 1, 2], frame_duration_ticks: 1, loop_mode: "once" },
              },
            },
          },
        ],
      }),
    },
  });

  controller.bindEvents();
  elements.flipbookPreviewToggleBtn.dispatch("click");

  env.tickInterval();
  assert.match(elements.flipbookScrubLabel.textContent, /slot 1/);
  assert.equal(elements.flipbookPreviewToggleBtn.textContent, "Stop Preview");

  env.tickInterval();
  assert.match(elements.flipbookScrubLabel.textContent, /slot 2/);
  assert.equal(elements.flipbookPreviewToggleBtn.textContent, "Preview");
  assert.match(elements.flipbookStatus.textContent, /Preview completed/);

  // Timer should be stopped after completion; no further advancement.
  env.tickInterval();
  assert.match(elements.flipbookScrubLabel.textContent, /slot 2/);

  controller.dispose();
  env.cleanup();
});

test("flipbook preview speed change updates status without stopping preview", () => {
  const env = installDomStubs();
  const elements = makeElements();
  const controller = createFlipbookStudioController({
    elements,
    state: {
      snapshot: () => ({
        selection: [1],
        selectedComponents: {},
        spriteRegistry: {},
        entities: [
          {
            id: 1,
            name: "Entity 1",
            components: {},
            animation: {
              state: { current_clip_name: "idle", current_frame_index: 0 },
              clips: {
                idle: { frames: [0, 1, 2], frame_duration_ticks: 1, loop_mode: "loop" },
              },
            },
          },
        ],
      }),
    },
  });

  controller.bindEvents();
  elements.flipbookPreviewToggleBtn.dispatch("click");
  assert.match(elements.flipbookStatus.textContent, /Preview started \(1x\)/);
  assert.equal(elements.flipbookPreviewToggleBtn.textContent, "Stop Preview");

  elements.flipbookPreviewSpeedSelect.value = "2";
  elements.flipbookPreviewSpeedSelect.dispatch("change");
  assert.match(elements.flipbookStatus.textContent, /Preview speed set to 2x/);
  assert.equal(elements.flipbookPreviewToggleBtn.textContent, "Stop Preview");

  env.tickInterval();
  assert.match(elements.flipbookScrubLabel.textContent, /slot 1/);

  controller.dispose();
  env.cleanup();
});

test("flipbook scrub label shows preview speed marker while preview is active", () => {
  const env = installDomStubs();
  const elements = makeElements();
  elements.flipbookPreviewSpeedSelect.value = "2";
  const controller = createFlipbookStudioController({
    elements,
    state: {
      snapshot: () => ({
        selection: [1],
        selectedComponents: {},
        spriteRegistry: {},
        entities: [
          {
            id: 1,
            name: "Entity 1",
            components: {},
            animation: {
              state: { current_clip_name: "idle", current_frame_index: 0 },
              clips: {
                idle: { frames: [0, 1, 2], frame_duration_ticks: 1, loop_mode: "loop" },
              },
            },
          },
        ],
      }),
    },
  });

  controller.bindEvents();
  elements.flipbookPreviewToggleBtn.dispatch("click");
  assert.match(elements.flipbookScrubLabel.textContent, /Preview @ 2x/);

  controller.dispose();
  env.cleanup();
});
