import test from "node:test";
import assert from "node:assert/strict";

import { normalizeRecentProjects, parseRecentProjects } from "../src/ui-dashboard-recents.js";

test("normalizeRecentProjects filters malformed entries, sorts by recency, and caps output", () => {
  const entries = [
    ...Array.from({ length: 12 }, (_, index) => ({
      projectDir: `C:/projects/demo-${index}`,
      projectName: `Demo ${index}`,
      updatedAt: 1000 + index,
    })),
    { projectDir: "", projectName: "Missing path", updatedAt: 6000 },
    { projectName: "No dir field", updatedAt: 6001 },
    { projectDir: "   ", projectName: "Whitespace path", updatedAt: 6002 },
  ];

  const normalized = normalizeRecentProjects(entries, 8);
  assert.equal(normalized.length, 8);
  assert.equal(normalized[0].projectName, "Demo 11");
  assert.equal(normalized[0].projectDir, "C:/projects/demo-11");
  assert.equal(normalized.at(-1)?.projectName, "Demo 4");
});

test("parseRecentProjects returns empty list for malformed JSON payloads", () => {
  assert.deepEqual(parseRecentProjects("{oops"), []);
});

test("parseRecentProjects returns empty list for non-array payloads", () => {
  assert.deepEqual(parseRecentProjects(JSON.stringify({ projectDir: "C:/demo" })), []);
});

