import test from "node:test";
import assert from "node:assert/strict";

import { createEventBus } from "../src/event-bus.js";

test("event-bus isolates failing handlers and continues sibling delivery", () => {
  const bus = createEventBus();
  const delivered = [];

  bus.on("evt", () => {
    delivered.push("first");
    throw new Error("boom");
  });
  bus.on("evt", () => {
    delivered.push("second");
  });

  bus.emit("evt", { ok: true });
  assert.deepEqual(delivered, ["first", "second"]);
});
