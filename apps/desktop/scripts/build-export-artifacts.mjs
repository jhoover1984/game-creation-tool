import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { EXPORT_PREVIEW_SCENES } from "../src/export-preview-fixtures.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.resolve(__dirname, "../export-artifacts/html5-preview");
const templateDir = path.resolve(__dirname, "../../../crates/export-core/templates");
const runtimeTemplatePath = path.join(templateDir, "runtime.js");
const indexTemplatePath = path.join(templateDir, "index.html");

function materializeRuntimeTemplate(template, debug = false) {
  const debugComment = debug ? "// debug export build\n" : "";
  return template.replace("__GCS_DEBUG_COMMENT__", debugComment);
}

function materializeIndexTemplate(template, modeLabel = "Release", profileLabel = "game_boy") {
  return template
    .replace("__GCS_MODE_LABEL__", modeLabel)
    .replace("__GCS_PROFILE_LABEL__", profileLabel);
}

async function buildExportArtifacts() {
  const runtimeTemplate = await readFile(runtimeTemplatePath, "utf8");
  const indexTemplate = await readFile(indexTemplatePath, "utf8");
  const runtimeJs = materializeRuntimeTemplate(runtimeTemplate, false);
  const indexHtml = materializeIndexTemplate(indexTemplate, "Release", "game_boy");

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  await mkdir(path.join(outputDir, "assets"), { recursive: true });
  await writeFile(
    path.join(outputDir, "metadata.json"),
    JSON.stringify(
      {
        schema_version: 1,
        profile: "game_boy",
        mode: "release",
        scene_count: EXPORT_PREVIEW_SCENES.length,
      },
      null,
      2
    ),
    "utf8"
  );
  await writeFile(
    path.join(outputDir, "bundle.json"),
    JSON.stringify(
      {
        schema_version: 1,
        kind: "html5_profile_preview",
        profile: "game_boy",
        mode: "release",
        entrypoint: "index.html",
        runtime: "runtime.js",
        scenes: "scenes.json",
        metadata: "metadata.json",
        assets: "assets/manifest.json",
      },
      null,
      2
    ),
    "utf8"
  );
  await writeFile(
    path.join(outputDir, "scenes.json"),
    JSON.stringify(EXPORT_PREVIEW_SCENES, null, 2),
    "utf8"
  );
  await writeFile(
    path.join(outputDir, "assets", "manifest.json"),
    JSON.stringify(
      {
        schema_version: 1,
        generated_by: "gcs-export-preview-js",
        profile: "game_boy",
        asset_count: 0,
        assets: [],
      },
      null,
      2
    ),
    "utf8"
  );
  await writeFile(path.join(outputDir, "index.html"), indexHtml, "utf8");
  await writeFile(path.join(outputDir, "runtime.js"), runtimeJs, "utf8");
  process.stdout.write(`export artifacts built: ${outputDir}\n`);
}

await buildExportArtifacts();
