import { test, expect } from "@playwright/test";

import { buildScenePixelBuffer } from "../src/viewport-signature.js";

const PROFILE_VIEWPORT = {
  game_boy: { width: 160, height: 144 },
  nes: { width: 256, height: 240 },
  snes: { width: 256, height: 224 },
};

test("export preview artifact is pixel-exact for golden scenes", async ({ page, request }) => {
  await page.goto("/export-artifacts/html5-preview/index.html");

  const metadataResponse = await request.get("/export-artifacts/html5-preview/metadata.json");
  expect(metadataResponse.ok()).toBe(true);
  const metadata = await metadataResponse.json();
  expect(metadata.schema_version).toBe(1);
  expect(["game_boy", "nes", "snes"]).toContain(metadata.profile);
  expect(["debug", "release"]).toContain(metadata.mode);
  const expectedViewport = PROFILE_VIEWPORT[metadata.profile];
  expect(expectedViewport).toBeDefined();
  const bundleResponse = await request.get("/export-artifacts/html5-preview/bundle.json");
  expect(bundleResponse.ok()).toBe(true);
  const bundle = await bundleResponse.json();
  expect(bundle.schema_version).toBe(1);
  expect(bundle.kind).toBe("html5_profile_preview");
  expect(bundle.entrypoint).toBe("index.html");
  expect(bundle.runtime).toBe("runtime.js");
  expect(bundle.scenes).toBe("scenes.json");
  expect(bundle.metadata).toBe("metadata.json");
  expect(bundle.assets).toBe("assets/manifest.json");
  expect(bundle.profile).toBe(metadata.profile);
  expect(bundle.mode).toBe(metadata.mode);
  const assetsManifestResponse = await request.get(
    "/export-artifacts/html5-preview/assets/manifest.json"
  );
  expect(assetsManifestResponse.ok()).toBe(true);
  const assetsManifest = await assetsManifestResponse.json();
  expect(assetsManifest.schema_version).toBe(1);
  expect(assetsManifest.profile).toBe(metadata.profile);
  expect(assetsManifest.asset_count).toBe(0);
  expect(Array.isArray(assetsManifest.assets)).toBe(true);

  const sceneResponse = await request.get("/export-artifacts/html5-preview/scenes.json");
  expect(sceneResponse.ok()).toBe(true);
  const scenes = await sceneResponse.json();

  expect(Array.isArray(scenes)).toBe(true);
  expect(scenes.length).toBeGreaterThanOrEqual(2);
  expect(metadata.scene_count).toBe(scenes.length);
  for (const scene of scenes) {
    expect(scene.options?.width).toBe(expectedViewport.width);
    expect(scene.options?.height).toBe(expectedViewport.height);
  }

  for (const scene of scenes) {
    const rendered = await page.evaluate((sceneName) => {
      const bridge = window.__exportPreview;
      if (!bridge || typeof bridge.renderSceneByName !== "function") {
        return false;
      }
      return bridge.renderSceneByName(sceneName);
    }, scene.name);
    expect(rendered).toBe(true);

    const actual = await page.evaluate(() => {
      const bridge = window.__exportPreview;
      if (!bridge || typeof bridge.readPixels !== "function") {
        return [];
      }
      return bridge.readPixels();
    });
    const expected = buildScenePixelBuffer(scene);
    expect(actual.length).toBe(expected.length);

    let mismatchCount = 0;
    for (let i = 0; i < expected.length; i += 1) {
      if (actual[i] !== expected[i]) {
        mismatchCount += 1;
      }
    }
    expect(mismatchCount, `pixel drift detected for scene '${scene.name}'`).toBe(0);
  }
});

test("export preview supports primary entity movement controls", async ({ page }) => {
  await page.goto("/export-artifacts/html5-preview/index.html");

  const rendered = await page.evaluate(() => {
    const bridge = window.__exportPreview;
    if (!bridge || typeof bridge.renderSceneByName !== "function") {
      return false;
    }
    return bridge.renderSceneByName("single_tile_single_entity_frame0");
  });
  expect(rendered).toBe(true);

  const startPos = await page.evaluate(() => {
    const bridge = window.__exportPreview;
    if (!bridge || typeof bridge.getPrimaryEntityPosition !== "function") {
      return null;
    }
    return bridge.getPrimaryEntityPosition();
  });
  expect(startPos).not.toBeNull();
  expect(startPos.x).toBe(16);
  expect(startPos.y).toBe(16);

  const movedByBridge = await page.evaluate(() => {
    const bridge = window.__exportPreview;
    if (!bridge || typeof bridge.movePrimaryEntity !== "function") {
      return false;
    }
    return bridge.movePrimaryEntity(1, 0);
  });
  expect(movedByBridge).toBe(true);

  const afterBridgePos = await page.evaluate(() => window.__exportPreview.getPrimaryEntityPosition());
  expect(afterBridgePos.x).toBe(24);
  expect(afterBridgePos.y).toBe(16);

  await page.click("#export-viewport");
  await page.keyboard.press("ArrowDown");
  const afterKeyboardPos = await page.evaluate(() =>
    window.__exportPreview.getPrimaryEntityPosition()
  );
  expect(afterKeyboardPos.x).toBe(24);
  expect(afterKeyboardPos.y).toBe(24);
});
