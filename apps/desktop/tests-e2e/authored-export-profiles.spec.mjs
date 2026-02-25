import { test, expect } from "@playwright/test";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(desktopRoot, "..", "..");

const PROFILE_VIEWPORT = {
  game_boy: { width: 160, height: 144 },
  nes: { width: 256, height: 240 },
  snes: { width: 256, height: 224 },
};

function buildAuthoredExportArtifactForProfile(profile) {
  const outputDir = path.resolve(desktopRoot, "export-artifacts", `authored-${profile}`);
  const payload = JSON.stringify({
    outputDir,
    profile,
    debug: false,
    editorState: {
      entities: [
        { id: 1, name: `Player ${profile}`, position: { x: 16, y: 16 } },
        { id: 2, name: `Crate ${profile}`, position: { x: 32, y: 16 } },
      ],
      tiles: [
        { x: 0, y: 0, tile_id: 1 },
        { x: 1, y: 0, tile_id: 2 },
        { x: 2, y: 0, tile_id: 1 },
      ],
      playtest: { frame: 7 },
    },
  });
  const args = [
    "run",
    "-p",
    "gcs-desktop",
    "--bin",
    "gcs-desktop",
    "--",
    "invoke",
    "export_preview_html5",
    payload,
  ];
  const result = spawnSync("cargo", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.status !== 0) {
    throw new Error(
      [
        `failed to build authored export artifact for profile '${profile}'`,
        result.error ? String(result.error) : "",
        result.stdout?.trim() || "",
        result.stderr?.trim() || "",
      ]
        .filter(Boolean)
        .join("\n")
    );
  }
  return { outputDir, routeBase: `/export-artifacts/authored-${profile}` };
}

test("authored export profile lanes package assets and render at expected viewport sizes", async ({
  page,
  request,
}) => {
  for (const profile of Object.keys(PROFILE_VIEWPORT)) {
    const expected = PROFILE_VIEWPORT[profile];
    const { routeBase } = buildAuthoredExportArtifactForProfile(profile);

    const metadataResponse = await request.get(`${routeBase}/metadata.json`);
    expect(metadataResponse.ok()).toBe(true);
    const metadata = await metadataResponse.json();
    expect(metadata.schema_version).toBe(1);
    expect(metadata.profile).toBe(profile);
    expect(metadata.scene_count).toBe(1);

    const scenesResponse = await request.get(`${routeBase}/scenes.json`);
    expect(scenesResponse.ok()).toBe(true);
    const scenes = await scenesResponse.json();
    expect(Array.isArray(scenes)).toBe(true);
    expect(scenes).toHaveLength(1);
    expect(scenes[0].name).toBe("authored_map_preview");
    expect(scenes[0].options.width).toBe(expected.width);
    expect(scenes[0].options.height).toBe(expected.height);
    expect(scenes[0].snapshot.playtest.frame).toBe(7);

    const manifestResponse = await request.get(`${routeBase}/assets/manifest.json`);
    expect(manifestResponse.ok()).toBe(true);
    const manifest = await manifestResponse.json();
    expect(manifest.schema_version).toBe(1);
    expect(manifest.profile).toBe(profile);
    expect(manifest.asset_count).toBeGreaterThan(0);
    expect(Array.isArray(manifest.assets)).toBe(true);
    expect(manifest.assets.length).toBe(manifest.asset_count);

    const firstAssetPath = String(manifest.assets[0]?.path || "");
    expect(firstAssetPath.length).toBeGreaterThan(0);
    const firstAssetResponse = await request.get(`${routeBase}/${firstAssetPath}`);
    expect(firstAssetResponse.ok()).toBe(true);

    await page.goto(`${routeBase}/index.html`);
    await page.waitForFunction(() => {
      const bridge = window.__exportPreview;
      return !!bridge && typeof bridge.getLoadedAssetCount === "function";
    });
    const loadedAssetCount = await page.evaluate(() => window.__exportPreview.getLoadedAssetCount());
    expect(loadedAssetCount).toBeGreaterThan(0);

    const rendered = await page.evaluate(() => window.__exportPreview.renderSceneByName("authored_map_preview"));
    expect(rendered).toBe(true);
    const canvasSize = await page.evaluate(() => {
      const canvas = document.getElementById("export-viewport");
      if (!(canvas instanceof HTMLCanvasElement)) {
        return null;
      }
      return { width: canvas.width, height: canvas.height };
    });
    expect(canvasSize).not.toBeNull();
    expect(canvasSize.width).toBe(expected.width);
    expect(canvasSize.height).toBe(expected.height);
  }
});
