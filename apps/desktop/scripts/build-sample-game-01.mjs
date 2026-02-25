import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { Buffer } from "node:buffer";

import { createAppState } from "../src/app-state.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../..");
const sampleRoot = path.resolve(repoRoot, "samples", "Sample Game 01");
const exportDir = path.join(sampleRoot, "export-preview");
const desktopServedExportDir = path.resolve(__dirname, "../export-artifacts/sample-game-01");
const sampleAudioDir = path.join(sampleRoot, "assets", "audio");

function createSilentWavBuffer(durationMs = 250, sampleRate = 22050) {
  const channels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const byteRate = sampleRate * channels * bytesPerSample;
  const blockAlign = channels * bytesPerSample;
  const sampleCount = Math.max(1, Math.floor((durationMs / 1000) * sampleRate));
  const dataSize = sampleCount * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  return buffer;
}

const SAMPLE_SCRIPT_GRAPH = {
  nodes: [
    { id: "event_move_input", kind: "event" },
    { id: "flow_branch_walkable", kind: "flow" },
    { id: "cond_next_tile_walkable", kind: "condition" },
    { id: "cond_next_tile_has_crate", kind: "condition" },
    { id: "cond_crate_target_free", kind: "condition" },
    { id: "action_push_crate", kind: "action" },
    { id: "action_move_player", kind: "action" },
    { id: "action_check_goals", kind: "action" },
    { id: "cond_all_crates_on_goal", kind: "condition" },
    { id: "action_level_complete", kind: "action" },
  ],
  edges: [
    { from: "event_move_input", to: "flow_branch_walkable" },
    { from: "flow_branch_walkable", to: "cond_next_tile_walkable" },
    { from: "cond_next_tile_walkable", to: "action_move_player" },
    { from: "flow_branch_walkable", to: "cond_next_tile_has_crate" },
    { from: "cond_next_tile_has_crate", to: "cond_crate_target_free" },
    { from: "cond_crate_target_free", to: "action_push_crate" },
    { from: "action_push_crate", to: "action_move_player" },
    { from: "action_move_player", to: "action_check_goals" },
    { from: "action_check_goals", to: "cond_all_crates_on_goal" },
    { from: "cond_all_crates_on_goal", to: "action_level_complete" },
  ],
};

function runNativeExportPreview({ projectDir: projectDirHint, ...editorState }) {
  const payload = JSON.stringify({
    outputDir: exportDir,
    projectDir: projectDirHint ?? null,
    profile: "game_boy",
    debug: false,
    editorState,
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
    const details = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`native export-preview failed\n${details}`);
  }
  return {
    command: `cargo ${args.join(" ")}`,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  };
}

async function buildSample() {
  await rm(sampleRoot, { recursive: true, force: true });
  await mkdir(exportDir, { recursive: true });
  await mkdir(sampleAudioDir, { recursive: true });
  const themePath = path.join(sampleAudioDir, "theme.wav");
  const stepPath = path.join(sampleAudioDir, "step.wav");
  const pickupPath = path.join(sampleAudioDir, "pickup.wav");
  await writeFile(themePath, createSilentWavBuffer());
  await writeFile(stepPath, createSilentWavBuffer(120));
  await writeFile(pickupPath, createSilentWavBuffer(180));

  const app = createAppState();
  await app.open(".");
  await app.newProjectFromTemplate("puzzle");

  // Add two crates and a blocker prop in deterministic positions.
  await app.generatePrimitiveAsset("crate", "game_boy", {
    baseX: 5,
    baseY: 2,
    points: [
      { x: 5, y: 2 },
      { x: 6, y: 2 },
      { x: 5, y: 3 },
      { x: 6, y: 3 },
    ],
  });
  await app.generatePrimitiveAsset("crate", "game_boy", {
    baseX: 8,
    baseY: 3,
    points: [
      { x: 8, y: 3 },
      { x: 9, y: 3 },
      { x: 8, y: 4 },
      { x: 9, y: 4 },
    ],
  });
  await app.generatePrimitiveAsset("rock", "game_boy", {
    baseX: 7,
    baseY: 5,
    points: [
      { x: 7, y: 5 },
      { x: 8, y: 5 },
      { x: 8, y: 6 },
    ],
  });

  // Add a few explicit "goal" tiles to make the puzzle intent visible in snapshot.
  await app.paintTileAt(10, 2, 1);
  await app.paintTileAt(10, 3, 1);
  await app.paintTileAt(10, 4, 1);

  await app.enterPlaytest();
  await app.setTraceEnabled(true);
  await app.setBreakpoints(["item_pickup"]);
  await app.tickPlaytest(2100);
  const snapshot = app.snapshot();
  await app.exitPlaytest();

  const exportRun = runNativeExportPreview({
    entities: snapshot.entities,
    tiles: snapshot.tiles,
    // projectDir is required so export-core can resolve absolute assetPath values.
    // Audio files live under sampleRoot, which satisfies the starts_with security check.
    projectDir: sampleRoot,
    audio: [
      { id: "theme", name: "Theme", assetPath: themePath },
      { id: "step", name: "Step", assetPath: stepPath },
      { id: "pickup", name: "Pickup", assetPath: pickupPath },
    ],
    audioBindings: {
      item_pickup: "pickup",
      ui_open: "theme",
    },
    audioEvents: [{ event: "battle_start", audioId: "theme" }],
    playtest: { frame: snapshot.playtest.frame },
  });
  await rm(desktopServedExportDir, { recursive: true, force: true });
  await cp(exportDir, desktopServedExportDir, { recursive: true });

  await writeFile(
    path.join(sampleRoot, "project-snapshot.json"),
    JSON.stringify(snapshot, null, 2),
    "utf8"
  );
  await writeFile(
    path.join(sampleRoot, "script-graph.json"),
    JSON.stringify(SAMPLE_SCRIPT_GRAPH, null, 2),
    "utf8"
  );
  await writeFile(
    path.join(sampleRoot, "build-report.json"),
    JSON.stringify(
      {
        sample_name: "Sample Game 01",
        profile: "game_boy",
        runtime_mode: snapshot.runtimeMode,
        entity_count: snapshot.entities.length,
        tile_count: snapshot.tiles.length,
        breakpoint_hit: snapshot.lastBreakpointHit,
        audio_clip_count: 3,
        audio_binding_count: 3,
        export_command: exportRun.command,
        export_stdout: exportRun.stdout,
      },
      null,
      2
    ),
    "utf8"
  );
  await writeFile(
    path.join(sampleRoot, "README.md"),
    [
      "# Sample Game 01",
      "",
      "Generated by `apps/desktop/scripts/build-sample-game-01.mjs`.",
      "",
      "## Contents",
      "- `project-snapshot.json`: editor state snapshot produced by dogfood build flow.",
      "- `script-graph.json`: puzzle no-code logic scaffold used for this sample.",
      "- `build-report.json`: generation metadata + export command output.",
      "- `export-preview/`: native export-core HTML5 preview bundle.",
      "",
      "## Notes",
      "- This sample exports authored map content (entities/tiles + frame state) through the desktop invoke export path.",
      "- It proves end-to-end tool usage: template scaffold, entity/tile edits, playtest trace/breakpoint, and authored export artifact generation.",
      "- For easy local viewing, export files are mirrored to `apps/desktop/export-artifacts/sample-game-01`.",
      "- Start `apps/desktop/scripts/static-server.mjs` and open `/export-artifacts/sample-game-01/index.html`.",
      "",
    ].join("\n"),
    "utf8"
  );

  process.stdout.write(`sample build complete: ${sampleRoot}\n`);
}

await buildSample();
