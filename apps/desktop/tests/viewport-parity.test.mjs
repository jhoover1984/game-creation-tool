import test from "node:test";
import assert from "node:assert/strict";
import goldenScenes from "./fixtures/viewport-golden-scenes.json" with { type: "json" };

import { buildExportSignature, buildPreviewSignature } from "../src/viewport-signature.js";

test("preview and export signatures match for golden viewport scenes", () => {
  for (const scene of goldenScenes) {
    const preview = buildPreviewSignature(scene);
    const exported = buildExportSignature(scene);
    assert.deepEqual(
      preview,
      exported,
      `signature drift detected for golden scene '${scene.name}'`
    );
  }
});
