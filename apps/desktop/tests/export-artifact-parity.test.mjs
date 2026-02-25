import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import goldenScenes from "./fixtures/viewport-golden-scenes.json" with { type: "json" };
import { buildExportArtifact } from "../src/export-artifact.js";
import { buildPreviewSignature } from "../src/viewport-signature.js";

test("preview signatures match exported artifact signatures for golden scenes", async () => {
  const root = await mkdtemp(join(tmpdir(), "gcs-export-parity-"));
  try {
    for (const scene of goldenScenes) {
      const artifact = buildExportArtifact(scene);
      const artifactPath = join(root, `${scene.name}.signature.json`);
      await writeFile(artifactPath, JSON.stringify(artifact, null, 2), "utf8");

      const artifactFromDisk = JSON.parse(await readFile(artifactPath, "utf8"));
      assert.equal(
        artifactFromDisk.schema_version,
        1,
        `unexpected artifact schema for scene '${scene.name}'`
      );
      assert.equal(
        artifactFromDisk.scene_name,
        scene.name,
        `unexpected scene metadata for scene '${scene.name}'`
      );

      const previewSignature = buildPreviewSignature(scene);
      assert.deepEqual(
        previewSignature,
        artifactFromDisk.signature,
        `preview/export artifact drift detected for scene '${scene.name}'`
      );
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
