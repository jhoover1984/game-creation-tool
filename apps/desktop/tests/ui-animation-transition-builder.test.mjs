import test from "node:test";
import assert from "node:assert/strict";

import {
  ANIMATION_CONDITION_KINDS,
  buildTransitionDraft,
  conditionEditorFields,
  createDefaultCondition,
  finalizeTransitionDraft,
} from "../src/ui-animation-transition-builder.js";

test("animation transition builder exposes supported condition kinds", () => {
  assert.equal(Array.isArray(ANIMATION_CONDITION_KINDS), true);
  assert.ok(ANIMATION_CONDITION_KINDS.includes("int_between"));
  assert.ok(ANIMATION_CONDITION_KINDS.includes("clip_finished"));
});

test("createDefaultCondition returns valid defaults for all kinds", () => {
  for (const kind of ANIMATION_CONDITION_KINDS) {
    const condition = createDefaultCondition(kind);
    assert.equal(condition.kind, kind);
  }
});

test("conditionEditorFields reflects expected editor inputs", () => {
  const betweenFields = conditionEditorFields("int_between");
  assert.deepEqual(
    betweenFields.map((f) => f.name),
    ["key", "min", "max"]
  );

  const flagFields = conditionEditorFields("flag_set_for_ticks");
  assert.deepEqual(
    flagFields.map((f) => f.name),
    ["flag", "min_ticks"]
  );

  const noFields = conditionEditorFields("clip_finished");
  assert.deepEqual(noFields, []);
});

test("buildTransitionDraft seeds from/to and condition kind", () => {
  const draft = buildTransitionDraft({
    from_state: "idle",
    to_state: "run",
    kind: "int_gte",
  });
  assert.equal(draft.from_state, "idle");
  assert.equal(draft.to_state, "run");
  assert.equal(draft.condition.kind, "int_gte");
});

test("finalizeTransitionDraft normalizes numeric condition fields", () => {
  const normalized = finalizeTransitionDraft({
    from_state: "idle",
    to_state: "run",
    condition: {
      kind: "int_between",
      key: "speed_tier",
      min: "1",
      max: "2",
    },
  });
  assert.equal(normalized.condition.kind, "int_between");
  assert.equal(normalized.condition.min, 1);
  assert.equal(normalized.condition.max, 2);
});
