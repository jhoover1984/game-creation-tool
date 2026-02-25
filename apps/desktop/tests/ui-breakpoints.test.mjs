import test from "node:test";
import assert from "node:assert/strict";

import {
  applyBreakpointToggle,
  enabledBreakpointKinds,
  nextBreakpointKinds,
} from "../src/ui-breakpoints.js";

test("enabledBreakpointKinds returns only active breakpoint keys", () => {
  const keys = enabledBreakpointKinds([
    { key: "playtest_tick", value: true },
    { key: "item_pickup", value: false },
    { key: "quest_state", value: true },
  ]);
  assert.deepEqual(keys, ["playtest_tick", "quest_state"]);
});

test("nextBreakpointKinds toggles a kind on/off deterministically", () => {
  const turnOn = nextBreakpointKinds([{ key: "playtest_tick", value: true }], "item_pickup");
  assert.deepEqual(turnOn.sort(), ["item_pickup", "playtest_tick"]);

  const turnOff = nextBreakpointKinds(
    [
      { key: "playtest_tick", value: true },
      { key: "item_pickup", value: true },
    ],
    "item_pickup"
  );
  assert.deepEqual(turnOff, ["playtest_tick"]);
});

test("applyBreakpointToggle persists next breakpoint set and rerenders", async () => {
  const saved = [];
  let renderCount = 0;
  const logs = [];
  const state = {
    snapshot() {
      return {
        playtestBreakpoints: [{ key: "playtest_tick", value: true }],
      };
    },
    async setBreakpoints(kinds) {
      saved.push(kinds);
    },
  };

  applyBreakpointToggle(
    {
      state,
      render() {
        renderCount += 1;
      },
      log(message) {
        logs.push(message);
      },
    },
    "item_pickup"
  );

  await Promise.resolve();
  assert.deepEqual(saved, [["playtest_tick", "item_pickup"]]);
  assert.equal(renderCount, 1);
  assert.equal(logs.length, 0);
});
