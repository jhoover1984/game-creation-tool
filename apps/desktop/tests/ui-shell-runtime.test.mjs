import assert from "node:assert/strict";
import test from "node:test";

import { createShellRuntimeController } from "../src/ui-shell-runtime.js";

test("shell runtime controller toggles playtest based on active state", async () => {
  let active = false;
  let enterCalls = 0;
  let exitCalls = 0;

  const state = {
    snapshot() {
      return { playtest: { active } };
    },
    async enterPlaytest() {
      enterCalls += 1;
      active = true;
    },
    async exitPlaytest() {
      exitCalls += 1;
      active = false;
    },
  };

  const controller = createShellRuntimeController({
    state,
    render: () => {},
    log: () => {},
  });

  await controller.togglePlaytest();
  assert.equal(enterCalls, 1);
  assert.equal(exitCalls, 0);

  await controller.togglePlaytest();
  assert.equal(enterCalls, 1);
  assert.equal(exitCalls, 1);
});

test("shell runtime controller delegates breakpoint toggle and controller disposal", () => {
  const breakpointCalls = [];
  let disposeCount = 0;
  const state = {
    snapshot() {
      return { playtest: { active: false } };
    },
    async enterPlaytest() {},
    async exitPlaytest() {},
  };
  const controller = createShellRuntimeController({
    state,
    render: () => {},
    log: () => {},
    breakpointToggler: (deps, kind) => {
      breakpointCalls.push({ deps, kind });
    },
  });

  controller.toggleBreakpoint("quest_state");
  assert.equal(breakpointCalls.length, 1);
  assert.equal(breakpointCalls[0]?.kind, "quest_state");
  assert.equal(breakpointCalls[0]?.deps.state, state);

  controller.disposeControllers([
    {
      dispose() {
        disposeCount += 1;
      },
    },
    null,
    undefined,
    {},
    {
      dispose() {
        disposeCount += 1;
      },
    },
  ]);
  assert.equal(disposeCount, 2);
});
