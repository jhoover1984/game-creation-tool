import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  __resetFallbackEditorForTests,
  createMapEntity,
  getEntityComponents,
  prefabCreate,
  prefabDelete,
  prefabList,
  prefabStamp,
  prefabUpdate,
  setEntityComponents,
  animationAssetGraphUpsert,
  animationBindGraph,
  animationGetBinding,
  animationUnbindGraph,
  animationAddClip,
  animationSetTransitions,
  resetMap,
  getEditorState,
  undoMap,
  validateScriptGraph,
  setPlaytestBreakpoints,
  tickPlaytest,
  enterPlaytest,
  exitPlaytest,
  setPlaytestTrace,
  exportPreviewHtml5,
} from "../src/project-api.js";

beforeEach(() => {
  __resetFallbackEditorForTests();
  delete globalThis.window;
});

test("project-api fallback returns stable editor state contract", async () => {
  const initial = await getEditorState();
  assert.equal(Array.isArray(initial.entities), true);
  assert.equal(Array.isArray(initial.tiles), true);
  assert.equal(Array.isArray(initial.selection), true);
  assert.equal(Array.isArray(initial.watch_flags), true);
  assert.equal(Array.isArray(initial.watch_selected_flags), true);
  assert.equal(Array.isArray(initial.watch_variables), true);
  assert.equal(Array.isArray(initial.watch_selected_variables), true);
  assert.equal(Array.isArray(initial.watch_inventory), true);
  assert.equal(Array.isArray(initial.watch_selected_inventory), true);
  assert.equal(Array.isArray(initial.playtest_breakpoints), true);
});

test("project-api fallback breakpoint path pauses playtest and emits hit", async () => {
  await createMapEntity("Tester", 20, 20);
  await enterPlaytest();
  await setPlaytestTrace(true);
  await setPlaytestBreakpoints(["playtest_tick"]);

  const ticked = await tickPlaytest(200);
  assert.equal(ticked.playtest.active, true);
  assert.equal(ticked.playtest.paused, true);
  assert.ok(ticked.last_breakpoint_hit);
  assert.equal(ticked.last_breakpoint_hit.kind, "breakpoint:playtest_tick");
  assert.equal(
    ticked.playtest_breakpoints.some((entry) => entry.key === "playtest_tick" && entry.value),
    true
  );

  await exitPlaytest();
});

test("project-api fallback keeps playtest running when breakpoints are disabled", async () => {
  await enterPlaytest();
  await setPlaytestTrace(true);
  await setPlaytestBreakpoints([]);

  const ticked = await tickPlaytest(200);
  assert.equal(ticked.playtest.active, true);
  assert.equal(ticked.playtest.paused, false);
  assert.equal(ticked.last_breakpoint_hit, null);

  await exitPlaytest();
});

test("project-api fallback map_reset clears authored entities and tiles", async () => {
  await createMapEntity("Tester", 20, 20);
  let snapshot = await getEditorState();
  assert.equal(snapshot.entities.length, 1);

  snapshot = await resetMap();
  assert.equal(snapshot.entities.length, 0);
  assert.equal(snapshot.tiles.length, 0);
  assert.equal(snapshot.selection.length, 0);
  assert.equal(snapshot.can_undo, false);
  assert.equal(snapshot.can_redo, false);
});

test("project-api fallback undo history is capped to prevent unbounded memory growth", async () => {
  for (let index = 0; index < 130; index += 1) {
    await createMapEntity(`Entity-${index}`, index, index);
  }

  let snapshot = await getEditorState();
  assert.equal(snapshot.entities.length, 130);
  assert.equal(snapshot.can_undo, true);

  for (let index = 0; index < 130; index += 1) {
    snapshot = await undoMap();
  }

  assert.equal(
    snapshot.entities.length,
    2,
    "oldest two snapshots should be dropped once history exceeds cap"
  );
  assert.equal(snapshot.can_undo, false);
});

test("project-api uses tauri invoke_command bridge when desktop runtime is available", async () => {
  const invokeCalls = [];
  globalThis.window = {
    __TAURI__: {
      core: {
        invoke: async (commandName, payload) => {
          invokeCalls.push({ commandName, payload });
          return JSON.stringify({
            entities: [],
            tiles: [],
            selection: [],
            watch_flags: [],
            watch_selected_flags: [],
            watch_variables: [],
            watch_selected_variables: [],
            watch_inventory: [],
            watch_selected_inventory: [],
            playtest_breakpoints: [],
          });
        },
      },
    },
  };

  const state = await getEditorState();
  assert.equal(Array.isArray(state.entities), true);
  assert.equal(invokeCalls.length, 1);
  assert.equal(invokeCalls[0].commandName, "invoke_command");
  assert.equal(invokeCalls[0].payload.command, "editor_state");
  assert.equal(invokeCalls[0].payload.payloadJson, "{}");
});

test("project-api surfaces backend errors when tauri runtime is available", async () => {
  globalThis.window = {
    __TAURI__: {
      core: {
        invoke: async () => {
          throw new Error("backend dispatch failed");
        },
      },
    },
  };

  await assert.rejects(
    async () => getEditorState(),
    (error) => error instanceof Error && error.message.includes("backend dispatch failed")
  );
});

test("project-api script validation fallback reports missing nodes", async () => {
  const report = await validateScriptGraph({
    nodes: [{ id: "event_start", kind: "event" }],
    edges: [{ from: "event_start", to: "action_missing" }],
  });

  assert.equal(Array.isArray(report.errors), true);
  assert.equal(
    report.errors.some((entry) => entry.code === "missing_target_node"),
    true
  );
});

test("project-api routes script validation through tauri invoke bridge", async () => {
  globalThis.window = {
    __TAURI__: {
      core: {
        invoke: async () =>
          JSON.stringify({
            errors: [],
          }),
      },
    },
  };

  const report = await validateScriptGraph({
    nodes: [{ id: "event_start", kind: "event" }],
    edges: [],
  });
  assert.deepEqual(report, { errors: [] });
});

test("project-api rejects malformed JSON response for editor_state", async () => {
  globalThis.window = {
    __TAURI__: {
      core: {
        invoke: async () => "{not-json}",
      },
    },
  };

  await assert.rejects(
    async () => getEditorState(),
    (error) =>
      error instanceof Error && error.message.includes("Invalid JSON response for editor_state")
  );
});

test("project-api rejects malformed JSON response for script_validate", async () => {
  globalThis.window = {
    __TAURI__: {
      core: {
        invoke: async () => "{not-json}",
      },
    },
  };

  await assert.rejects(
    async () =>
      validateScriptGraph({
        nodes: [{ id: "event_start", kind: "event" }],
        edges: [],
      }),
    (error) =>
      error instanceof Error && error.message.includes("Invalid JSON response for script_validate")
  );
});

test("project-api export payload forwards optional projectDir to invoke bridge", async () => {
  const invokeCalls = [];
  globalThis.window = {
    __TAURI__: {
      core: {
        invoke: async (commandName, payload) => {
          invokeCalls.push({ commandName, payload });
          return JSON.stringify({
            output_dir: "out",
            files: [],
            scene_count: 1,
            asset_count: 1,
            profile: "game_boy",
            mode: "release",
          });
        },
      },
    },
  };

  const report = await exportPreviewHtml5("out", "nes", false, "C:/tmp/project");
  assert.equal(report.profile, "game_boy");
  assert.equal(invokeCalls.length, 1);
  assert.equal(invokeCalls[0].commandName, "invoke_command");
  assert.equal(invokeCalls[0].payload.command, "export_preview_html5");
  const parsedPayload = JSON.parse(invokeCalls[0].payload.payloadJson);
  assert.equal(parsedPayload.outputDir, "out");
  assert.equal(parsedPayload.profile, "nes");
  assert.equal(parsedPayload.projectDir, "C:/tmp/project");
});

test("project-api export payload forwards optional editorState hints to invoke bridge", async () => {
  const invokeCalls = [];
  globalThis.window = {
    __TAURI__: {
      core: {
        invoke: async (commandName, payload) => {
          invokeCalls.push({ commandName, payload });
          return JSON.stringify({
            output_dir: "out",
            files: [],
            scene_count: 1,
            asset_count: 3,
            profile: "game_boy",
            mode: "release",
          });
        },
      },
    },
  };

  const editorState = {
    entities: [{ id: 1, name: "Hero", position: { x: 16, y: 16 } }],
    tiles: [{ x: 0, y: 0, tile_id: 1 }],
    audio: [{ id: "theme", name: "Theme", assetPath: "C:/tmp/theme.wav" }],
    playtest: { frame: 42 },
  };
  const report = await exportPreviewHtml5(
    "out",
    "game_boy",
    false,
    "C:/tmp/project",
    editorState
  );
  assert.equal(report.asset_count, 3);
  assert.equal(invokeCalls.length, 1);
  const parsedPayload = JSON.parse(invokeCalls[0].payload.payloadJson);
  assert.deepEqual(parsedPayload.editorState, editorState);
});

test("project-api prefab fallback supports CRUD and stamp flow", async () => {
  let listed = await prefabList();
  assert.deepEqual(listed.prefabs, []);

  let created = await prefabCreate("enemy_slime", "Slime", {
    collision: { offset_x: 0, offset_y: 0, width: 8, height: 8, solid: true },
  });
  assert.equal(created.prefabs.length, 1);
  assert.equal(created.prefabs[0].id, "enemy_slime");
  assert.equal(created.prefabs[0].name, "Slime");

  let updated = await prefabUpdate("enemy_slime", { name: "Green Slime" });
  assert.equal(updated.prefabs.length, 1);
  assert.equal(updated.prefabs[0].name, "Green Slime");

  const stamped = await prefabStamp("enemy_slime", 12, 34);
  assert.equal(stamped.entities.length, 1);
  assert.equal(stamped.entities[0].name, "Green Slime");
  assert.deepEqual(stamped.entities[0].position, { x: 12, y: 34 });

  const deleted = await prefabDelete("enemy_slime");
  assert.deepEqual(deleted.prefabs, []);

  listed = await prefabList();
  assert.deepEqual(listed.prefabs, []);
});

test("project-api createMapEntity fallback supports optional prefabId", async () => {
  await prefabCreate("enemy_slime", "Slime", {});

  const created = await createMapEntity("", 7, 9, { prefabId: "enemy_slime" });
  assert.equal(created.entities.length, 1);
  assert.equal(created.entities[0].name, "Slime");
  assert.deepEqual(created.entities[0].position, { x: 7, y: 9 });
});

test("project-api entity component override fallback can set and read prefab instance components", async () => {
  await prefabCreate("enemy_slime", "Slime", {
    collision: { offset_x: 0, offset_y: 0, width: 8, height: 8, solid: true },
  });
  const created = await createMapEntity("", 7, 9, { prefabId: "enemy_slime" });
  const entityId = created.entities[0].id;

  const before = await getEntityComponents(entityId);
  assert.equal(before.entity_id, entityId);
  assert.equal(before.collision?.width, 8);

  await setEntityComponents(entityId, {
    collision: { offset_x: 1, offset_y: 2, width: 12, height: 12, solid: true },
    movement: { mode: "grid_snap", speed: 8, facing: "down", step_cooldown: 0, step_interval: 8 },
  });
  const after = await getEntityComponents(entityId);
  assert.equal(after.entity_id, entityId);
  assert.equal(after.collision?.width, 12);
  assert.equal(after.has_movement, true);
});

test("project-api animation graph binding fallback binds, queries, and unbinds", async () => {
  const created = await createMapEntity("Hero", 4, 6);
  const entityId = created.entities[0].id;

  await animationAssetGraphUpsert({
    id: "graph_player",
    name: "Player Graph",
    states: { idle: "clip_idle" },
    transitions: [],
    default_state: "idle",
  });

  await animationBindGraph(entityId, "graph_player");
  let binding = await animationGetBinding(entityId);
  assert.equal(binding.entity_id, entityId);
  assert.equal(binding.graph_asset_id, "graph_player");

  await animationUnbindGraph(entityId);
  binding = await animationGetBinding(entityId);
  assert.equal(binding.entity_id, entityId);
  assert.equal(binding.graph_asset_id, null);
});

test("project-api animationSetTransitions fallback normalizes int_between fields", async () => {
  const created = await createMapEntity("Hero", 4, 6);
  const entityId = created.entities[0].id;

  await animationAddClip(entityId, "idle", {
    frames: [0],
    frame_duration_ticks: 1,
    loop_mode: "loop",
  });

  const state = await animationSetTransitions(entityId, [
    {
      from_state: "idle",
      to_state: "run",
      condition: {
        kind: "int_between",
        key: "speed_tier",
        min: "1",
        max: "2",
      },
    },
  ]);
  const hero = state.entities.find((e) => e.id === entityId);
  assert.ok(hero?.animation);
  assert.equal(hero.animation.transitions[0].condition.kind, "int_between");
  assert.equal(hero.animation.transitions[0].condition.min, 1);
  assert.equal(hero.animation.transitions[0].condition.max, 2);
});

test("project-api animationSetTransitions rejects unsupported condition kind", async () => {
  const created = await createMapEntity("Hero", 4, 6);
  const entityId = created.entities[0].id;

  await animationAddClip(entityId, "idle", {
    frames: [0],
    frame_duration_ticks: 1,
    loop_mode: "loop",
  });

  await assert.rejects(
    async () =>
      animationSetTransitions(entityId, [
        {
          from_state: "idle",
          to_state: "run",
          condition: { kind: "bad_kind" },
        },
      ]),
    (error) =>
      error instanceof Error &&
      error.message.includes("unsupported animation transition condition kind")
  );
});
