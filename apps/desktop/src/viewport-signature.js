const COLOR_BG = [155, 188, 15, 255];
const COLOR_TILE_A = [139, 172, 15, 255];
const COLOR_TILE_B = [48, 98, 48, 255];
const COLOR_ENTITY = [15, 56, 15, 255];

function tileColorForFrame(frame) {
  return frame % 30 < 15 ? COLOR_TILE_A : COLOR_TILE_B;
}

function isInsideRect(x, y, left, top, size) {
  return x >= left && x < left + size && y >= top && y < top + size;
}

export function sampleViewportPixel(snapshot, x, y, options = {}) {
  const width = options.width ?? 160;
  const height = options.height ?? 144;
  const tilePx = options.tilePx ?? 8;

  if (x < 0 || y < 0 || x >= width || y >= height) {
    return [0, 0, 0, 0];
  }

  const frame = snapshot.playtest?.frame ?? 0;
  let pixel = COLOR_BG;

  for (const tile of snapshot.tiles || []) {
    const left = tile.x * tilePx;
    const top = tile.y * tilePx;
    if (isInsideRect(x, y, left, top, tilePx)) {
      pixel = tileColorForFrame(frame);
    }
  }

  for (const entity of snapshot.entities || []) {
    const left = Math.max(0, Math.min(width - tilePx, entity.position.x));
    const top = Math.max(0, Math.min(height - tilePx, entity.position.y));
    if (isInsideRect(x, y, left, top, tilePx)) {
      pixel = COLOR_ENTITY;
    }
  }

  return [...pixel];
}

function signatureFromScene(scene) {
  const signature = {};
  for (const point of scene.points) {
    signature[point.id] = sampleViewportPixel(scene.snapshot, point.x, point.y, scene.options);
  }
  return signature;
}

export function buildPreviewSignature(scene) {
  return signatureFromScene(scene);
}

export function buildExportSignature(scene) {
  return signatureFromScene(scene);
}

export function buildScenePixelBuffer(scene) {
  const width = scene.options?.width ?? 160;
  const height = scene.options?.height ?? 144;
  const buffer = new Array(width * height * 4);
  let cursor = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = sampleViewportPixel(scene.snapshot, x, y, scene.options);
      buffer[cursor++] = pixel[0];
      buffer[cursor++] = pixel[1];
      buffer[cursor++] = pixel[2];
      buffer[cursor++] = pixel[3];
    }
  }
  return buffer;
}
