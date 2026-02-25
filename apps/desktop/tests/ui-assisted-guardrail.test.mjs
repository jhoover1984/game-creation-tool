import test from "node:test";
import assert from "node:assert/strict";

import {
  EMPTY_ASSISTED_GUARDRAIL,
  resolveAssistedGuardrail,
} from "../src/ui-assisted-guardrail.js";

test("resolveAssistedGuardrail falls back to empty guardrail when controller is unavailable", () => {
  const result = resolveAssistedGuardrail({
    issuesRecoveryController: null,
    snapshot: {},
  });
  assert.deepEqual(result, EMPTY_ASSISTED_GUARDRAIL);
});

test("resolveAssistedGuardrail delegates to issues recovery controller when available", () => {
  const expected = {
    issue: "Near limit",
    tip: "Switch profile",
    level: "near",
    profile: "nes",
    count: 8,
    cap: 10,
  };
  const result = resolveAssistedGuardrail({
    issuesRecoveryController: {
      buildAssistedGuardrail() {
        return expected;
      },
    },
    snapshot: { any: true },
  });
  assert.deepEqual(result, expected);
});
