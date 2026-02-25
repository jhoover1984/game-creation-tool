import test from "node:test";
import assert from "node:assert/strict";

import {
  buildEntitySelectionFromClick,
  normalizeProjectNameInput,
} from "../src/ui-workspace-bindings.js";

test("buildEntitySelectionFromClick replaces selection when additive is false", () => {
  const snapshot = { selection: [1, 2] };
  assert.deepEqual(buildEntitySelectionFromClick(snapshot, 5, false), [5]);
});

test("buildEntitySelectionFromClick appends unique selection when additive is true", () => {
  const snapshot = { selection: [1, 2] };
  assert.deepEqual(buildEntitySelectionFromClick(snapshot, 2, true), [1, 2]);
  assert.deepEqual(buildEntitySelectionFromClick(snapshot, 3, true), [1, 2, 3]);
});

test("normalizeProjectNameInput trims value and applies default fallback", () => {
  assert.equal(normalizeProjectNameInput("  My Project  "), "My Project");
  assert.equal(normalizeProjectNameInput("   "), "Untitled Project");
  assert.equal(normalizeProjectNameInput(""), "Untitled Project");
});
