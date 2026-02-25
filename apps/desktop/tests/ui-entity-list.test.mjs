import test from "node:test";
import assert from "node:assert/strict";

import { buildEntityListRows } from "../src/ui-entity-list.js";

test("buildEntityListRows returns empty-state row when no entities exist", () => {
  const rows = buildEntityListRows({
    entities: [],
    selection: [],
  });
  assert.deepEqual(rows, [{ id: null, text: "No entities." }]);
});

test("buildEntityListRows marks selected entities and formats position labels", () => {
  const rows = buildEntityListRows({
    entities: [
      { id: 1, name: "Player", position: { x: 16, y: 32 } },
      { id: 2, name: "NPC", position: { x: 40, y: 24 } },
    ],
    selection: [2],
  });
  assert.deepEqual(rows, [
    { id: 1, text: "Player (#1) @ (16, 32)" },
    { id: 2, text: "[Selected] NPC (#2) @ (40, 24)" },
  ]);
});
