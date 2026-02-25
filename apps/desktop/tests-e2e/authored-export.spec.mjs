import { test, expect } from "@playwright/test";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopRoot = path.resolve(__dirname, "..");

function buildSampleGameArtifact() {
  const result = spawnSync(process.execPath, ["scripts/build-sample-game-01.mjs"], {
    cwd: desktopRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.status !== 0) {
    throw new Error(
      [
        "failed to build sample authored export artifact",
        result.error ? String(result.error) : "",
        result.stdout?.trim() || "",
        result.stderr?.trim() || "",
      ]
        .filter(Boolean)
        .join("\n")
    );
  }
}

test("authored export artifact loads packaged assets in browser runtime", async ({
  page,
  request,
}) => {
  buildSampleGameArtifact();

  const manifestResponse = await request.get(
    "/export-artifacts/sample-game-01/assets/manifest.json"
  );
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest.schema_version).toBe(1);
  expect(manifest.asset_count).toBeGreaterThan(0);
  expect(Array.isArray(manifest.assets)).toBe(true);
  expect(manifest.assets.length).toBeGreaterThan(0);
  const audioAssets = manifest.assets.filter((asset) => String(asset?.kind || "") === "audio_clip");
  expect(audioAssets.length).toBeGreaterThan(0);
  const starterAssets = manifest.assets.filter((asset) =>
    String(asset?.source || "").startsWith("starter_pack://")
  );
  expect(starterAssets.length).toBeGreaterThan(0);
  expect(
    starterAssets.some((asset) => String(asset?.path || "").startsWith("assets/starter/"))
  ).toBe(true);

  const firstAsset = manifest.assets[0];
  const assetPath = String(firstAsset?.path || "");
  expect(assetPath.length).toBeGreaterThan(0);
  const assetResponse = await request.get(`/export-artifacts/sample-game-01/${assetPath}`);
  expect(assetResponse.ok()).toBe(true);
  const starterAssetPath = String(starterAssets[0]?.path || "");
  expect(starterAssetPath.length).toBeGreaterThan(0);
  const starterAssetResponse = await request.get(
    `/export-artifacts/sample-game-01/${starterAssetPath}`
  );
  expect(starterAssetResponse.ok()).toBe(true);
  const audioAssetPath = String(audioAssets[0]?.path || "");
  expect(audioAssetPath.length).toBeGreaterThan(0);
  const audioAssetResponse = await request.get(
    `/export-artifacts/sample-game-01/${audioAssetPath}`
  );
  expect(audioAssetResponse.ok()).toBe(true);
  const metadataResponse = await request.get("/export-artifacts/sample-game-01/metadata.json");
  expect(metadataResponse.ok()).toBe(true);
  const metadata = await metadataResponse.json();
  expect(metadata.schema_version).toBe(1);
  expect(metadata.audio_bindings.item_pickup).toBe("audio_pickup");
  expect(metadata.audio_bindings.ui_open).toBe("audio_theme");
  expect(metadata.audio_bindings.battle_start).toBe("audio_theme");

  await page.goto("/export-artifacts/sample-game-01/index.html");
  await page.waitForFunction(() => {
    const bridge = window.__exportPreview;
    return (
      !!bridge &&
      typeof bridge.getLoadedAssetCount === "function" &&
      typeof bridge.getLoadedAudioCount === "function"
    );
  });
  const loadedAssetCount = await page.evaluate(() => {
    const bridge = window.__exportPreview;
    if (!bridge || typeof bridge.getLoadedAssetCount !== "function") {
      return -1;
    }
    return bridge.getLoadedAssetCount();
  });
  expect(loadedAssetCount).toBeGreaterThan(0);
  const loadedAudioCount = await page.evaluate(() => {
    const bridge = window.__exportPreview;
    if (!bridge || typeof bridge.getLoadedAudioCount !== "function") {
      return -1;
    }
    return bridge.getLoadedAudioCount();
  });
  expect(loadedAudioCount).toBeGreaterThan(0);

  const audioBridgeState = await page.evaluate(() => {
    const bridge = window.__exportPreview;
    if (
      !bridge ||
      typeof bridge.listAudioIds !== "function" ||
      typeof bridge.hasAudioAsset !== "function"
    ) {
      return { ids: [], hasTheme: false };
    }
    return {
      ids: bridge.listAudioIds(),
      hasTheme: bridge.hasAudioAsset("audio_theme"),
      hasStep: bridge.hasAudioAsset("audio_step"),
    };
  });
  expect(audioBridgeState.ids.length).toBeGreaterThan(0);
  expect(audioBridgeState.hasTheme).toBe(true);
  expect(audioBridgeState.hasStep).toBe(true);

  const audioPlaybackTelemetry = await page.evaluate(() => {
    const bridge = window.__exportPreview;
    if (
      !bridge ||
      typeof bridge.getAudioPlaybackEventCount !== "function" ||
      typeof bridge.getAudioPlaybackEvents !== "function" ||
      typeof bridge.getPrimaryEntityPosition !== "function"
    ) {
      return { supported: false, before: -1, after: -1, moved: false, events: [] };
    }
    const before = bridge.getAudioPlaybackEventCount();
    let moved = false;
    const attempts = ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"];
    for (const key of attempts) {
      const beforePos = bridge.getPrimaryEntityPosition();
      window.dispatchEvent(new window.KeyboardEvent("keydown", { key }));
      const afterPos = bridge.getPrimaryEntityPosition();
      if (
        beforePos &&
        afterPos &&
        (beforePos.x !== afterPos.x || beforePos.y !== afterPos.y)
      ) {
        moved = true;
        break;
      }
    }
    const after = bridge.getAudioPlaybackEventCount();
    return {
      supported: true,
      before,
      after,
      moved,
      events: bridge.getAudioPlaybackEvents(),
    };
  });
  expect(audioPlaybackTelemetry.supported).toBe(true);
  expect(audioPlaybackTelemetry.moved).toBe(true);
  expect(audioPlaybackTelemetry.after).toBeGreaterThanOrEqual(audioPlaybackTelemetry.before + 1);
  expect(
    audioPlaybackTelemetry.events.some(
      (event) => event && event.id === "audio_step" && event.source === "movement"
    )
  ).toBe(true);

  const gameplayAudioHook = await page.evaluate(async () => {
    const bridge = window.__exportPreview;
    if (
      !bridge ||
      typeof bridge.getAudioBindings !== "function" ||
      typeof bridge.triggerGameplayEventAudio !== "function" ||
      typeof bridge.getAudioPlaybackEventCount !== "function" ||
      typeof bridge.getAudioPlaybackEvents !== "function"
    ) {
      return { supported: false };
    }
    const bindings = bridge.getAudioBindings();
    const before = bridge.getAudioPlaybackEventCount();
    const result = await bridge.triggerGameplayEventAudio("item_pickup", {
      restart: true,
      volume: 0.4,
    });
    const after = bridge.getAudioPlaybackEventCount();
    return {
      supported: true,
      bindings,
      before,
      after,
      result,
      events: bridge.getAudioPlaybackEvents(),
    };
  });
  expect(gameplayAudioHook.supported).toBe(true);
  expect(gameplayAudioHook.bindings.item_pickup).toBe("audio_pickup");
  expect(gameplayAudioHook.result.event).toBe("item_pickup");
  expect(gameplayAudioHook.result.audioId).toBe("audio_pickup");
  expect(gameplayAudioHook.after).toBeGreaterThanOrEqual(gameplayAudioHook.before + 1);
  expect(
    gameplayAudioHook.events.some(
      (event) => event && event.id === "audio_pickup" && event.source === "gameplay:item_pickup"
    )
  ).toBe(true);

  const rendered = await page.evaluate(() => {
    const bridge = window.__exportPreview;
    if (!bridge || typeof bridge.renderSceneByName !== "function") {
      return false;
    }
    return bridge.renderSceneByName("authored_map_preview");
  });
  expect(rendered).toBe(true);
});
