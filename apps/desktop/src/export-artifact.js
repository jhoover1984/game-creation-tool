import { buildExportSignature } from "./viewport-signature.js";

const EXPORT_ARTIFACT_SCHEMA_VERSION = 1;

export function buildExportArtifact(scene) {
  return {
    schema_version: EXPORT_ARTIFACT_SCHEMA_VERSION,
    scene_name: scene.name,
    viewport_options: {
      width: scene.options?.width ?? 160,
      height: scene.options?.height ?? 144,
      tile_px: scene.options?.tilePx ?? 8,
    },
    signature: buildExportSignature(scene),
  };
}
