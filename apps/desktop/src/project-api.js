import * as wasmBridge from "./wasm-runtime.js";
import { normalizeAnimationTransitions } from "./animation-transition-schema.js";

const FALLBACK_PROJECT = {
  manifest: {
    project_schema_version: 1,
    name: "Sample Project",
  },
  health: {
    warnings: ["Running in web fallback mode (no Tauri backend connected)."],
    near_limits: [],
    missing_assets: [],
    trashed_refs: [],
  },
  migration_report: null,
};

/** @typedef {import("./types.js").EditorEntity} EditorEntity */
/** @typedef {import("./types.js").EditorStateResponse} EditorStateResponse */
/** @typedef {import("./types.js").PlaytestState} PlaytestState */
/** @typedef {import("./types.js").TilePoint} TilePoint */
/** @typedef {import("./types.js").OpenProjectPayload} OpenProjectPayload */
/** @typedef {import("./types.js").SaveProjectPayload} SaveProjectPayload */
/** @typedef {import("./types.js").MapCreatePayload} MapCreatePayload */
/** @typedef {import("./types.js").MapMovePayload} MapMovePayload */
/** @typedef {import("./types.js").MapBatchMovePayload} MapBatchMovePayload */
/** @typedef {import("./types.js").MapSelectPayload} MapSelectPayload */
/** @typedef {import("./types.js").MapPaintTilePayload} MapPaintTilePayload */
/** @typedef {import("./types.js").MapPaintTilesPayload} MapPaintTilesPayload */
/** @typedef {import("./types.js").MapEraseTilesPayload} MapEraseTilesPayload */
/** @typedef {import("./types.js").MapFillTilesPayload} MapFillTilesPayload */
/** @typedef {import("./types.js").PlaytestSpeedPayload} PlaytestSpeedPayload */
/** @typedef {import("./types.js").PlaytestTickPayload} PlaytestTickPayload */
/** @typedef {import("./types.js").PlaytestTracePayload} PlaytestTracePayload */
/** @typedef {import("./types.js").PlaytestBreakpointsPayload} PlaytestBreakpointsPayload */
/** @typedef {import("./types.js").ExportPreviewPayload} ExportPreviewPayload */

/**
 * @typedef {{ core?: { invoke?: (commandName: string, payload: unknown) => Promise<unknown> } }} TauriBridge
 */

/**
 * @typedef {{
 *   projectName: string,
 *   nextId: number,
 *   entities: EditorEntity[],
 *   tiles: Array<{ x: number, y: number, tile_id: number }>,
 *   playtest: PlaytestState,
 *   playtestTrace: Array<{ seq: number, frame: number, kind: string, message: string }>,
 *   playtestBreakpoints: { playtest_tick: boolean, item_pickup: boolean, quest_state: boolean, script_event: boolean },
 *   lastBreakpointHit: { seq: number, frame: number, kind: string, message: string } | null,
 *   scriptLoaded: boolean,
 *   prefabs: Array<{ id: string, name: string, default_components: object }>,
 *   scenes: Array<{ id: string, name: string, spawn_point_count: number, entity_count: number, tile_count: number }>,
 *   activeSceneId: string | null,
 *   selection: number[],
 *   previousSelection: number[],
 *   undoStack: EditorStateResponse[],
 *   redoStack: EditorStateResponse[],
 *   spriteRegistry: Record<string, string>,
 *   camera_x: number,
 *   camera_y: number,
 *   camera_mode: string,
 *   physicsConfig: { gravity: number, friction: number },
 *   animationParams: { bools: Record<string, boolean>, ints: Record<string, number> },
 *   animationAssets: {
 *     clips: Array<object>,
 *     graphs: Array<object>
 *   }
 * }} FallbackEditorState
 */

/**
 * @returns {FallbackEditorState}
 */
function createDefaultFallbackEditor() {
  return {
    projectName: "New Project",
    nextId: 1,
    entities: [],
    tiles: [],
    playtest: {
      active: false,
      paused: false,
      speed: 1,
      frame: 0,
      trace_enabled: false,
      last_tick_delta_ms: 0,
      last_tick_steps: 0,
    },
    playtestTrace: [],
    playtestBreakpoints: {
      playtest_tick: false,
      item_pickup: false,
      quest_state: false,
      script_event: false,
    },
    lastBreakpointHit: null,
    scriptLoaded: false,
    prefabs: [],
    scenes: [],
    activeSceneId: null,
    selection: [],
    previousSelection: [],
    undoStack: [],
    redoStack: [],
    spriteRegistry: {},
    camera_x: 0,
    camera_y: 0,
    camera_mode: "follow",
    physicsConfig: { gravity: 0.0, friction: 0.85 },
    animationParams: { bools: {}, ints: {} },
    animationAssets: { clips: [], graphs: [] },
  };
}

const fallbackEditor = createDefaultFallbackEditor();
const TAURI_UNAVAILABLE_CODE = "TAURI_UNAVAILABLE";
const FALLBACK_UNDO_LIMIT = 128;

/** Authored entity positions captured before entering playtest; restored on exit. */
let _prePlaytestPositions = /** @type {Array<{id: number, position: {x: number, y: number}}>} */ ([]);

/**
 * @returns {TauriBridge | undefined}
 */
function getTauriBridge() {
  if (typeof window === "undefined") {
    return undefined;
  }
  const candidate = /** @type {unknown} */ (window["__TAURI__"]);
  if (!candidate || typeof candidate !== "object") {
    return undefined;
  }
  return /** @type {TauriBridge} */ (candidate);
}

function parseJsonResponse(raw, command) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON response for ${command}: ${detail}`);
  }
}

/**
 * @param {string} command
 * @param {Record<string, unknown>} payload
 * @returns {Promise<unknown>}
 */
async function invoke(command, payload) {
  const tauri = getTauriBridge();
  if (!tauri?.core?.invoke) {
    const error = new Error("Tauri invoke is unavailable in this runtime.");
    /** @type {Error & { code?: string }} */ (error).code = TAURI_UNAVAILABLE_CODE;
    throw error;
  }

  const payloadJson = JSON.stringify(payload ?? {});
  const response = await tauri.core.invoke("invoke_command", {
    command,
    payloadJson,
  });
  if (typeof response === "string") {
    return parseJsonResponse(response, command);
  }
  return response;
}

function isTauriUnavailable(error) {
  return error && error.code === TAURI_UNAVAILABLE_CODE;
}

export function detectRuntimeMode() {
  const tauri = getTauriBridge();
  return tauri?.core?.invoke ? "desktop_local" : "web";
}

function validateScriptGraphFallback(graph) {
  const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
  const edges = Array.isArray(graph?.edges) ? graph.edges : [];
  const nodeIds = new Set(nodes.map((node) => node.id));
  const errors = [];
  for (const edge of edges) {
    if (!nodeIds.has(edge.from)) {
      errors.push({
        code: "missing_source_node",
        message: `edge source node '${edge.from}' was not found`,
        node_id: edge.from,
      });
    }
    if (!nodeIds.has(edge.to)) {
      errors.push({
        code: "missing_target_node",
        message: `edge target node '${edge.to}' was not found`,
        node_id: edge.to,
      });
    }
  }
  return { errors };
}

/**
 * @returns {EditorStateResponse}
 */
function editorSnapshot() {
  return {
    project_name: fallbackEditor.projectName || "New Project",
    entities: fallbackEditor.entities.map((entity) => ({
      ...entity,
      position: { ...entity.position },
      components: cloneComponentBag(entity.components),
    })),
    tiles: fallbackEditor.tiles.map((tile) => ({ ...tile })),
    playtest: { ...fallbackEditor.playtest },
    playtest_trace: fallbackEditor.playtestTrace.map((event) => ({ ...event })),
    watch_selected_entity:
      fallbackEditor.selection.length > 0
        ? (() => {
            const id = fallbackEditor.selection[0];
            const entity = fallbackEditor.entities.find((item) => item.id === id);
            return entity ? { ...entity, position: { ...entity.position } } : null;
          })()
        : null,
    watch_flags: [
      { key: "has_started_playtest", value: fallbackEditor.playtest.active },
      { key: "player_has_key", value: fallbackEditor.playtest.frame >= 120 },
      {
        key: "quest_intro_active",
        value: fallbackEditor.playtest.active && fallbackEditor.playtest.frame < 300,
      },
      { key: "quest_intro_completed", value: fallbackEditor.playtest.frame >= 300 },
    ],
    watch_selected_flags:
      fallbackEditor.selection.length > 0
        ? [
            { key: "selected_is_player", value: true },
            { key: "selected_in_viewport", value: true },
            { key: "selected_on_grid4", value: true },
          ]
        : [],
    watch_variables: [
      { key: "player_hp", value: 3 },
      { key: "player_coins", value: Math.floor((fallbackEditor.playtest.frame || 0) / 180) },
      { key: "quest_stage", value: fallbackEditor.playtest.frame >= 300 ? 1 : 0 },
    ],
    watch_selected_variables:
      fallbackEditor.selection.length > 0
        ? (() => {
            const id = fallbackEditor.selection[0];
            const entity = fallbackEditor.entities.find((item) => item.id === id);
            if (!entity) {
              return [];
            }
            return [
              { key: "selected_id", value: entity.id },
              { key: "selected_x", value: entity.position.x },
              { key: "selected_y", value: entity.position.y },
            ];
          })()
        : [],
    watch_inventory: [
      { key: "key_item", value: fallbackEditor.playtest.frame >= 120 ? 1 : 0 },
      { key: "potion", value: 1 },
    ],
    watch_scene_flags: [],
    watch_scene_variables: [],
    watch_selected_inventory:
      fallbackEditor.selection.length > 0
        ? [
            { key: "selected_debug_tag", value: 1 },
            { key: "selected_key_item", value: fallbackEditor.playtest.frame >= 120 ? 1 : 0 },
          ]
        : [],
    playtest_breakpoints: Object.entries(fallbackEditor.playtestBreakpoints).map(
      ([key, value]) => ({ key, value })
    ),
    last_breakpoint_hit: fallbackEditor.lastBreakpointHit
      ? { ...fallbackEditor.lastBreakpointHit }
      : null,
    selection: [...fallbackEditor.selection],
    can_undo: fallbackEditor.undoStack.length > 0,
    can_redo: fallbackEditor.redoStack.length > 0,
    script_loaded: fallbackEditor.scriptLoaded,
    camera_x: fallbackEditor.camera_x,
    camera_y: fallbackEditor.camera_y,
    camera_mode: fallbackEditor.camera_mode,
    transition_active: false,
    transition_opacity: 0,
    tile_previews: {},
    sprite_registry: fallbackEditor.spriteRegistry || {},
  };
}

function pushHistory() {
  fallbackEditor.undoStack.push(editorSnapshot());
  if (fallbackEditor.undoStack.length > FALLBACK_UNDO_LIMIT) {
    fallbackEditor.undoStack.shift();
  }
  fallbackEditor.redoStack = [];
}

/**
 * @param {EditorStateResponse} snapshot
 */
function applySnapshot(snapshot) {
  fallbackEditor.entities = snapshot.entities.map((entity) => ({
    ...entity,
    position: { ...entity.position },
    components: cloneComponentBag(entity.components),
  }));
  fallbackEditor.tiles = (snapshot.tiles || []).map((tile) => ({
    x: tile.x,
    y: tile.y,
    tile_id: typeof tile.tile_id === "number" ? tile.tile_id : 1,
  }));
  fallbackEditor.playtest = { ...(snapshot.playtest || fallbackEditor.playtest) };
  fallbackEditor.playtestTrace = (snapshot.playtest_trace || []).map((event) => ({ ...event }));
  fallbackEditor.playtestBreakpoints = (snapshot.playtest_breakpoints || []).reduce(
    (acc, entry) => {
      acc[entry.key] = !!entry.value;
      return acc;
    },
    { ...fallbackEditor.playtestBreakpoints }
  );
  fallbackEditor.lastBreakpointHit = snapshot.last_breakpoint_hit
    ? { ...snapshot.last_breakpoint_hit }
    : null;
  fallbackEditor.selection = [...snapshot.selection];
}

function setSelection(selection) {
  fallbackEditor.previousSelection = [...fallbackEditor.selection];
  fallbackEditor.selection = [...selection];
}

function cloneComponentBag(components) {
  if (!components || typeof components !== "object") {
    return {};
  }
  return JSON.parse(JSON.stringify(components));
}

export async function openProject(projectDir, applyMigrations = false) {
  try {
    /** @type {OpenProjectPayload} */
    const payload = { projectDir, applyMigrations };
    return await invoke("open_project", payload);
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    return FALLBACK_PROJECT;
  }
}

export async function saveProject(projectDir, projectName) {
  try {
    /** @type {SaveProjectPayload} */
    const payload = { projectDir, projectName };
    return await invoke("save_project", payload);
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    return {
      manifest: {
        project_schema_version: 1,
        name: projectName,
      },
      health: FALLBACK_PROJECT.health,
      backup_created: false,
    };
  }
}

export async function fetchProjectHealth(projectDir) {
  try {
    return await invoke("project_health", { projectDir });
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    return { health: FALLBACK_PROJECT.health };
  }
}

export async function getEditorState() {
  try {
    return await invoke("editor_state", {});
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    return editorSnapshot();
  }
}

export async function validateScriptGraph(graph) {
  try {
    return await invoke("script_validate", { graph });
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    return validateScriptGraphFallback(graph);
  }
}

export async function loadScriptGraph(graph) {
  try {
    return await invoke("script_load_graph", { graph });
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    fallbackEditor.scriptLoaded = true;
    return { registered_events: [], state: editorSnapshot() };
  }
}

export async function unloadScriptGraph() {
  try {
    return await invoke("script_unload_graph", {});
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    fallbackEditor.scriptLoaded = false;
    return editorSnapshot();
  }
}

export async function fireScriptEvent(event) {
  try {
    return await invoke("script_fire_event", { event });
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    return { effects_count: 0, nodes_visited: [], state: editorSnapshot() };
  }
}

// ── Scene management ────────────────────────────────────────────────

export async function addScene(id, name) {
  try {
    return await invoke("scene_add", { id, name });
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    fallbackEditor.scenes.push({ id, name, spawn_point_count: 0, entity_count: 0, tile_count: 0 });
    if (!fallbackEditor.activeSceneId) {
      fallbackEditor.activeSceneId = id;
    }
    return fallbackSceneList();
  }
}

export async function removeScene(id) {
  try {
    return await invoke("scene_remove", { id });
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    fallbackEditor.scenes = fallbackEditor.scenes.filter((s) => s.id !== id);
    if (fallbackEditor.activeSceneId === id) {
      fallbackEditor.activeSceneId =
        fallbackEditor.scenes.length > 0 ? fallbackEditor.scenes[0].id : null;
    }
    return fallbackSceneList();
  }
}

export async function setActiveScene(id) {
  try {
    return await invoke("scene_set_active", { id });
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    if (!fallbackEditor.scenes.some((s) => s.id === id)) {
      throw new Error(`scene '${id}' not found`);
    }
    fallbackEditor.activeSceneId = id;
    return fallbackSceneList();
  }
}

export async function listScenes() {
  try {
    return await invoke("scene_list", {});
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    return fallbackSceneList();
  }
}

export async function addSpawnPoint(sceneId, name, x, y) {
  try {
    return await invoke("scene_add_spawn_point", { sceneId, name, x, y });
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    const scene = fallbackEditor.scenes.find((s) => s.id === sceneId);
    if (scene) {
      scene.spawn_point_count = (scene.spawn_point_count || 0) + 1;
    }
    return fallbackSceneList();
  }
}

export async function getEntityComponents(entityId) {
  try {
    return await invoke("entity_get_components", { entityId });
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    const entity = fallbackEditor.entities.find((candidate) => candidate.id === entityId);
    const components = cloneComponentBag(entity?.components);
    return {
      entity_id: entityId,
      collision: components.collision ?? null,
      sprite: components.sprite ?? null,
      has_movement: !!components.movement,
      has_velocity: !!components.velocity,
    };
  }
}

/**
 * Set (replace) an entity instance component bag.
 * This is the per-entity override path for prefab-derived defaults.
 * @param {number} entityId
 * @param {object} components
 * @returns {Promise<EditorStateResponse>}
 */
export async function setEntityComponents(entityId, components) {
  try {
    return await invoke("entity_set_components", { entityId, components });
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    const entity = fallbackEditor.entities.find((candidate) => candidate.id === entityId);
    if (!entity) {
      throw new Error(`entity ${entityId} was not found`);
    }
    entity.components = cloneComponentBag(components);
    return editorSnapshot();
  }
}

/**
 * Attach (or replace) a ScriptGraph on a specific entity.
 * @param {number} entityId
 * @param {{ nodes: Array<object>, edges: Array<object> }} graph
 * @returns {Promise<unknown>}
 */
export async function attachEntityGraph(entityId, graph) {
  try {
    return await invoke("entity_attach_graph", { entity_id: entityId, graph });
  } catch (error) {
    if (!isTauriUnavailable(error)) throw error;
    return null;
  }
}

/**
 * Retrieve the ScriptGraph attached to a specific entity (null if none).
 * @param {number} entityId
 * @returns {Promise<{ nodes: Array<object>, edges: Array<object> } | null>}
 */
export async function getEntityGraph(entityId) {
  try {
    return /** @type {any} */ (await invoke("entity_get_graph", { entity_id: entityId }));
  } catch (error) {
    if (!isTauriUnavailable(error)) throw error;
    return null;
  }
}

/**
 * Retrieve the runtime entity state strings (e.g. "open", "locked") for all
 * entities that have an attached script graph.
 * @returns {Promise<Record<string, string>>}
 */
export async function getEntityStates() {
  try {
    return /** @type {any} */ (await invoke("entity_get_states", {}));
  } catch (error) {
    if (!isTauriUnavailable(error)) throw error;
    return {};
  }
}

function fallbackSceneList() {
  return {
    scenes: fallbackEditor.scenes.map((s) => ({ ...s })),
    active_scene_id: fallbackEditor.activeSceneId,
    active_playtest_scene: null,
    state: editorSnapshot(),
  };
}

// ── Prefab management ────────────────────────────────────────────────

/**
 * Create a new entity prefab (reusable entity template).
 * @param {string} id - Unique stable identifier (e.g. "enemy_slime")
 * @param {string} name - Human-readable display name
 * @param {object} [defaultComponents] - Optional EntityComponents to bake in
 * @returns {Promise<{prefabs: Array<{id:string,name:string,default_components:object}>}>}
 */
export async function prefabCreate(id, name, defaultComponents = {}) {
  try {
    return await invoke("prefab_create", {
      id,
      name,
      default_components: defaultComponents,
    });
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    if (fallbackEditor.prefabs.some((p) => p.id === id)) {
      throw new Error(`prefab '${id}' already exists`);
    }
    fallbackEditor.prefabs.push({ id, name, default_components: defaultComponents });
    return fallbackPrefabList();
  }
}

/**
 * Update a prefab's name and/or default components.
 * @param {string} id
 * @param {{name?: string, defaultComponents?: object}} [updates]
 * @returns {Promise<{prefabs: Array}>}
 */
export async function prefabUpdate(id, { name, defaultComponents } = {}) {
  try {
    const payload = { id };
    if (name !== undefined) payload.name = name;
    if (defaultComponents !== undefined) payload.default_components = defaultComponents;
    return await invoke("prefab_update", payload);
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    const prefab = fallbackEditor.prefabs.find((p) => p.id === id);
    if (!prefab) throw new Error(`prefab '${id}' not found`);
    if (name !== undefined) prefab.name = name;
    if (defaultComponents !== undefined) prefab.default_components = defaultComponents;
    return fallbackPrefabList();
  }
}

/**
 * List all prefabs.
 * @returns {Promise<{prefabs: Array<{id:string,name:string,default_components:object}>}>}
 */
export async function prefabList() {
  try {
    return await invoke("prefab_list", {});
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    return fallbackPrefabList();
  }
}

/**
 * Delete a prefab by id.
 * @param {string} id
 * @returns {Promise<{prefabs: Array}>}
 */
export async function prefabDelete(id) {
  try {
    return await invoke("prefab_delete", { id });
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    const idx = fallbackEditor.prefabs.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error(`prefab '${id}' not found`);
    fallbackEditor.prefabs.splice(idx, 1);
    return fallbackPrefabList();
  }
}

/**
 * Stamp (instantiate) a new entity from a prefab.
 * @param {string} prefabId
 * @param {number} x
 * @param {number} y
 * @returns {Promise<object>} EditorStateResponse
 */
export async function prefabStamp(prefabId, x, y) {
  try {
    return await invoke("prefab_stamp", { prefabId, x, y });
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    const prefab = fallbackEditor.prefabs.find((p) => p.id === prefabId);
    if (!prefab) throw new Error(`prefab '${prefabId}' not found`);
    pushHistory();
    const entity = {
      id: fallbackEditor.nextId++,
      name: prefab.name,
      position: { x, y },
      components: cloneComponentBag(prefab.default_components),
    };
    fallbackEditor.entities.push(entity);
    setSelection([entity.id]);
    return editorSnapshot();
  }
}

/**
 * Spawn an entity from a prefab during playtest (tracked for cleanup on exit).
 * In the web fallback this behaves like prefabStamp but marks the entity as runtime-spawned.
 * @param {string} prefabId
 * @param {number} x
 * @param {number} y
 * @returns {Promise<object>} EditorStateResponse
 */
export async function spawnEntity(prefabId, x, y) {
  try {
    return await invoke("spawn_entity", { prefabId, x, y });
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    const prefab = fallbackEditor.prefabs.find((p) => p.id === prefabId);
    if (!prefab) throw new Error(`prefab '${prefabId}' not found`);
    const entity = {
      id: fallbackEditor.nextId++,
      name: prefab.name,
      position: { x, y },
      _runtimeSpawned: true,
    };
    fallbackEditor.entities.push(entity);
    fallbackEditor._spawnedPool = fallbackEditor._spawnedPool || [];
    fallbackEditor._spawnedPool.push(entity.id);
    return editorSnapshot();
  }
}

/**
 * Despawn (remove) an entity by id.
 * @param {number} entityId
 * @returns {Promise<object>} EditorStateResponse
 */
export async function despawnEntity(entityId) {
  try {
    return await invoke("despawn_entity", { entityId });
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    const idx = fallbackEditor.entities.findIndex((e) => e.id === entityId);
    if (idx === -1) throw new Error(`entity ${entityId} not found`);
    fallbackEditor.entities.splice(idx, 1);
    if (fallbackEditor._spawnedPool) {
      fallbackEditor._spawnedPool = fallbackEditor._spawnedPool.filter((id) => id !== entityId);
    }
    return editorSnapshot();
  }
}

// ── Animation API ─────────────────────────────────────────────────────

/**
 * Add or replace an animation clip on an entity's AnimationComponent.
 * Creates the component if the entity doesn't have one yet.
 * @param {number} entityId
 * @param {string} clipName
 * @param {{ frames: number[], frame_duration_ticks: number, loop_mode?: 'loop'|'once'|'ping_pong' }} clip
 * @returns {Promise<object>} EditorStateResponse
 */
export async function animationAddClip(entityId, clipName, clip) {
  try {
    return await invoke("animation_add_clip", { entityId, clipName, clip });
  } catch (error) {
    if (!isTauriUnavailable(error)) throw error;
    const entity = fallbackEditor.entities.find((e) => e.id === entityId);
    if (!entity) throw new Error(`entity ${entityId} not found`);
    if (!entity.animation) {
      entity.animation = {
        clips: {},
        state: {
          current_clip_name: clipName,
          current_frame_index: 0,
          ticks_in_frame: 0,
          ticks_in_state: 0,
          playing: true,
          ping_pong_forward: true,
        },
        transitions: [],
      };
    }
    entity.animation.clips[clipName] = { ...clip };
    return editorSnapshot();
  }
}

/**
 * Switch the entity's animation to a named state (must be an existing clip name).
 * @param {number} entityId
 * @param {string} stateName
 * @returns {Promise<object>} EditorStateResponse
 */
export async function animationSetState(entityId, stateName) {
  try {
    return await invoke("animation_set_state", { entityId, stateName });
  } catch (error) {
    if (!isTauriUnavailable(error)) throw error;
    const entity = fallbackEditor.entities.find((e) => e.id === entityId);
    if (!entity?.animation) throw new Error(`entity ${entityId} has no animation component`);
    if (!entity.animation.clips[stateName]) throw new Error(`animation state '${stateName}' not found`);
    entity.animation.state = {
      current_clip_name: stateName,
      current_frame_index: 0,
      ticks_in_frame: 0,
      ticks_in_state: 0,
      playing: true,
      ping_pong_forward: true,
    };
    return editorSnapshot();
  }
}

/**
 * Replace all transition rules on an entity's animation component.
 * @param {number} entityId
 * @param {Array<{ from_state: string, to_state: string, condition: object }>} transitions
 * @returns {Promise<object>} EditorStateResponse
 */
export async function animationSetTransitions(entityId, transitions) {
  const normalized = normalizeAnimationTransitions(transitions);
  try {
    return await invoke("animation_set_transitions", { entityId, transitions: normalized });
  } catch (error) {
    if (!isTauriUnavailable(error)) throw error;
    const entity = fallbackEditor.entities.find((e) => e.id === entityId);
    if (!entity?.animation) throw new Error(`entity ${entityId} has no animation component`);
    entity.animation.transitions = normalized.map((t) => ({ ...t }));
    return editorSnapshot();
  }
}

/**
 * Bind an entity animation component to a reusable graph asset.
 * @param {number} entityId
 * @param {string} graphAssetId
 * @returns {Promise<object>} EditorStateResponse
 */
export async function animationBindGraph(entityId, graphAssetId) {
  try {
    return await invoke("animation_bind_graph", { entityId, graphAssetId });
  } catch (error) {
    if (!isTauriUnavailable(error)) throw error;
    const entity = fallbackEditor.entities.find((e) => e.id === entityId);
    if (!entity) throw new Error(`entity ${entityId} not found`);
    if (!entity.animation) {
      entity.animation = {
        clips: {},
        state: {
          current_clip_name: "default",
          current_frame_index: 0,
          ticks_in_frame: 0,
          ticks_in_state: 0,
          playing: true,
          ping_pong_forward: true,
        },
        transitions: [],
      };
    }
    entity.animation.graph_asset_id = graphAssetId;
    return editorSnapshot();
  }
}

/**
 * Remove reusable graph-asset binding from entity animation component.
 * @param {number} entityId
 * @returns {Promise<object>} EditorStateResponse
 */
export async function animationUnbindGraph(entityId) {
  try {
    return await invoke("animation_unbind_graph", { entityId });
  } catch (error) {
    if (!isTauriUnavailable(error)) throw error;
    const entity = fallbackEditor.entities.find((e) => e.id === entityId);
    if (!entity?.animation) throw new Error(`entity ${entityId} has no animation component`);
    entity.animation.graph_asset_id = null;
    return editorSnapshot();
  }
}

/**
 * Query current graph-asset binding for entity animation.
 * @param {number} entityId
 * @returns {Promise<{entity_id:number, graph_asset_id:string|null}>}
 */
export async function animationGetBinding(entityId) {
  try {
    return await invoke("animation_get_binding", { entityId });
  } catch (error) {
    if (!isTauriUnavailable(error)) throw error;
    const entity = fallbackEditor.entities.find((e) => e.id === entityId);
    return {
      entity_id: entityId,
      graph_asset_id: entity?.animation?.graph_asset_id ?? null,
    };
  }
}

/**
 * Set a typed bool animator parameter.
 * @param {string} key
 * @param {boolean} value
 * @returns {Promise<object>} EditorStateResponse
 */
export async function animationSetBoolParam(key, value) {
  try {
    return await invoke("animation_set_bool_param", { key, value });
  } catch (error) {
    if (!isTauriUnavailable(error)) throw error;
    fallbackEditor.animationParams.bools[key] = !!value;
    return editorSnapshot();
  }
}

/**
 * Set a typed int animator parameter.
 * @param {string} key
 * @param {number} value
 * @returns {Promise<object>} EditorStateResponse
 */
export async function animationSetIntParam(key, value) {
  try {
    return await invoke("animation_set_int_param", { key, value });
  } catch (error) {
    if (!isTauriUnavailable(error)) throw error;
    fallbackEditor.animationParams.ints[key] = Number(value) | 0;
    return editorSnapshot();
  }
}

/**
 * Fire a one-shot animator trigger.
 * @param {string} key
 * @returns {Promise<object>} EditorStateResponse
 */
export async function animationFireTrigger(key) {
  try {
    return await invoke("animation_fire_trigger", { key });
  } catch (error) {
    if (!isTauriUnavailable(error)) throw error;
    return editorSnapshot();
  }
}

/**
 * List reusable animation assets (clip + graph libraries).
 * @returns {Promise<{ clips: Array<object>, graphs: Array<object> }>}
 */
export async function animationAssetList() {
  try {
    return await invoke("animation_asset_list", {});
  } catch (error) {
    if (!isTauriUnavailable(error)) throw error;
    return {
      clips: fallbackEditor.animationAssets.clips.map((c) => ({ ...c })),
      graphs: fallbackEditor.animationAssets.graphs.map((g) => ({ ...g })),
    };
  }
}

/**
 * Upsert a reusable animation clip asset.
 * @param {object} clip
 * @returns {Promise<{ clips: Array<object>, graphs: Array<object> }>}
 */
export async function animationAssetClipUpsert(clip) {
  try {
    return await invoke("animation_asset_clip_upsert", { clip });
  } catch (error) {
    if (!isTauriUnavailable(error)) throw error;
    const idx = fallbackEditor.animationAssets.clips.findIndex((c) => c.id === clip.id);
    if (idx >= 0) fallbackEditor.animationAssets.clips[idx] = { ...clip };
    else fallbackEditor.animationAssets.clips.push({ ...clip });
    fallbackEditor.animationAssets.clips.sort((a, b) => String(a.id).localeCompare(String(b.id)));
    return animationAssetList();
  }
}

/**
 * Delete a reusable animation clip asset.
 * @param {string} id
 * @returns {Promise<{ clips: Array<object>, graphs: Array<object> }>}
 */
export async function animationAssetClipDelete(id) {
  try {
    return await invoke("animation_asset_clip_delete", { id });
  } catch (error) {
    if (!isTauriUnavailable(error)) throw error;
    const idx = fallbackEditor.animationAssets.clips.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error(`animation clip asset '${id}' not found`);
    fallbackEditor.animationAssets.clips.splice(idx, 1);
    return animationAssetList();
  }
}

/**
 * Upsert a reusable animation graph asset.
 * @param {object} graph
 * @returns {Promise<{ clips: Array<object>, graphs: Array<object> }>}
 */
export async function animationAssetGraphUpsert(graph) {
  try {
    return await invoke("animation_asset_graph_upsert", { graph });
  } catch (error) {
    if (!isTauriUnavailable(error)) throw error;
    const idx = fallbackEditor.animationAssets.graphs.findIndex((g) => g.id === graph.id);
    if (idx >= 0) fallbackEditor.animationAssets.graphs[idx] = { ...graph };
    else fallbackEditor.animationAssets.graphs.push({ ...graph });
    fallbackEditor.animationAssets.graphs.sort((a, b) => String(a.id).localeCompare(String(b.id)));
    return animationAssetList();
  }
}

/**
 * Delete a reusable animation graph asset.
 * @param {string} id
 * @returns {Promise<{ clips: Array<object>, graphs: Array<object> }>}
 */
export async function animationAssetGraphDelete(id) {
  try {
    return await invoke("animation_asset_graph_delete", { id });
  } catch (error) {
    if (!isTauriUnavailable(error)) throw error;
    const idx = fallbackEditor.animationAssets.graphs.findIndex((g) => g.id === id);
    if (idx === -1) throw new Error(`animation graph asset '${id}' not found`);
    fallbackEditor.animationAssets.graphs.splice(idx, 1);
    return animationAssetList();
  }
}

function fallbackPrefabList() {
  return {
    prefabs: fallbackEditor.prefabs.map((p) => ({ ...p })).sort((a, b) => a.id.localeCompare(b.id)),
  };
}

export async function createMapEntity(name, x, y, options = {}) {
  try {
    /** @type {MapCreatePayload} */
    const payload = { name, x, y };
    if (options.prefabId) {
      payload.prefabId = options.prefabId;
    }
    return await invoke("map_create", payload);
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    let resolvedName = name;
    if (options.prefabId) {
      const prefab = fallbackEditor.prefabs.find((candidate) => candidate.id === options.prefabId);
      if (!prefab) {
        throw new Error(`prefab '${options.prefabId}' not found`);
      }
      const trimmed = typeof name === "string" ? name.trim() : "";
      resolvedName = trimmed.length > 0 ? name : prefab.name;
    }
    pushHistory();
    const entity = {
      id: fallbackEditor.nextId++,
      name: resolvedName,
      position: { x, y },
      components: options.prefabId
        ? cloneComponentBag(
            fallbackEditor.prefabs.find((candidate) => candidate.id === options.prefabId)
              ?.default_components
          )
        : {},
    };
    fallbackEditor.entities.push(entity);
    setSelection([entity.id]);
    return editorSnapshot();
  }
}

export async function importSprite(name, dataUrl) {
  try {
    const payload = { name, data_url: dataUrl };
    return await invoke("import_sprite", payload);
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    // Fallback: store in local registry
    fallbackEditor.spriteRegistry = fallbackEditor.spriteRegistry || {};
    fallbackEditor.spriteRegistry[name] = dataUrl;
    return editorSnapshot();
  }
}

export async function renameMapEntity(id, name) {
  try {
    const payload = { id, name };
    return await invoke("map_rename", payload);
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    const entity = fallbackEditor.entities.find((candidate) => candidate.id === id);
    if (entity) {
      entity.name = name;
    }
    return editorSnapshot();
  }
}

export async function moveMapEntity(id, x, y) {
  try {
    /** @type {MapMovePayload} */
    const payload = { id, x, y };
    return await invoke("map_move", payload);
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    pushHistory();
    const entity = fallbackEditor.entities.find((candidate) => candidate.id === id);
    if (entity) {
      entity.position = { x, y };
      setSelection([id]);
    }
    return editorSnapshot();
  }
}

export async function batchMoveMapEntities(moves) {
  try {
    /** @type {MapBatchMovePayload} */
    const payload = { moves };
    return await invoke("map_batch_move", payload);
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    pushHistory();
    moves.forEach((move) => {
      const entity = fallbackEditor.entities.find((candidate) => candidate.id === move.id);
      if (entity) {
        entity.position = { x: move.x, y: move.y };
      }
    });
    setSelection(moves.map((move) => move.id));
    return editorSnapshot();
  }
}

export async function undoMap() {
  try {
    return await invoke("map_undo", {});
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    const previous = fallbackEditor.undoStack.pop();
    if (!previous) {
      return editorSnapshot();
    }
    fallbackEditor.redoStack.push(editorSnapshot());
    applySnapshot(previous);
    return editorSnapshot();
  }
}

export async function redoMap() {
  try {
    return await invoke("map_redo", {});
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    const next = fallbackEditor.redoStack.pop();
    if (!next) {
      return editorSnapshot();
    }
    fallbackEditor.undoStack.push(editorSnapshot());
    applySnapshot(next);
    return editorSnapshot();
  }
}

export async function reselectMapPrevious() {
  try {
    return await invoke("map_reselect", {});
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    const current = [...fallbackEditor.selection];
    fallbackEditor.selection = [...fallbackEditor.previousSelection];
    fallbackEditor.previousSelection = current;
    return editorSnapshot();
  }
}

export async function selectMapEntities(ids) {
  try {
    /** @type {MapSelectPayload} */
    const payload = { ids };
    return await invoke("map_select", payload);
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    const valid = new Set(fallbackEditor.entities.map((entity) => entity.id));
    const normalized = ids.filter((id) => valid.has(id));
    setSelection(normalized);
    return editorSnapshot();
  }
}

export async function deleteMapEntities(ids) {
  try {
    return await invoke("map_delete", { ids });
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    if (!ids || ids.length === 0) {
      return editorSnapshot();
    }

    pushHistory();
    const toDelete = new Set(ids);
    fallbackEditor.entities = fallbackEditor.entities.filter((entity) => !toDelete.has(entity.id));
    setSelection([]);
    return editorSnapshot();
  }
}

export async function resetMap() {
  try {
    return await invoke("map_reset", {});
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    const next = createDefaultFallbackEditor();
    fallbackEditor.nextId = next.nextId;
    fallbackEditor.entities = next.entities;
    fallbackEditor.tiles = next.tiles;
    fallbackEditor.playtest = next.playtest;
    fallbackEditor.playtestTrace = next.playtestTrace;
    fallbackEditor.playtestBreakpoints = next.playtestBreakpoints;
    fallbackEditor.lastBreakpointHit = next.lastBreakpointHit;
    fallbackEditor.prefabs = next.prefabs;
    fallbackEditor.selection = next.selection;
    fallbackEditor.previousSelection = next.previousSelection;
    fallbackEditor.undoStack = next.undoStack;
    fallbackEditor.redoStack = next.redoStack;
    return editorSnapshot();
  }
}

export async function paintMapTile(x, y, tileId = 1) {
  try {
    /** @type {MapPaintTilePayload} */
    const payload = { x, y, tileId };
    return await invoke("map_paint_tile", payload);
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    pushHistory();
    const existing = fallbackEditor.tiles.find((tile) => tile.x === x && tile.y === y);
    if (existing) {
      existing.tile_id = tileId;
    } else {
      fallbackEditor.tiles.push({ x, y, tile_id: tileId });
    }
    return editorSnapshot();
  }
}

export async function paintMapTiles(points, tileId = 1) {
  try {
    /** @type {MapPaintTilesPayload} */
    const payload = { points, tileId };
    return await invoke("map_paint_tiles", payload);
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    if (!points || points.length === 0) {
      return editorSnapshot();
    }
    pushHistory();
    const seen = new Set();
    for (const point of points) {
      const key = `${point.x}:${point.y}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const existing = fallbackEditor.tiles.find(
        (tile) => tile.x === point.x && tile.y === point.y
      );
      if (existing) {
        existing.tile_id = tileId;
      } else {
        fallbackEditor.tiles.push({ x: point.x, y: point.y, tile_id: tileId });
      }
    }
    return editorSnapshot();
  }
}

export async function eraseMapTile(x, y) {
  try {
    return await invoke("map_erase_tile", { x, y });
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    pushHistory();
    fallbackEditor.tiles = fallbackEditor.tiles.filter((tile) => !(tile.x === x && tile.y === y));
    return editorSnapshot();
  }
}

export async function eraseMapTiles(points) {
  try {
    /** @type {MapEraseTilesPayload} */
    const payload = { points };
    return await invoke("map_erase_tiles", payload);
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    if (!points || points.length === 0) {
      return editorSnapshot();
    }
    pushHistory();
    const toErase = new Set(points.map((point) => `${point.x}:${point.y}`));
    fallbackEditor.tiles = fallbackEditor.tiles.filter(
      (tile) => !toErase.has(`${tile.x}:${tile.y}`)
    );
    return editorSnapshot();
  }
}

export async function fillMapTiles(x, y, tileId = 1, canvasCols = 32, canvasRows = 32) {
  try {
    /** @type {MapFillTilesPayload} */
    const payload = { x, y, tileId, canvasCols, canvasRows };
    return await invoke("map_fill_tiles", payload);
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    // Web fallback: BFS flood-fill matching the Rust implementation.
    const tileMap = new Map(
      fallbackEditor.tiles.map((t) => [`${t.x}:${t.y}`, t.tile_id])
    );
    const seedTile = tileMap.get(`${x}:${y}`) ?? null;
    if (seedTile === tileId) {
      return editorSnapshot();
    }
    const MAX_FILL = 2048;
    const visited = new Set();
    const queue = [[x, y]];
    const fill = [];
    visited.add(`${x}:${y}`);
    while (queue.length > 0 && fill.length < MAX_FILL) {
      const [cx, cy] = queue.shift();
      if (cx < 0 || cy < 0 || cx >= canvasCols || cy >= canvasRows) {
        continue;
      }
      const current = tileMap.get(`${cx}:${cy}`) ?? null;
      if (current !== seedTile) {
        continue;
      }
      fill.push([cx, cy]);
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nk = `${cx + dx}:${cy + dy}`;
        if (!visited.has(nk)) {
          visited.add(nk);
          queue.push([cx + dx, cy + dy]);
        }
      }
    }
    if (fill.length === 0) {
      return editorSnapshot();
    }
    pushHistory();
    const fillSet = new Set(fill.map(([fx, fy]) => `${fx}:${fy}`));
    fallbackEditor.tiles = fallbackEditor.tiles.filter(
      (t) => !fillSet.has(`${t.x}:${t.y}`)
    );
    for (const [fx, fy] of fill) {
      fallbackEditor.tiles.push({ x: fx, y: fy, tile_id: tileId });
    }
    return editorSnapshot();
  }
}

export async function playtestKeyDown(key) {
  try {
    return await invoke("playtest_key_down", { key });
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    // key is already snake_case from mapKeyToGameInput() in ui-editor-input.js.
    wasmBridge.wasmKeyDown(key);
    return editorSnapshot();
  }
}

export async function playtestKeyUp(key) {
  try {
    return await invoke("playtest_key_up", { key });
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    wasmBridge.wasmKeyUp(key);
    return editorSnapshot();
  }
}

export async function setPhysicsConfig(gravity, friction) {
  try {
    return await invoke("set_physics_config", { gravity, friction });
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    fallbackEditor.physicsConfig = { gravity, friction };
    wasmBridge.wasmSetPhysicsConfig(gravity, friction);
    return editorSnapshot();
  }
}

export async function setCameraMode(mode) {
  try {
    return await invoke("set_camera_mode", { mode });
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    fallbackEditor.camera_mode = mode;
    wasmBridge.wasmSetCameraMode(mode);
    return editorSnapshot();
  }
}

export async function enterPlaytest() {
  try {
    return await invoke("playtest_enter", {});
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    // Capture authored positions before WASM may mutate them.
    _prePlaytestPositions = fallbackEditor.entities.map((e) => ({
      id: e.id,
      position: { x: e.position?.x ?? 0, y: e.position?.y ?? 0 },
    }));
    fallbackEditor.playtest = {
      active: true,
      paused: false,
      speed: 1,
      frame: 0,
      trace_enabled: fallbackEditor.playtest.trace_enabled,
      last_tick_delta_ms: 0,
      last_tick_steps: 0,
    };
    // Kick off WASM init eagerly; non-blocking if already loaded or unavailable.
    wasmBridge.initWasm().catch(() => {});
    await wasmBridge.createWasmRuntime(fallbackEditor);
    wasmBridge.wasmEnterPlaytest();
    return editorSnapshot();
  }
}

export async function exitPlaytest() {
  try {
    return await invoke("playtest_exit", {});
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    wasmBridge.wasmExitPlaytest();
    wasmBridge.destroyWasmRuntime();
    fallbackEditor.playtest = {
      active: false,
      paused: false,
      speed: 1,
      frame: 0,
      trace_enabled: false,
      last_tick_delta_ms: 0,
      last_tick_steps: 0,
    };
    fallbackEditor.playtestTrace = [];
    fallbackEditor.lastBreakpointHit = null;
    // Restore authored entity positions that WASM may have mutated.
    for (const snap of _prePlaytestPositions) {
      const entity = fallbackEditor.entities.find((e) => e.id === snap.id);
      if (entity) entity.position = snap.position;
    }
    _prePlaytestPositions = [];
    // Reset camera to authored origin.
    fallbackEditor.camera_x = 0;
    fallbackEditor.camera_y = 0;
    return editorSnapshot();
  }
}

export async function togglePlaytestPause() {
  try {
    return await invoke("playtest_toggle_pause", {});
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    if (fallbackEditor.playtest.active) {
      fallbackEditor.playtest = {
        ...fallbackEditor.playtest,
        paused: !fallbackEditor.playtest.paused,
      };
    }
    return editorSnapshot();
  }
}

export async function stepPlaytestFrame() {
  try {
    return await invoke("playtest_step", {});
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    if (fallbackEditor.playtest.active) {
      fallbackEditor.playtest = {
        ...fallbackEditor.playtest,
        paused: true,
        frame: fallbackEditor.playtest.frame + 1,
        last_tick_delta_ms: 0,
        last_tick_steps: 1,
      };
    }
    return editorSnapshot();
  }
}

export async function setPlaytestSpeed(speed) {
  try {
    /** @type {PlaytestSpeedPayload} */
    const payload = { speed };
    return await invoke("playtest_set_speed", payload);
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    if (fallbackEditor.playtest.active) {
      fallbackEditor.playtest = {
        ...fallbackEditor.playtest,
        speed,
      };
    }
    return editorSnapshot();
  }
}

export async function tickPlaytest(deltaMs) {
  try {
    /** @type {PlaytestTickPayload} */
    const payload = { deltaMs };
    return await invoke("playtest_tick", payload);
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    if (!fallbackEditor.playtest.active || fallbackEditor.playtest.paused) {
      fallbackEditor.playtest.last_tick_delta_ms = deltaMs;
      fallbackEditor.playtest.last_tick_steps = 0;
      return editorSnapshot();
    }
    if (wasmBridge.isWasmReady()) {
      // WASM path: let the engine compute movement, physics, camera.
      // Update fallbackEditor from result, then fall through to JS breakpoint logic.
      const result = wasmBridge.wasmTick(deltaMs);
      if (result) {
        fallbackEditor.playtest.frame = result.frame;
        fallbackEditor.playtest.last_tick_steps = result.steps_taken ?? 0;
        fallbackEditor.playtest.last_tick_delta_ms = deltaMs;
        fallbackEditor.camera_x = result.camera_x ?? 0;
        fallbackEditor.camera_y = result.camera_y ?? 0;
        for (const e of result.entities ?? []) {
          const local = fallbackEditor.entities.find((x) => x.id === e.id);
          if (local) {
            local.position = { x: e.x, y: e.y };
            // Sync animation state from WASM if present.
            if (e.sprite_frame != null) {
              local.components = local.components || {};
              local.components.sprite = local.components.sprite || {};
              local.components.sprite.frame = e.sprite_frame;
            }
            if (e.animation_state != null && local.animation) {
              local.animation.state.current_clip_name = e.animation_state;
            }
          }
        }
        // Fall through to trace/breakpoint logic below.
      }
    } else {
      // JS stub path: frame counter only (no actual physics).
      const speed = Math.max(0, fallbackEditor.playtest.speed);
      const stepMs = 1000 / 60;
      const steps = Math.floor((deltaMs * speed) / stepMs);
      fallbackEditor.playtest = {
        ...fallbackEditor.playtest,
        frame: fallbackEditor.playtest.frame + Math.max(0, steps),
      };
      fallbackEditor.playtest.last_tick_delta_ms = deltaMs;
      fallbackEditor.playtest.last_tick_steps = Math.max(0, steps);
    }
    // Retrieve the steps computed above (either from WASM or JS stub) for breakpoint logic.
    const steps = fallbackEditor.playtest.last_tick_steps;
    if (fallbackEditor.playtest.trace_enabled && steps > 0) {
      const seq = (fallbackEditor.playtestTrace.at(-1)?.seq || 0) + 1;
      fallbackEditor.playtestTrace.push({
        seq,
        frame: fallbackEditor.playtest.frame,
        kind: "playtest_tick",
        message: `Ticked ${steps} step(s) from ${deltaMs}ms`,
      });
      if (fallbackEditor.playtestTrace.length > 200) {
        fallbackEditor.playtestTrace.shift();
      }
    }
    if (steps > 0) {
      const shouldBreakTick = fallbackEditor.playtestBreakpoints.playtest_tick;
      const shouldBreakPickup =
        fallbackEditor.playtestBreakpoints.item_pickup && fallbackEditor.playtest.frame >= 120;
      const shouldBreakQuest =
        fallbackEditor.playtestBreakpoints.quest_state && fallbackEditor.playtest.frame >= 300;
      let hitKind = null;
      if (shouldBreakPickup) {
        hitKind = "item_pickup";
      } else if (shouldBreakQuest) {
        hitKind = "quest_state";
      } else if (shouldBreakTick) {
        hitKind = "playtest_tick";
      }
      if (hitKind) {
        const seq = (fallbackEditor.playtestTrace.at(-1)?.seq || 0) + 1;
        fallbackEditor.lastBreakpointHit = {
          seq,
          frame: fallbackEditor.playtest.frame,
          kind: `breakpoint:${hitKind}`,
          message: `Paused on ${hitKind}`,
        };
        fallbackEditor.playtestTrace.push({ ...fallbackEditor.lastBreakpointHit });
        fallbackEditor.playtest.paused = true;
      }
    }
    return editorSnapshot();
  }
}

export async function setPlaytestTrace(enabled) {
  try {
    /** @type {PlaytestTracePayload} */
    const payload = { enabled };
    return await invoke("playtest_set_trace", payload);
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    fallbackEditor.playtest = {
      ...fallbackEditor.playtest,
      trace_enabled: !!enabled,
    };
    const seq = (fallbackEditor.playtestTrace.at(-1)?.seq || 0) + 1;
    fallbackEditor.playtestTrace.push({
      seq,
      frame: fallbackEditor.playtest.frame,
      kind: "playtest_trace",
      message: enabled ? "Trace enabled" : "Trace disabled",
    });
    if (fallbackEditor.playtestTrace.length > 200) {
      fallbackEditor.playtestTrace.shift();
    }
    return editorSnapshot();
  }
}

export async function setPlaytestBreakpoints(kinds) {
  try {
    /** @type {PlaytestBreakpointsPayload} */
    const payload = { kinds };
    return await invoke("playtest_set_breakpoints", payload);
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    fallbackEditor.playtestBreakpoints = {
      playtest_tick: false,
      item_pickup: false,
      quest_state: false,
      script_event: false,
    };
    for (const kind of kinds || []) {
      if (kind in fallbackEditor.playtestBreakpoints) {
        fallbackEditor.playtestBreakpoints[kind] = true;
      }
    }
    fallbackEditor.lastBreakpointHit = null;
    return editorSnapshot();
  }
}

export async function exportPreviewHtml5(
  outputDir,
  profile = "game_boy",
  debug = false,
  projectDir = undefined,
  editorState = undefined
) {
  try {
    /** @type {ExportPreviewPayload} */
    const payload = { outputDir, profile, debug };
    if (typeof projectDir === "string" && projectDir.trim().length > 0) {
      payload.projectDir = projectDir;
    }
    if (editorState && typeof editorState === "object") {
      payload.editorState = editorState;
    }
    return await invoke("export_preview_html5", payload);
  } catch (error) {
    if (!isTauriUnavailable(error)) {
      throw error;
    }
    return {
      output_dir: outputDir,
      files: [
        "index.html",
        "runtime.js",
        "scenes.json",
        "metadata.json",
        "bundle.json",
        "assets/manifest.json",
      ],
      scene_count: 0,
      asset_count: 0,
      profile,
      mode: "fallback",
    };
  }
}

export function __resetFallbackEditorForTests() {
  const next = createDefaultFallbackEditor();
  fallbackEditor.nextId = next.nextId;
  fallbackEditor.entities = next.entities;
  fallbackEditor.tiles = next.tiles;
  fallbackEditor.playtest = next.playtest;
  fallbackEditor.playtestTrace = next.playtestTrace;
  fallbackEditor.playtestBreakpoints = next.playtestBreakpoints;
  fallbackEditor.lastBreakpointHit = next.lastBreakpointHit;
  fallbackEditor.prefabs = next.prefabs;
  fallbackEditor.scenes = next.scenes;
  fallbackEditor.activeSceneId = next.activeSceneId;
  fallbackEditor.selection = next.selection;
  fallbackEditor.previousSelection = next.previousSelection;
  fallbackEditor.undoStack = next.undoStack;
  fallbackEditor.redoStack = next.redoStack;
}
