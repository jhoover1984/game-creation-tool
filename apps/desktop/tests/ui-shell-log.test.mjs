import test from "node:test";
import assert from "node:assert/strict";

import { formatShellLogLine } from "../src/ui-shell-log.js";

test("formatShellLogLine produces timestamp-prefixed shell log entries", () => {
  assert.equal(
    formatShellLogLine("Editor workspace initialized.", "10:31:04"),
    "[10:31:04] Editor workspace initialized."
  );
});
