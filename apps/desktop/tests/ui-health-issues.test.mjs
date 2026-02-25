import test from "node:test";
import assert from "node:assert/strict";

import { buildHealthIssuesModel } from "../src/ui-health-issues.js";

test("buildHealthIssuesModel returns awaiting state when health is missing", () => {
  const result = buildHealthIssuesModel(
    {
      health: null,
      lastError: null,
    },
    { issue: "" }
  );

  assert.deepEqual(result, {
    healthText: "Awaiting open_project response.",
    issues: [],
  });
});

test("buildHealthIssuesModel aggregates warnings, limits, runtime errors, and guardrail issue", () => {
  const result = buildHealthIssuesModel(
    {
      health: {
        warnings: ["Missing asset: tree.png", "Script warning: quest_key unused"],
        near_limits: ["sprites 38/40"],
      },
      lastError: {
        action: "save",
        message: "disk full",
      },
    },
    { issue: "Assisted content near NES profile cap." }
  );

  assert.equal(result.healthText, "2 warning(s) detected.");
  assert.deepEqual(result.issues, [
    "Runtime error (save): disk full",
    "Missing asset: tree.png",
    "Script warning: quest_key unused",
    "Near limit: sprites 38/40",
    "Assisted content near NES profile cap.",
  ]);
});
