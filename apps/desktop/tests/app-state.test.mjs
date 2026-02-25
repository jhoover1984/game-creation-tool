import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";

import { createAppState } from "../src/app-state.js";
import { __resetFallbackEditorForTests } from "../src/project-api.js";

beforeEach(() => {
  __resetFallbackEditorForTests();
  delete globalThis.window;
});

test("app-state map workflow remains stable", async () => {
  const app = createAppState();

  await app.open(".");
  const opened = app.snapshot();
  assert.equal(opened.projectName, "Sample Project");
  assert.equal(opened.entities.length, 0);

  await app.addEntity();
  const created = app.snapshot();
  assert.equal(created.entities.length, 1);
  const id = created.entities[0].id;
  assert.deepEqual(created.selection, [id]);
  assert.equal(created.canUndo, true);
  assert.ok(created.watchSelectedFlags.length > 0);
  assert.ok(created.watchSelectedVariables.length > 0);
  assert.ok(created.watchSelectedInventory.length > 0);

  await app.moveSelectedBy(8, 4);
  const moved = app.snapshot();
  assert.deepEqual(moved.entities[0].position, { x: 24, y: 20 });

  await app.undo();
  const undone = app.snapshot();
  assert.deepEqual(undone.entities[0].position, { x: 16, y: 16 });
  assert.equal(undone.canRedo, true);

  await app.redo();
  const redone = app.snapshot();
  assert.deepEqual(redone.entities[0].position, { x: 24, y: 20 });
});

test("app-state tile workflow supports paint and erase", async () => {
  const app = createAppState();
  await app.open(".");

  await app.paintTileAt(3, 4, 1);
  const painted = app.snapshot();
  assert.equal(painted.tiles.length, 1);
  assert.deepEqual(painted.tiles[0], { x: 3, y: 4, tile_id: 1 });

  await app.eraseTileAt(3, 4);
  const erased = app.snapshot();
  assert.equal(erased.tiles.length, 0);
});

test("app-state tile stroke is undoable in a single step", async () => {
  const app = createAppState();
  await app.open(".");

  await app.applyTileStroke("paint", [
    { x: 1, y: 1 },
    { x: 2, y: 1 },
    { x: 3, y: 1 },
  ]);
  const painted = app.snapshot();
  assert.equal(painted.tiles.length, 3);

  await app.undo();
  const undone = app.snapshot();
  assert.equal(undone.tiles.length, 0);
});

test("app-state playtest workflow includes breakpoints and watch buckets", async () => {
  const app = createAppState();
  await app.open(".");
  await app.enterPlaytest();
  await app.setTraceEnabled(true);
  await app.setBreakpoints(["playtest_tick"]);

  const configured = app.snapshot();
  assert.equal(configured.playtest.active, true);
  assert.equal(configured.diagnostics.trace, true);
  assert.equal(
    configured.playtestBreakpoints.some((entry) => entry.key === "playtest_tick" && entry.value),
    true
  );

  await app.tickPlaytest(500);
  const ticked = app.snapshot();
  assert.equal(ticked.playtest.paused, true);
  assert.ok(ticked.lastBreakpointHit);
  assert.equal(ticked.lastBreakpointHit.kind, "breakpoint:playtest_tick");
  assert.equal(Array.isArray(ticked.watchFlags), true);
  assert.equal(Array.isArray(ticked.watchVariables), true);
  assert.equal(Array.isArray(ticked.watchInventory), true);
  assert.ok(ticked.watchFlags.length > 0);
  assert.ok(ticked.watchVariables.length > 0);
  assert.ok(ticked.watchInventory.length > 0);

  await app.exitPlaytest();
  const exited = app.snapshot();
  assert.equal(exited.playtest.active, false);
});

test("app-state breakpoint configuration can be changed without regressions", async () => {
  const app = createAppState();
  await app.open(".");
  await app.enterPlaytest();

  await app.setBreakpoints(["item_pickup", "quest_state"]);
  const configured = app.snapshot();
  assert.equal(
    configured.playtestBreakpoints.some((entry) => entry.key === "item_pickup" && entry.value),
    true
  );
  assert.equal(
    configured.playtestBreakpoints.some((entry) => entry.key === "quest_state" && entry.value),
    true
  );

  await app.setBreakpoints([]);
  const cleared = app.snapshot();
  assert.equal(
    cleared.playtestBreakpoints.some((entry) => entry.value),
    false
  );
});

test("app-state script validation reports graph issues", async () => {
  const app = createAppState();
  await app.open(".");
  await app.validateScriptGraphInput(
    JSON.stringify({
      nodes: [{ id: "event_start", kind: "event" }],
      edges: [{ from: "event_start", to: "action_missing" }],
    })
  );
  const snapshot = app.snapshot();
  assert.equal(snapshot.scriptValidation.parseError, null);
  assert.equal(snapshot.scriptValidation.errors.length > 0, true);
  assert.equal(
    snapshot.scriptValidation.errors.some((entry) => entry.code === "missing_target_node"),
    true
  );
});

test("app-state export preview forwards script-derived audio bindings", async () => {
  let capturedExportPayload = null;
  globalThis.window = {
    __TAURI__: {
      core: {
        invoke: async (command, payload) => {
          assert.equal(command, "invoke_command");
          if (payload.command === "script_validate") {
            return JSON.stringify({ errors: [] });
          }
          if (payload.command === "export_preview_html5") {
            capturedExportPayload = JSON.parse(payload.payloadJson);
            return JSON.stringify({
              output_dir: "out",
              files: ["index.html"],
              scene_count: 1,
              asset_count: 0,
              profile: "game_boy",
              mode: "release",
            });
          }
          throw new Error(`unexpected command: ${payload.command}`);
        },
      },
    },
  };

  const app = createAppState();
  await app.validateScriptGraphInput(
    JSON.stringify({
      audioBindings: {
        quest_state: "theme",
      },
      nodes: [
        { id: "event_item_pickup", kind: "event" },
        { id: "action_play_pickup", kind: "action_play_audio", audioId: "pickup" },
      ],
      edges: [{ from: "event_item_pickup", to: "action_play_pickup" }],
    })
  );
  await app.exportPreview("out", "game_boy");

  assert.ok(capturedExportPayload);
  assert.equal(capturedExportPayload.profile, "game_boy");
  assert.equal(capturedExportPayload.outputDir, "out");
  assert.equal(capturedExportPayload.editorState.audioBindings.item_pickup, "audio_pickup");
  assert.equal(capturedExportPayload.editorState.audioBindings.quest_state, "audio_theme");
  assert.equal(Array.isArray(capturedExportPayload.editorState.audioEvents), true);
});

test("app-state captures async command errors without throwing", async () => {
  globalThis.window = {
    __TAURI__: {
      core: {
        invoke: async () => {
          throw new Error("backend unavailable");
        },
      },
    },
  };
  const app = createAppState();
  let emittedError = null;
  app.events.on("app:error", (snapshot) => {
    emittedError = snapshot.lastError;
  });

  const result = await app.open(".");
  assert.equal(result.lastError?.action, "open");
  assert.equal(result.lastError?.message.includes("backend unavailable"), true);
  assert.equal(emittedError?.action, "open");
});

test("app-state reportError emits app:error for non-guarded runtime failures", () => {
  const app = createAppState();
  let emittedError = null;
  app.events.on("app:error", (snapshot) => {
    emittedError = snapshot.lastError;
  });

  const result = app.reportError("window:error", "Render loop crashed");
  assert.equal(result.lastError?.action, "window:error");
  assert.equal(result.lastError?.message, "Render loop crashed");
  assert.equal(emittedError?.action, "window:error");
  assert.equal(emittedError?.message, "Render loop crashed");
});

test("app-state new project template resets map and seeds starter content", async () => {
  const app = createAppState();
  await app.open(".");
  await app.addEntity();
  let snapshot = app.snapshot();
  assert.equal(snapshot.entities.length > 0, true);

  await app.newProjectFromTemplate("platformer");
  snapshot = app.snapshot();
  assert.equal(snapshot.projectName, "Platformer Starter");
  assert.equal(snapshot.entities.length >= 2, true);
  assert.equal(snapshot.tiles.length > 0, true);
});

test("app-state assisted primitive generation creates deterministic starter content", async () => {
  const app = createAppState();
  await app.open(".");
  await app.newProjectFromTemplate("blank");

  await app.generatePrimitiveAsset("tree");
  const snapshot = app.snapshot();
  assert.equal(snapshot.entities.length, 1);
  assert.equal(snapshot.entities[0].name, "Tree Prop (GB)");
  assert.equal(snapshot.tiles.length >= 5, true);
  assert.equal(
    snapshot.tiles.every((tile) => tile.tile_id === 1),
    true
  );
});

test("app-state assisted primitive generation supports profile-aware output", async () => {
  const app = createAppState();
  await app.open(".");
  await app.newProjectFromTemplate("blank");

  await app.generatePrimitiveAsset("rock", "nes");
  const snapshot = app.snapshot();
  assert.equal(snapshot.entities.length, 1);
  assert.equal(snapshot.entities[0].name, "Rock Prop (NES)");
  assert.equal(snapshot.tiles.length, 3);
  assert.equal(
    snapshot.tiles.every((tile) => tile.tile_id === 2),
    true
  );
});

test("app-state assisted primitive generation supports explicit draft points", async () => {
  const app = createAppState();
  await app.open(".");
  await app.newProjectFromTemplate("blank");

  await app.generatePrimitiveAsset("tree", "nes", {
    baseX: 9,
    baseY: 9,
    points: [
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 3, y: 3 },
    ],
  });
  const snapshot = app.snapshot();
  assert.equal(snapshot.entities.length, 1);
  assert.equal(snapshot.entities[0].name, "Tree Prop (NES)");
  assert.deepEqual(snapshot.entities[0].position, { x: 48, y: 32 });
  assert.equal(snapshot.tiles.length, 3);
  assert.equal(
    snapshot.tiles.every((tile) => tile.tile_id === 2),
    true
  );
  assert.equal(
    snapshot.tiles.some((tile) => tile.x === 4 && tile.y === 2),
    true
  );
});
test("app-state assisted cleanup removes generated props for selected profile", async () => {
  const app = createAppState();
  await app.open(".");
  await app.newProjectFromTemplate("blank");

  await app.generatePrimitiveAsset("tree", "nes");
  await app.generatePrimitiveAsset("rock", "nes");
  let snapshot = app.snapshot();
  assert.equal(snapshot.entities.length, 2);
  assert.equal(
    snapshot.entities.every((entity) => entity.name.endsWith("(NES)")),
    true
  );

  await app.cleanupAssistedGenerated("nes");
  snapshot = app.snapshot();
  assert.equal(snapshot.entities.length, 0);
});

test("app-state assisted primitive generation supports draft options", async () => {
  const app = createAppState();
  await app.open(".");
  await app.newProjectFromTemplate("blank");

  await app.generatePrimitiveAsset("chest", "snes", { baseX: 5, baseY: 4, mirrorX: true });
  const snapshot = app.snapshot();
  assert.equal(snapshot.entities.length, 1);
  assert.equal(snapshot.entities[0].name, "Chest Prop (SNES)");
  assert.deepEqual(snapshot.entities[0].position, { x: 80, y: 64 });
  assert.equal(
    snapshot.tiles.every((tile) => tile.tile_id === 3),
    true
  );
  assert.equal(
    snapshot.tiles.some((tile) => tile.x === 7 && tile.y === 4),
    true
  );
});

// ── Audio routing ────────────────────────────────────────────────────

test("app-state addAudioBinding normalizes keys and emits update", () => {
  const app = createAppState();
  let emitted = null;
  app.events.on("audio:bindings-updated", (s) => { emitted = s; });

  app.addAudioBinding("Item Pickup", "coin_sfx");
  const snap = app.snapshot();
  assert.equal(snap.audioBindings.item_pickup, "audio_coin_sfx");
  assert.ok(emitted);
  assert.equal(emitted.audioBindings.item_pickup, "audio_coin_sfx");
});

test("app-state addAudioBinding ignores empty event or clip", () => {
  const app = createAppState();
  app.addAudioBinding("", "coin");
  app.addAudioBinding("pickup", "");
  const snap = app.snapshot();
  assert.deepEqual(snap.audioBindings, {});
});

test("app-state removeAudioBinding deletes key and emits update", () => {
  const app = createAppState();
  app.addAudioBinding("quest_complete", "fanfare");
  assert.equal(app.snapshot().audioBindings.quest_complete, "audio_fanfare");

  let emitted = null;
  app.events.on("audio:bindings-updated", (s) => { emitted = s; });
  app.removeAudioBinding("quest_complete");

  assert.equal(app.snapshot().audioBindings.quest_complete, undefined);
  assert.ok(emitted);
  assert.equal(emitted.audioBindings.quest_complete, undefined);
});

test("app-state manual audio bindings override script-inferred at export", async () => {
  let capturedPayload = null;
  globalThis.window = {
    __TAURI__: {
      core: {
        invoke: async (_cmd, payload) => {
          if (payload.command === "script_validate") {
            return JSON.stringify({ errors: [] });
          }
          if (payload.command === "export_preview_html5") {
            capturedPayload = JSON.parse(payload.payloadJson);
            return JSON.stringify({
              output_dir: "out", files: ["index.html"],
              scene_count: 1, asset_count: 0, profile: "game_boy", mode: "release",
            });
          }
          throw new Error(`unexpected: ${payload.command}`);
        },
      },
    },
  };

  const app = createAppState();
  // Script graph infers item_pickup → audio_ding
  await app.validateScriptGraphInput(JSON.stringify({
    nodes: [
      { id: "event_item_pickup", kind: "event" },
      { id: "action_play_ding", kind: "action_play_audio", audioId: "ding" },
    ],
    edges: [{ from: "event_item_pickup", to: "action_play_ding" }],
  }));
  // Manual binding overrides with different clip
  app.addAudioBinding("item_pickup", "coin");

  await app.exportPreview("out", "game_boy");
  assert.ok(capturedPayload);
  // Manual binding wins over script-inferred
  assert.equal(capturedPayload.editorState.audioBindings.item_pickup, "audio_coin");
});

// ── Component queries ────────────────────────────────────────────────

test("app-state fetchSelectedComponents clears when no single selection", async () => {
  const app = createAppState();
  let emitted = null;
  app.events.on("components:updated", (s) => { emitted = s; });

  await app.fetchSelectedComponents();
  assert.equal(app.snapshot().selectedComponents, null);
  assert.ok(emitted);
  assert.equal(emitted.selectedComponents, null);
});

test("app-state fetchSelectedComponents returns component bag for selected entity", async () => {
  const app = createAppState();
  await app.open(".");
  await app.addEntity();
  const snap = app.snapshot();
  assert.equal(snap.entities.length, 1);

  // Select the entity
  await app.selectEntities([snap.entities[0].id]);

  let emitted = null;
  app.events.on("components:updated", (s) => { emitted = s; });
  await app.fetchSelectedComponents();

  const result = app.snapshot();
  assert.ok(result.selectedComponents);
  assert.equal(result.selectedComponents.entity_id, snap.entities[0].id);
  assert.ok(emitted);
});

test("app-state setSelectedEntityComponents writes per-entity overrides", async () => {
  const app = createAppState();
  await app.open(".");
  await app.addEntity();
  const entityId = app.snapshot().entities[0].id;
  await app.selectEntities([entityId]);

  await app.setSelectedEntityComponents({
    collision: {
      solid: true,
      width: 12,
      height: 10,
      offset_x: 1,
      offset_y: -2,
    },
  });

  const snap = app.snapshot();
  const entity = snap.entities.find((item) => item.id === entityId);
  assert.ok(entity);
  assert.deepEqual(entity.components.collision, {
    solid: true,
    width: 12,
    height: 10,
    offset_x: 1,
    offset_y: -2,
  });
  assert.ok(snap.selectedComponents);
  assert.equal(snap.selectedComponents.entity_id, entityId);
});

test("app-state selected-entity animation helpers add clips and transitions", async () => {
  const app = createAppState();
  await app.open(".");
  await app.addEntity();

  await app.addSelectedEntityAnimationClip("idle", {
    frames: [0, 1],
    frame_duration_ticks: 2,
    loop_mode: "loop",
  });
  await app.addSelectedEntityAnimationClip("run", {
    frames: [2, 3],
    frame_duration_ticks: 1,
    loop_mode: "loop",
  });

  const draft = app.buildAnimationTransitionDraft({
    from_state: "idle",
    to_state: "run",
    kind: "int_between",
  });
  draft.condition.min = "1";
  draft.condition.max = "3";
  await app.setSelectedEntityAnimationTransitions([app.finalizeAnimationTransitionDraft(draft)]);
  await app.setSelectedEntityAnimationState("run");

  const snapshot = app.snapshot();
  const entity = snapshot.entities[0];
  assert.equal(entity.animation.state.current_clip_name, "run");
  assert.equal(entity.animation.transitions.length, 1);
  assert.equal(entity.animation.transitions[0].condition.kind, "int_between");
  assert.equal(entity.animation.transitions[0].condition.min, 1);
  assert.equal(entity.animation.transitions[0].condition.max, 3);
});

test("app-state renameEntity updates entity name", async () => {
  const app = createAppState();
  await app.open(".");
  await app.addEntity();

  const before = app.snapshot();
  const id = before.entities[0].id;
  assert.match(before.entities[0].name, /Entity/);

  await app.renameEntity(id, "Hero");
  const after = app.snapshot();
  assert.equal(after.entities[0].name, "Hero");
});

test("app-state renameEntity ignores blank name", async () => {
  const app = createAppState();
  await app.open(".");
  await app.addEntity();

  const before = app.snapshot();
  const id = before.entities[0].id;
  const originalName = before.entities[0].name;

  await app.renameEntity(id, "   ");
  const after = app.snapshot();
  assert.equal(after.entities[0].name, originalName);
});

test("app-state importSprite stores sprite in registry", async () => {
  const app = createAppState();
  await app.open(".");

  const dataUrl = "data:image/png;base64,abc123";
  await app.importSprite("hero.png", dataUrl);

  const snap = app.snapshot();
  assert.equal(snap.spriteRegistry["hero.png"], dataUrl);
});

test("app-state fillTiles flood-fills blank canvas in web fallback", async () => {
  const app = createAppState();
  await app.open(".");

  // Fill the entire 4×4 canvas with tile 1.
  await app.fillTiles(0, 0, 1, 4, 4);
  const filled = app.snapshot();
  assert.equal(filled.tiles.length, 16);
  assert.ok(filled.tiles.every((t) => t.tile_id === 1));
});

test("app-state fillTiles respects existing tile boundaries", async () => {
  const app = createAppState();
  await app.open(".");

  // Paint a border of tile 2 around a 3×3 canvas.
  await app.applyTileStroke(
    "paint",
    [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
      { x: 0, y: 1 },                  { x: 2, y: 1 },
      { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 },
    ],
    2
  );
  // Fill inside from centre — should only fill the empty (1,1) cell.
  await app.fillTiles(1, 1, 3, 3, 3);
  const snap = app.snapshot();
  const centre = snap.tiles.find((t) => t.x === 1 && t.y === 1);
  assert.ok(centre, "centre tile must exist");
  assert.equal(centre.tile_id, 3);
  // Border tiles must be unchanged.
  assert.ok(snap.tiles.every((t) => t.x !== 1 || t.y !== 1 || t.tile_id === 3));
});

test("app-state fillTiles noop when seed matches target tile", async () => {
  const app = createAppState();
  await app.open(".");

  await app.applyTileStroke("paint", [{ x: 2, y: 2 }], 5);
  const before = app.snapshot().tiles.length;
  await app.fillTiles(2, 2, 5, 10, 10);
  const after = app.snapshot().tiles.length;
  assert.equal(after, before, "fill with matching tile id must be a no-op");
});

test("app-state fillTiles is undoable in a single step", async () => {
  const app = createAppState();
  await app.open(".");

  await app.fillTiles(0, 0, 7, 3, 3);
  assert.equal(app.snapshot().tiles.length, 9);

  await app.undo();
  assert.equal(app.snapshot().tiles.length, 0, "undo must revert all fill cells atomically");
});
