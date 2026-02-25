import test from "node:test";
import assert from "node:assert/strict";

import { buildWatchSections, traceFilterKey, traceMatches } from "../src/ui-debug-helpers.js";

test("traceFilterKey unwraps breakpoint-prefixed kinds", () => {
  assert.equal(traceFilterKey("breakpoint:item_pickup"), "item_pickup");
  assert.equal(traceFilterKey("playtest_tick"), "playtest_tick");
});

test("traceMatches respects all, breakpoint, and specific kind filters", () => {
  const breakpointEvent = { kind: "breakpoint:quest_state" };
  const tickEvent = { kind: "playtest_tick" };

  assert.equal(traceMatches(breakpointEvent, "all"), true);
  assert.equal(traceMatches(breakpointEvent, "breakpoint"), true);
  assert.equal(traceMatches(breakpointEvent, "quest_state"), true);
  assert.equal(traceMatches(breakpointEvent, "item_pickup"), false);
  assert.equal(traceMatches(tickEvent, "breakpoint"), false);
  assert.equal(traceMatches(tickEvent, "playtest_tick"), true);
});

test("buildWatchSections returns selected and global buckets for chosen filter", () => {
  const sectionsAll = buildWatchSections(
    {
      flags: [{ key: "a", value: true }],
      vars: [{ key: "b", value: 1 }],
      inventory: [{ key: "c", value: 2 }],
      selectedFlags: [{ key: "sa", value: false }],
      selectedVars: [{ key: "sb", value: 3 }],
      selectedInventory: [{ key: "sc", value: 4 }],
    },
    "all"
  );
  assert.equal(sectionsAll.length, 6);

  const sectionsFlags = buildWatchSections(
    {
      flags: [{ key: "a", value: true }],
      selectedFlags: [{ key: "sa", value: false }],
    },
    "flags"
  );
  assert.deepEqual(
    sectionsFlags.map((section) => section.title),
    ["Global Flags", "Selected Flags"]
  );
});
