import {
  batchMoveMapEntities,
  createMapEntity,
  deleteMapEntities,
  eraseMapTile,
  eraseMapTiles,
  enterPlaytest as apiEnterPlaytest,
  fetchProjectHealth,
  getEditorState,
  moveMapEntity,
  openProject,
  exportPreviewHtml5,
  paintMapTile,
  paintMapTiles,
  redoMap,
  resetMap,
  exitPlaytest as apiExitPlaytest,
  setPlaytestSpeed as apiSetPlaytestSpeed,
  setPlaytestTrace as apiSetPlaytestTrace,
  setPlaytestBreakpoints as apiSetPlaytestBreakpoints,
  selectMapEntities,
  stepPlaytestFrame as apiStepPlaytestFrame,
  tickPlaytest as apiTickPlaytest,
  togglePlaytestPause as apiTogglePlaytestPause,
  reselectMapPrevious,
  saveProject,
  undoMap,
  validateScriptGraph,
  detectRuntimeMode,
  addScene as apiAddScene,
  removeScene as apiRemoveScene,
  setActiveScene as apiSetActiveScene,
  listScenes as apiListScenes,
  getEntityComponents as apiGetEntityComponents,
  setEntityComponents as apiSetEntityComponents,
  animationAddClip as apiAnimationAddClip,
  animationSetState as apiAnimationSetState,
  animationSetTransitions as apiAnimationSetTransitions,
  playtestKeyDown as apiPlaytestKeyDown,
  playtestKeyUp as apiPlaytestKeyUp,
  setCameraMode as apiSetCameraMode,
  renameMapEntity as apiRenameMapEntity,
  importSprite as apiImportSprite,
  fillMapTiles as apiFillMapTiles,
} from "./project-api.js";
import { createEventBus } from "./event-bus.js";
import {
  buildTransitionDraft as buildAnimationTransitionDraft,
  finalizeTransitionDraft as finalizeAnimationTransitionDraft,
} from "./ui-animation-transition-builder.js";

/** @typedef {import("./types.js").AssistedGenerateOptions} AssistedGenerateOptions */
/** @typedef {import("./types.js").AssistedProfile} AssistedProfile */
/** @typedef {import("./types.js").EditorSnapshot} EditorSnapshot */
/** @typedef {import("./types.js").EditorStateResponse} EditorStateResponse */
/** @typedef {import("./types.js").ExportPreviewReport} ExportPreviewReport */
/** @typedef {import("./types.js").OpenProjectResponse} OpenProjectResponse */
/** @typedef {import("./types.js").ProjectHealthResponse} ProjectHealthResponse */
/** @typedef {import("./types.js").SaveProjectResponse} SaveProjectResponse */
/** @typedef {import("./types.js").SceneListResponse} SceneListResponse */
/** @typedef {import("./types.js").ScriptValidationReport} ScriptValidationReport */

const STARTER_TEMPLATES = {
  blank: {
    projectName: "New Project",
    entities: [],
    tileStroke: [],
    cameraMode: "follow",
  },
  rpg: {
    projectName: "RPG Starter",
    entities: [
      { name: "Player", x: 16, y: 16 },
      { name: "Guide NPC", x: 48, y: 16 },
    ],
    tileStroke: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 4, y: 0 },
      { x: 5, y: 0 },
      { x: 6, y: 0 },
      { x: 7, y: 0 },
      { x: 8, y: 0 },
      { x: 9, y: 0 },
    ],
    cameraMode: "screen_lock",
  },
  platformer: {
    projectName: "Platformer Starter",
    entities: [
      { name: "Player", x: 16, y: 32 },
      { name: "Goal Flag", x: 120, y: 32 },
    ],
    tileStroke: Array.from({ length: 12 }, (_, index) => ({ x: index, y: 5 })),
    cameraMode: "follow",
  },
  puzzle: {
    projectName: "Puzzle Starter",
    entities: [{ name: "Player", x: 16, y: 16 }],
    tileStroke: [
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 2, y: 3 },
      { x: 4, y: 3 },
      { x: 2, y: 4 },
      { x: 3, y: 4 },
      { x: 4, y: 4 },
    ],
    cameraMode: "fixed",
  },
};

const PRIMITIVE_ASSET_GENERATORS = {
  tree: {
    entityName: "Tree Prop",
    points: [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 },
    ],
  },
  bush: {
    entityName: "Bush Prop",
    points: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ],
  },
  rock: {
    entityName: "Rock Prop",
    points: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
    ],
  },
  crate: {
    entityName: "Crate Prop",
    points: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ],
  },
  chest: {
    entityName: "Chest Prop",
    points: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 1 },
    ],
  },
};

const ASSISTED_PROFILE_TILE_ID = {
  game_boy: 1,
  nes: 2,
  snes: 3,
};

const ASSISTED_PROFILE_ENTITY_SUFFIX = {
  game_boy: "GB",
  nes: "NES",
  snes: "SNES",
};

function normalizeGameplayEventKey(input) {
  const raw = String(input || "").trim().toLowerCase();
  if (!raw) {
    return "";
  }
  return raw.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function normalizeAudioId(input) {
  const raw = String(input || "").trim().toLowerCase();
  if (!raw) {
    return "";
  }
  const normalized = raw.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (!normalized) {
    return "";
  }
  return normalized.startsWith("audio_") ? normalized : `audio_${normalized}`;
}

function eventKeyFromNode(node) {
  const explicit =
    node?.event || node?.eventKey || node?.event_key || node?.trigger || node?.when || "";
  const explicitKey = normalizeGameplayEventKey(explicit);
  if (explicitKey) {
    return explicitKey;
  }

  const id = String(node?.id || "");
  const trimmed = id.replace(/^event[_-]*/i, "");
  const inferred = normalizeGameplayEventKey(trimmed);
  return inferred || normalizeGameplayEventKey(id);
}

function collectScriptGraphAudioBindings(input, parseError) {
  if (parseError || typeof input !== "string" || !input.trim()) {
    return { audioBindings: {}, audioEvents: [] };
  }
  let graph;
  try {
    graph = JSON.parse(input);
  } catch {
    return { audioBindings: {}, audioEvents: [] };
  }

  const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
  const edges = Array.isArray(graph?.edges) ? graph.edges : [];
  /** @type {Map<string, unknown>} */
  const nodesById = new Map();
  /** @type {Map<string, string[]>} */
  const incomingByTarget = new Map();
  for (const node of nodes) {
    const id = String(node?.id || "");
    if (!id) {
      continue;
    }
    nodesById.set(id, node);
  }
  for (const edge of edges) {
    const from = String(edge?.from || "");
    const to = String(edge?.to || "");
    if (!from || !to) {
      continue;
    }
    if (!incomingByTarget.has(to)) {
      incomingByTarget.set(to, []);
    }
    incomingByTarget.get(to).push(from);
  }

  /**
   * @param {string} nodeId
   * @returns {string[]}
   */
  function upstreamEventKeys(nodeId) {
    const seen = new Set();
    const queue = [nodeId];
    const keys = new Set();
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || seen.has(current)) {
        continue;
      }
      seen.add(current);
      const incoming = incomingByTarget.get(current) || [];
      for (const sourceId of incoming) {
        const source = /** @type {Record<string, unknown> | undefined} */ (
          nodesById.get(sourceId)
        );
        const sourceKind = String(source?.["kind"] || "").toLowerCase();
        if (sourceKind === "event") {
          const key = eventKeyFromNode(source);
          if (key) {
            keys.add(key);
          }
          continue;
        }
        queue.push(sourceId);
      }
    }
    return [...keys];
  }

  /** @type {Map<string, string>} */
  const bindings = new Map();

  const explicitBindings =
    graph?.audioBindings && typeof graph.audioBindings === "object" ? graph.audioBindings : {};
  for (const [eventName, audioName] of Object.entries(explicitBindings)) {
    const eventKey = normalizeGameplayEventKey(eventName);
    const audioId = normalizeAudioId(audioName);
    if (!eventKey || !audioId) {
      continue;
    }
    bindings.set(eventKey, audioId);
  }

  const explicitEvents = Array.isArray(graph?.audioEvents) ? graph.audioEvents : [];
  for (const entry of explicitEvents) {
    const eventKey = normalizeGameplayEventKey(entry?.event);
    const audioId = normalizeAudioId(entry?.audioId || entry?.audio_id);
    if (!eventKey || !audioId) {
      continue;
    }
    if (!bindings.has(eventKey)) {
      bindings.set(eventKey, audioId);
    }
  }

  for (const node of nodes) {
    const kind = String(node?.kind || "").toLowerCase();
    const nodeId = String(node?.id || "");
    const inlineAudioId = normalizeAudioId(
      node?.audioId ||
        node?.audio_id ||
        node?.clip ||
        node?.clipId ||
        node?.clip_id ||
        node?.assetId ||
        node?.asset_id ||
        node?.params?.audioId ||
        node?.params?.audio_id ||
        node?.params?.clip
    );
    if (!inlineAudioId) {
      continue;
    }
    const looksLikeAudioAction =
      kind.includes("audio") ||
      kind.includes("play") ||
      /^action[_-]*play[_-]*audio/i.test(nodeId) ||
      /^audio[_-]*play/i.test(nodeId);
    if (!looksLikeAudioAction) {
      continue;
    }

    const explicitEvent = normalizeGameplayEventKey(
      node?.event || node?.eventKey || node?.event_key || node?.trigger
    );
    const candidates = explicitEvent ? [explicitEvent] : upstreamEventKeys(nodeId);
    for (const eventKey of candidates) {
      if (!eventKey) {
        continue;
      }
      if (!bindings.has(eventKey)) {
        bindings.set(eventKey, inlineAudioId);
      }
    }
  }

  const audioBindings = Object.fromEntries(bindings.entries());
  const audioEvents = [...bindings.entries()].map(([event, audioId]) => ({ event, audioId }));
  return { audioBindings, audioEvents };
}

export function createAppState() {
  const events = createEventBus();
  /** @type {EditorSnapshot} */
  const state = {
    projectDir: ".",
    projectName: "",
    health: null,
    migrationReport: null,
    entities: [],
    tiles: [],
    selection: [],
    canUndo: false,
    canRedo: false,
    playtestTrace: [],
    watchSelectedEntity: null,
    watchFlags: [],
    watchVariables: [],
    watchInventory: [],
    watchSceneFlags: [],
    watchSceneVariables: [],
    watchSelectedFlags: [],
    watchSelectedVariables: [],
    watchSelectedInventory: [],
    playtestBreakpoints: [],
    lastBreakpointHit: null,
    playtest: {
      active: false,
      paused: false,
      speed: 1,
      frame: 0,
    },
    scenes: [],
    activeSceneId: null,
    selectedComponents: null,
    audioBindings: {},
    cameraX: 0,
    cameraY: 0,
    cameraMode: "follow",
    transitionActive: false,
    transitionOpacity: 0,
    tilePreviews: {},
    spriteRegistry: {},
    diagnostics: {
      grid: true,
      collision: false,
      ids: false,
      trace: false,
    },
    scriptValidation: {
      parseError: null,
      errors: [],
      lastInput: "",
    },
    lastError: null,
    exportPreviewReport: null,
    runtimeMode: detectRuntimeMode(),
  };

  // Playtest phase state machine: 'idle' | 'running' | 'exiting'
  // Incremented whenever the phase transitions so in-flight async results from
  // a prior phase are discarded before they can corrupt state.
  let playtestPhase = /** @type {'idle'|'running'|'exiting'} */ ('idle');
  let playtestSessionId = 0;

  /**
   * Returns true when an async playtest response should be dropped.
   * @param {number} sid Session ID captured before the async call.
   */
  function isStalePlaytestResponse(sid) {
    return playtestPhase !== 'running' || sid !== playtestSessionId;
  }

  /**
   * @template T
   * @param {string} action
   * @param {() => Promise<T>} operation
   * @returns {Promise<T | EditorSnapshot>}
   */
  async function runGuarded(action, operation) {
    try {
      const result = await operation();
      state.lastError = null;
      return result;
    } catch (error) {
      reportError(action, error);
      return state;
    }
  }

  function reportError(action, errorLike) {
    const message =
      errorLike instanceof Error
        ? errorLike.message
        : errorLike
          ? String(errorLike)
          : "Unknown error";
    state.lastError = { action, message };
    events.emit("app:error", { ...state });
    return state;
  }

  async function open(projectDir = state.projectDir) {
    return runGuarded("open", async () => {
      const response = /** @type {OpenProjectResponse} */ (await openProject(projectDir, false));
      state.projectDir = projectDir;
      state.projectName = response.manifest.name;
      state.health = response.health;
      state.migrationReport = response.migration_report;
      await refreshEditorState();
      events.emit("project:opened", { ...state });
      return state;
    });
  }

  async function save() {
    return runGuarded("save", async () => {
      const response = /** @type {SaveProjectResponse} */ (
        await saveProject(state.projectDir, state.projectName || "Untitled Project")
      );
      state.projectName = response.manifest.name;
      state.health = response.health;
      events.emit("project:saved", { ...state });
      return state;
    });
  }

  async function refreshHealth() {
    return runGuarded("refreshHealth", async () => {
      const response = /** @type {ProjectHealthResponse} */ (
        await fetchProjectHealth(state.projectDir)
      );
      state.health = response.health;
      events.emit("project:health-updated", { ...state });
      return state;
    });
  }

  /**
   * @param {EditorStateResponse} response
   */
  function applyEditorResponse(response) {
    if (response.project_name && !state.projectName) {
      state.projectName = response.project_name;
    }
    state.entities = response.entities || [];
    state.tiles = response.tiles || [];
    state.selection = response.selection || [];
    state.canUndo = !!response.can_undo;
    state.canRedo = !!response.can_redo;
    state.playtest = response.playtest || state.playtest;
    state.playtestTrace = response.playtest_trace || state.playtestTrace;
    state.watchSelectedEntity = response.watch_selected_entity || null;
    state.watchFlags = response.watch_flags || [];
    state.watchVariables = response.watch_variables || [];
    state.watchInventory = response.watch_inventory || [];
    state.watchSceneFlags = response.watch_scene_flags || [];
    state.watchSceneVariables = response.watch_scene_variables || [];
    state.watchSelectedFlags = response.watch_selected_flags || [];
    state.watchSelectedVariables = response.watch_selected_variables || [];
    state.watchSelectedInventory = response.watch_selected_inventory || [];
    state.playtestBreakpoints = response.playtest_breakpoints || [];
    state.lastBreakpointHit = response.last_breakpoint_hit || null;
    state.diagnostics.trace = !!state.playtest.trace_enabled;
    state.cameraX = response.camera_x ?? 0;
    state.cameraY = response.camera_y ?? 0;
    state.cameraMode = response.camera_mode ?? "follow";
    state.transitionActive = response.transition_active ?? false;
    state.transitionOpacity = response.transition_opacity ?? 0;
    state.tilePreviews = response.tile_previews ?? {};
    state.spriteRegistry = response.sprite_registry ?? {};
  }

  async function refreshEditorState() {
    return runGuarded("refreshEditorState", async () => {
      const response = await getEditorState();
      applyEditorResponse(response);
      events.emit("editor:state-updated", { ...state });
      return state;
    });
  }

  async function addEntity() {
    return runGuarded("addEntity", async () => {
      const name = `Entity ${state.entities.length + 1}`;
      const response = await createMapEntity(name, 16 + state.entities.length * 4, 16);
      applyEditorResponse(response);
      const createdId = state.selection[0] ?? null;
      events.emit("editor:state-updated", { ...state });
      events.emit("entity:created", { ...state, createdEntityId: createdId });
      return state;
    });
  }

  async function renameEntity(id, name) {
    return runGuarded("renameEntity", async () => {
      if (!name || !name.trim()) {
        return state;
      }
      const response = await apiRenameMapEntity(id, name.trim());
      applyEditorResponse(response);
      events.emit("editor:state-updated", { ...state });
      return state;
    });
  }

  async function importSprite(name, dataUrl) {
    return runGuarded("importSprite", async () => {
      const response = await apiImportSprite(name, dataUrl);
      applyEditorResponse(response);
      events.emit("editor:state-updated", { ...state });
      return state;
    });
  }

  async function moveSelectedBy(dx, dy) {
    return runGuarded("moveSelectedBy", async () => {
      if (state.selection.length === 0) {
        return state;
      }
      if (state.selection.length === 1) {
        const entity = state.entities.find((item) => item.id === state.selection[0]);
        if (!entity) {
          return state;
        }
        const response = await moveMapEntity(
          entity.id,
          entity.position.x + dx,
          entity.position.y + dy
        );
        applyEditorResponse(response);
        events.emit("editor:state-updated", { ...state });
        return state;
      }

      const moves = state.selection
        .map((id) => {
          const entity = state.entities.find((item) => item.id === id);
          if (!entity) {
            return null;
          }
          return { id: entity.id, x: entity.position.x + dx, y: entity.position.y + dy };
        })
        .filter(Boolean);
      const response = await batchMoveMapEntities(moves);
      applyEditorResponse(response);
      events.emit("editor:state-updated", { ...state });
      return state;
    });
  }

  async function undo() {
    return runGuarded("undo", async () => {
      const response = await undoMap();
      applyEditorResponse(response);
      events.emit("editor:state-updated", { ...state });
      return state;
    });
  }

  async function redo() {
    return runGuarded("redo", async () => {
      const response = await redoMap();
      applyEditorResponse(response);
      events.emit("editor:state-updated", { ...state });
      return state;
    });
  }

  async function reselectPrevious() {
    return runGuarded("reselectPrevious", async () => {
      const response = await reselectMapPrevious();
      applyEditorResponse(response);
      events.emit("editor:state-updated", { ...state });
      return state;
    });
  }

  async function selectEntities(ids) {
    return runGuarded("selectEntities", async () => {
      const response = await selectMapEntities(ids);
      applyEditorResponse(response);
      events.emit("editor:state-updated", { ...state });
      return state;
    });
  }

  async function deleteSelected() {
    return runGuarded("deleteSelected", async () => {
      if (state.selection.length === 0) {
        return state;
      }
      const response = await deleteMapEntities(state.selection);
      applyEditorResponse(response);
      events.emit("editor:state-updated", { ...state });
      return state;
    });
  }

  function setProjectName(name) {
    state.projectName = name;
    events.emit("project:changed", { ...state });
  }

  async function paintTileAt(x, y, tileId = 1) {
    return runGuarded("paintTileAt", async () => {
      const response = await paintMapTile(x, y, tileId);
      applyEditorResponse(response);
      events.emit("editor:state-updated", { ...state });
      return state;
    });
  }

  async function eraseTileAt(x, y) {
    return runGuarded("eraseTileAt", async () => {
      const response = await eraseMapTile(x, y);
      applyEditorResponse(response);
      events.emit("editor:state-updated", { ...state });
      return state;
    });
  }

  async function applyTileStroke(mode, points, tileId = 1) {
    return runGuarded("applyTileStroke", async () => {
      if (!points || points.length === 0) {
        return state;
      }
      const response =
        mode === "erase" ? await eraseMapTiles(points) : await paintMapTiles(points, tileId);
      applyEditorResponse(response);
      events.emit("editor:state-updated", { ...state });
      return state;
    });
  }

  async function fillTiles(x, y, tileId = 1, canvasCols = 32, canvasRows = 32) {
    return runGuarded("fillTiles", async () => {
      const response = await apiFillMapTiles(x, y, tileId, canvasCols, canvasRows);
      applyEditorResponse(response);
      events.emit("editor:state-updated", { ...state });
      return state;
    });
  }

  /**
   * @returns {EditorSnapshot}
   */
  function snapshot() {
    return { ...state };
  }

  async function enterPlaytest() {
    return runGuarded("enterPlaytest", async () => {
      playtestSessionId += 1;
      playtestPhase = 'running';
      const response = await apiEnterPlaytest();
      applyEditorResponse(response);
      events.emit("playtest:changed", { ...state });
      return state;
    });
  }

  async function exitPlaytest() {
    return runGuarded("exitPlaytest", async () => {
      playtestSessionId += 1;
      playtestPhase = 'exiting';
      // Hard barrier: force active=false and notify UI synchronously so the
      // overlay hides before the backend round-trip completes. Any in-flight
      // tick/key/toggle responses arriving after this point will be dropped by
      // isStalePlaytestResponse (phase is no longer 'running').
      state.playtest = { ...state.playtest, active: false };
      events.emit("playtest:changed", { ...state });
      try {
        const response = await apiExitPlaytest();
        applyEditorResponse(response);
        events.emit("playtest:changed", { ...state });
        return state;
      } finally {
        playtestPhase = 'idle';
      }
    });
  }

  async function togglePlayPause() {
    return runGuarded("togglePlayPause", async () => {
      const sid = playtestSessionId;
      if (isStalePlaytestResponse(sid)) return state;
      const response = await apiTogglePlaytestPause();
      if (isStalePlaytestResponse(sid)) return state;
      applyEditorResponse(response);
      events.emit("playtest:changed", { ...state });
      return state;
    });
  }

  async function stepPlaytestFrame() {
    return runGuarded("stepPlaytestFrame", async () => {
      const sid = playtestSessionId;
      if (isStalePlaytestResponse(sid)) return state;
      const response = await apiStepPlaytestFrame();
      if (isStalePlaytestResponse(sid)) return state;
      applyEditorResponse(response);
      events.emit("playtest:changed", { ...state });
      return state;
    });
  }

  async function setPlaytestSpeed(speed) {
    return runGuarded("setPlaytestSpeed", async () => {
      const sid = playtestSessionId;
      if (isStalePlaytestResponse(sid)) return state;
      const response = await apiSetPlaytestSpeed(speed);
      if (isStalePlaytestResponse(sid)) return state;
      applyEditorResponse(response);
      events.emit("playtest:changed", { ...state });
      return state;
    });
  }

  async function tickPlaytest(deltaMs) {
    return runGuarded("tickPlaytest", async () => {
      const sid = playtestSessionId;
      if (isStalePlaytestResponse(sid)) return state;
      const response = await apiTickPlaytest(deltaMs);
      if (isStalePlaytestResponse(sid)) return state;
      applyEditorResponse(response);
      events.emit("playtest:changed", { ...state });
      return state;
    });
  }

  async function playtestKeyDown(key) {
    return runGuarded("playtestKeyDown", async () => {
      const sid = playtestSessionId;
      if (isStalePlaytestResponse(sid)) return state;
      const response = await apiPlaytestKeyDown(key);
      if (isStalePlaytestResponse(sid)) return state;
      applyEditorResponse(response);
      return state;
    });
  }

  async function playtestKeyUp(key) {
    return runGuarded("playtestKeyUp", async () => {
      const sid = playtestSessionId;
      if (isStalePlaytestResponse(sid)) return state;
      const response = await apiPlaytestKeyUp(key);
      if (isStalePlaytestResponse(sid)) return state;
      applyEditorResponse(response);
      return state;
    });
  }

  async function setCameraMode(mode) {
    return runGuarded("setCameraMode", async () => {
      const response = await apiSetCameraMode(mode);
      applyEditorResponse(response);
      return state;
    });
  }

  async function setTraceEnabled(enabled) {
    return runGuarded("setTraceEnabled", async () => {
      const response = await apiSetPlaytestTrace(enabled);
      applyEditorResponse(response);
      events.emit("diagnostics:changed", { ...state });
      events.emit("playtest:changed", { ...state });
      return state;
    });
  }

  async function setBreakpoints(kinds) {
    return runGuarded("setBreakpoints", async () => {
      const response = await apiSetPlaytestBreakpoints(kinds);
      applyEditorResponse(response);
      events.emit("diagnostics:changed", { ...state });
      events.emit("playtest:changed", { ...state });
      return state;
    });
  }

  function toggleDiagnostic(key) {
    if (!(key in state.diagnostics)) {
      return state;
    }
    state.diagnostics = {
      ...state.diagnostics,
      [key]: !state.diagnostics[key],
    };
    events.emit("diagnostics:changed", { ...state });
    return state;
  }

  async function validateScriptGraphInput(input) {
    return runGuarded("validateScriptGraphInput", async () => {
      state.scriptValidation.lastInput = input;
      state.scriptValidation.parseError = null;
      state.scriptValidation.errors = [];

      let graph;
      try {
        graph = JSON.parse(input);
      } catch (error) {
        state.scriptValidation.parseError = `Invalid JSON: ${error?.message || String(error)}`;
        events.emit("script:validated", { ...state });
        return state;
      }

      const report = /** @type {ScriptValidationReport} */ (await validateScriptGraph(graph));
      state.scriptValidation.errors = report.errors || [];
      events.emit("script:validated", { ...state });
      return state;
    });
  }

  async function exportPreview(outputDir = "export-artifacts/html5-preview", profile = "game_boy") {
    return runGuarded("exportPreview", async () => {
      const scriptAudio = collectScriptGraphAudioBindings(
        state.scriptValidation.lastInput,
        state.scriptValidation.parseError
      );
      /** @type {import("./types.js").ExportEditorStateHint} */
      const editorStateHint = {
        entities: state.entities,
        tiles: state.tiles,
        playtest: { frame: state.playtest.frame },
      };
      // Merge manual audio bindings with script-graph-inferred ones (manual wins on conflict).
      const mergedBindings = { ...scriptAudio.audioBindings, ...state.audioBindings };
      if (Object.keys(mergedBindings).length > 0) {
        editorStateHint.audioBindings = mergedBindings;
      }
      const mergedEvents = [
        ...scriptAudio.audioEvents.filter((e) => !state.audioBindings[e.event]),
        ...Object.entries(state.audioBindings).map(([event, audioId]) => ({ event, audioId })),
      ];
      if (mergedEvents.length > 0) {
        editorStateHint.audioEvents = mergedEvents;
      }
      const report = /** @type {ExportPreviewReport} */ (
        await exportPreviewHtml5(outputDir, profile, false, state.projectDir, editorStateHint)
      );
      state.exportPreviewReport = report;
      events.emit("project:export-preview", { ...state });
      return state;
    });
  }

  async function newProjectFromTemplate(templateKey = "blank") {
    return runGuarded("newProjectFromTemplate", async () => {
      if (state.playtest.active) {
        const exited = await apiExitPlaytest();
        applyEditorResponse(exited);
      }

      const template = STARTER_TEMPLATES[templateKey] || STARTER_TEMPLATES.blank;
      const reset = await resetMap();
      applyEditorResponse(reset);

      if (template.tileStroke.length > 0) {
        const painted = await paintMapTiles(template.tileStroke, 1);
        applyEditorResponse(painted);
      }

      for (const entity of template.entities) {
        const created = await createMapEntity(entity.name, entity.x, entity.y);
        applyEditorResponse(created);
      }

      if (template.cameraMode) {
        const camResponse = await apiSetCameraMode(template.cameraMode);
        applyEditorResponse(camResponse);
      }

      state.projectName = template.projectName;
      events.emit("project:changed", { ...state });
      events.emit("project:new", { ...state, template: templateKey });
      events.emit("editor:state-updated", { ...state });
      return state;
    });
  }

  /**
   * @param {string} kind
   * @param {AssistedProfile} profile
   * @param {AssistedGenerateOptions} options
   */
  async function generatePrimitiveAsset(kind = "tree", profile = "game_boy", options = {}) {
    return runGuarded("generatePrimitiveAsset", async () => {
      if (state.playtest.active) {
        const exited = await apiExitPlaytest();
        applyEditorResponse(exited);
      }

      const recipe = PRIMITIVE_ASSET_GENERATORS[kind] || PRIMITIVE_ASSET_GENERATORS.tree;
      const profileKey = ASSISTED_PROFILE_TILE_ID[profile] ? profile : "game_boy";
      const tileId = ASSISTED_PROFILE_TILE_ID[profileKey];
      const profileSuffix = ASSISTED_PROFILE_ENTITY_SUFFIX[profileKey];
      const sequence = state.entities.length % 6;
      const fallbackBaseX = 1 + sequence * 3;
      const fallbackBaseY = 1 + (Math.floor(state.entities.length / 6) % 4) * 3;
      const parsedBaseX = Number.isFinite(options?.baseX)
        ? Math.max(0, Math.floor(options.baseX))
        : fallbackBaseX;
      const parsedBaseY = Number.isFinite(options?.baseY)
        ? Math.max(0, Math.floor(options.baseY))
        : fallbackBaseY;
      const mirrorX = !!options?.mirrorX;
      const customPoints = Array.isArray(options?.points)
        ? options.points
            .map((point) => ({
              x: Number(point?.x),
              y: Number(point?.y),
            }))
            .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
            .map((point) => ({
              x: Math.max(0, point.x),
              y: Math.max(0, point.y),
            }))
        : [];
      const points =
        customPoints.length > 0
          ? customPoints
          : (() => {
              const maxRecipeX = recipe.points.reduce((max, point) => Math.max(max, point.x), 0);
              return recipe.points.map((point) => ({
                x: parsedBaseX + (mirrorX ? maxRecipeX - point.x : point.x),
                y: parsedBaseY + point.y,
              }));
            })();
      const minX = points.reduce((min, point) => Math.min(min, point.x), parsedBaseX);
      const minY = points.reduce((min, point) => Math.min(min, point.y), parsedBaseY);

      if (points.length > 0) {
        const painted = await paintMapTiles(points, tileId);
        applyEditorResponse(painted);
      }

      const created = await createMapEntity(
        `${recipe.entityName} (${profileSuffix})`,
        minX * 16,
        minY * 16
      );
      applyEditorResponse(created);
      events.emit("assisted:generated", {
        ...state,
        primitiveKind: kind,
        primitiveProfile: profileKey,
      });
      events.emit("editor:state-updated", { ...state });
      return state;
    });
  }

  /**
   * @param {AssistedProfile} profile
   */
  async function cleanupAssistedGenerated(profile = "game_boy") {
    return runGuarded("cleanupAssistedGenerated", async () => {
      if (state.playtest.active) {
        const exited = await apiExitPlaytest();
        applyEditorResponse(exited);
      }

      const profileKey = ASSISTED_PROFILE_ENTITY_SUFFIX[profile] ? profile : "game_boy";
      const suffix = ASSISTED_PROFILE_ENTITY_SUFFIX[profileKey];
      const ids = state.entities
        .filter((entity) => typeof entity.name === "string" && entity.name.endsWith(`(${suffix})`))
        .map((entity) => entity.id);

      if (ids.length > 0) {
        const deleted = await deleteMapEntities(ids);
        applyEditorResponse(deleted);
      }

      events.emit("assisted:cleanup", {
        ...state,
        primitiveProfile: profileKey,
        removedCount: ids.length,
      });
      events.emit("editor:state-updated", { ...state });
      return state;
    });
  }

  // ── Scene management ──────────────────────────────────────────────

  async function fetchScenes() {
    return runGuarded("fetchScenes", async () => {
      const response = /** @type {SceneListResponse} */ (await apiListScenes());
      state.scenes = response.scenes || [];
      state.activeSceneId = response.active_scene_id || null;
      if (response.state) {
        applyEditorResponse(response.state);
      }
      events.emit("scenes:updated", { ...state });
      return state;
    });
  }

  async function addScene(id, name) {
    return runGuarded("addScene", async () => {
      const response = /** @type {SceneListResponse} */ (await apiAddScene(id, name));
      state.scenes = response.scenes || [];
      state.activeSceneId = response.active_scene_id || null;
      if (response.state) {
        applyEditorResponse(response.state);
      }
      events.emit("scenes:updated", { ...state });
      return state;
    });
  }

  async function removeScene(id) {
    return runGuarded("removeScene", async () => {
      const response = /** @type {SceneListResponse} */ (await apiRemoveScene(id));
      state.scenes = response.scenes || [];
      state.activeSceneId = response.active_scene_id || null;
      if (response.state) {
        applyEditorResponse(response.state);
      }
      events.emit("scenes:updated", { ...state });
      return state;
    });
  }

  async function switchScene(id) {
    return runGuarded("switchScene", async () => {
      const response = /** @type {SceneListResponse} */ (await apiSetActiveScene(id));
      state.scenes = response.scenes || [];
      state.activeSceneId = response.active_scene_id || null;
      if (response.state) {
        applyEditorResponse(response.state);
      }
      events.emit("scenes:updated", { ...state });
      events.emit("editor:state-updated", { ...state });
      return state;
    });
  }

  // ── Audio routing ─────────────────────────────────────────────────

  function addAudioBinding(eventKey, clipId) {
    const normalizedEvent = normalizeGameplayEventKey(eventKey);
    const normalizedClip = normalizeAudioId(clipId);
    if (!normalizedEvent || !normalizedClip) return state;
    state.audioBindings = { ...state.audioBindings, [normalizedEvent]: normalizedClip };
    events.emit("audio:bindings-updated", { ...state });
    return state;
  }

  function removeAudioBinding(eventKey) {
    const normalizedEvent = normalizeGameplayEventKey(eventKey);
    if (!normalizedEvent) return state;
    const next = { ...state.audioBindings };
    delete next[normalizedEvent];
    state.audioBindings = next;
    events.emit("audio:bindings-updated", { ...state });
    return state;
  }

  // ── Component queries ────────────────────────────────────────────

  async function fetchSelectedComponents() {
    return runGuarded("fetchSelectedComponents", async () => {
      if (state.selection.length !== 1) {
        state.selectedComponents = null;
        events.emit("components:updated", { ...state });
        return state;
      }
      const response = /** @type {Record<string, unknown>} */ (await apiGetEntityComponents(state.selection[0]));
      state.selectedComponents = response;
      events.emit("components:updated", { ...state });
      return state;
    });
  }

  async function setSelectedEntityComponents(components) {
    return runGuarded("setSelectedEntityComponents", async () => {
      if (state.selection.length !== 1) {
        return state;
      }
      const entityId = state.selection[0];
      const response = await apiSetEntityComponents(entityId, components || {});
      applyEditorResponse(response);
      events.emit("editor:state-updated", { ...state });
      await fetchSelectedComponents();
      return state;
    });
  }

  // -- Animation authoring helpers --------------------------------------------

  function requireSingleSelectionForAnimation() {
    if (state.selection.length !== 1) {
      throw new Error("select exactly one entity to edit animation");
    }
    return state.selection[0];
  }

  async function addSelectedEntityAnimationClip(clipName, clip) {
    return runGuarded("addSelectedEntityAnimationClip", async () => {
      const entityId = requireSingleSelectionForAnimation();
      const response = await apiAnimationAddClip(entityId, clipName, clip);
      applyEditorResponse(response);
      events.emit("editor:state-updated", { ...state });
      return state;
    });
  }

  async function setSelectedEntityAnimationState(stateName) {
    return runGuarded("setSelectedEntityAnimationState", async () => {
      const entityId = requireSingleSelectionForAnimation();
      const response = await apiAnimationSetState(entityId, stateName);
      applyEditorResponse(response);
      events.emit("editor:state-updated", { ...state });
      return state;
    });
  }

  /**
   * @param {Array<{ from_state: string, to_state: string, condition: object }>} transitions
   */
  async function setSelectedEntityAnimationTransitions(transitions) {
    return runGuarded("setSelectedEntityAnimationTransitions", async () => {
      const entityId = requireSingleSelectionForAnimation();
      const response = await apiAnimationSetTransitions(entityId, transitions);
      applyEditorResponse(response);
      events.emit("editor:state-updated", { ...state });
      return state;
    });
  }

  return {
    events,
    open,
    save,
    refreshHealth,
    refreshEditorState,
    addEntity,
    renameEntity,
    importSprite,
    moveSelectedBy,
    undo,
    redo,
    selectEntities,
    deleteSelected,
    paintTileAt,
    eraseTileAt,
    applyTileStroke,
    fillTiles,
    enterPlaytest,
    exitPlaytest,
    togglePlayPause,
    stepPlaytestFrame,
    setPlaytestSpeed,
    tickPlaytest,
    playtestKeyDown,
    playtestKeyUp,
    setCameraMode,
    setTraceEnabled,
    setBreakpoints,
    toggleDiagnostic,
    validateScriptGraphInput,
    newProjectFromTemplate,
    generatePrimitiveAsset,
    cleanupAssistedGenerated,
    exportPreview,
    reselectPrevious,
    reportError,
    setProjectName,
    fetchScenes,
    addScene,
    removeScene,
    switchScene,
    fetchSelectedComponents,
    setSelectedEntityComponents,
    buildAnimationTransitionDraft,
    finalizeAnimationTransitionDraft,
    addSelectedEntityAnimationClip,
    setSelectedEntityAnimationState,
    setSelectedEntityAnimationTransitions,
    addAudioBinding,
    removeAudioBinding,
    snapshot,
  };
}
