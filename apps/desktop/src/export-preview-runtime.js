import { EXPORT_PREVIEW_SCENES } from "./export-preview-fixtures.js";

function tileColor(frame) {
  return frame % 30 < 15 ? "#8bac0f" : "#306230";
}

function renderSceneToCanvas(canvas, scene) {
  if (!(canvas instanceof HTMLCanvasElement) || !scene) {
    return false;
  }
  const width = scene.options?.width ?? 160;
  const height = scene.options?.height ?? 144;
  const tilePx = scene.options?.tilePx ?? 8;
  const frame = scene.snapshot?.playtest?.frame ?? 0;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return false;
  }

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#9bbc0f";
  ctx.fillRect(0, 0, width, height);

  for (const tile of scene.snapshot?.tiles || []) {
    ctx.fillStyle = tileColor(frame);
    ctx.fillRect(tile.x * tilePx, tile.y * tilePx, tilePx, tilePx);
  }

  for (const entity of scene.snapshot?.entities || []) {
    const x = Math.max(0, Math.min(width - tilePx, entity.position.x));
    const y = Math.max(0, Math.min(height - tilePx, entity.position.y));
    ctx.fillStyle = "#0f380f";
    ctx.fillRect(x, y, tilePx, tilePx);
  }

  return true;
}

function buildExportRuntimeBridge() {
  const canvas = document.getElementById("export-viewport");
  const sceneLabel = document.getElementById("export-scene-name");
  const scenesByName = new Map(EXPORT_PREVIEW_SCENES.map((scene) => [scene.name, scene]));

  return {
    renderSceneByName(name) {
      const scene = scenesByName.get(name);
      if (!scene) {
        return false;
      }
      const ok = renderSceneToCanvas(canvas, scene);
      if (ok && sceneLabel) {
        sceneLabel.textContent = `Scene: ${scene.name}`;
      }
      return ok;
    },
    readPixels() {
      if (!(canvas instanceof HTMLCanvasElement)) {
        return [];
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return [];
      }
      return Array.from(ctx.getImageData(0, 0, canvas.width, canvas.height).data);
    },
  };
}

const exportPreviewWindow = /** @type {Window & { __exportPreview?: ReturnType<typeof buildExportRuntimeBridge> }} */ (
  window
);
exportPreviewWindow.__exportPreview = buildExportRuntimeBridge();
exportPreviewWindow.__exportPreview.renderSceneByName(EXPORT_PREVIEW_SCENES[0].name);
