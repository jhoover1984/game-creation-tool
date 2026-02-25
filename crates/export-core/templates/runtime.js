__GCS_DEBUG_COMMENT__async function loadScenes() {
  const response = await fetch("./scenes.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`failed to load scenes.json: ${response.status}`);
  }
  return response.json();
}

async function loadAssetsManifest() {
  const response = await fetch("./assets/manifest.json", { cache: "no-store" });
  if (!response.ok) {
    return { assets: [] };
  }
  try {
    return await response.json();
  } catch {
    return { assets: [] };
  }
}

async function loadMetadata() {
  const response = await fetch("./metadata.json", { cache: "no-store" });
  if (!response.ok) {
    return {};
  }
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function normalizeAssetPath(path) {
  const raw = String(path || "").trim();
  if (!raw) {
    return "";
  }
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) {
    return raw;
  }
  return raw.startsWith("./") ? raw : `./${raw}`;
}

function loadImage(path) {
  return new Promise((resolve) => {
    const src = normalizeAssetPath(path);
    if (!src) {
      resolve(null);
      return;
    }
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function loadAudio(path) {
  const src = normalizeAssetPath(path);
  if (!src) {
    return null;
  }
  const audio = new Audio(src);
  audio.preload = "auto";
  return audio;
}

async function loadAssetCatalog() {
  const manifest = await loadAssetsManifest();
  const assets = Array.isArray(manifest?.assets) ? manifest.assets : [];
  const assetById = new Map();
  for (const asset of assets) {
    const id = String(asset?.id || "");
    const path = String(asset?.path || "");
    const kind = String(asset?.kind || "");
    if (!id || !path) {
      continue;
    }
    assetById.set(id, { id, path, kind });
  }
  const imageCandidates = [...assetById.entries()].filter(
    ([, asset]) => asset.kind !== "audio_clip"
  );
  const audioCandidates = [...assetById.entries()].filter(
    ([, asset]) => asset.kind === "audio_clip"
  );
  const imageEntries = await Promise.all(
    imageCandidates.map(async ([id, asset]) => [id, await loadImage(asset.path)])
  );
  const imageById = new Map();
  for (const [id, image] of imageEntries) {
    if (image) {
      imageById.set(id, image);
    }
  }
  const audioById = new Map();
  for (const [id, asset] of audioCandidates) {
    const audio = loadAudio(asset.path);
    if (audio) {
      audioById.set(id, audio);
    }
  }
  return { assetById, imageById, audioById };
}

function tileColor(frame) {
  return frame % 30 < 15 ? "#8bac0f" : "#306230";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function assetSlug(input) {
  const normalized = String(input || "").toLowerCase();
  const collapsed = normalized.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return collapsed || "unnamed";
}

function normalizeGameplayEventKey(input) {
  const raw = String(input || "").trim().toLowerCase();
  if (!raw) {
    return "";
  }
  return raw.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function tileAssetId(tileId) {
  const value = Number(tileId || 0);
  if (value <= 0) {
    return null;
  }
  return `tile_${value}`;
}

function entityAssetId(name) {
  return `entity_${assetSlug(name)}`;
}

function buildSceneState(scene, assetCatalog) {
  if (!scene) {
    return null;
  }
  const width = scene.options?.width ?? 160;
  const height = scene.options?.height ?? 144;
  const tilePx = scene.options?.tilePx ?? 8;
  const frame = scene.snapshot?.playtest?.frame ?? 0;
  const imageById = assetCatalog?.imageById instanceof Map ? assetCatalog.imageById : new Map();
  const tiles = (scene.snapshot?.tiles || []).map((tile) => ({
    x: Number(tile?.x || 0),
    y: Number(tile?.y || 0),
    tile_id: Number(tile?.tile_id || 0),
    asset_id: tileAssetId(tile?.tile_id),
  }));
  const entities = (scene.snapshot?.entities || []).map((entity) => ({
    id: Number(entity?.id || 0),
    name: String(entity?.name || "Entity"),
    position: {
      x: clamp(Number(entity?.position?.x || 0), 0, Math.max(0, width - tilePx)),
      y: clamp(Number(entity?.position?.y || 0), 0, Math.max(0, height - tilePx)),
    },
    asset_id: entityAssetId(entity?.name || "Entity"),
  }));
  const solidTiles = new Set(
    tiles.filter((tile) => tile.tile_id > 0).map((tile) => `${tile.x},${tile.y}`)
  );
  return {
    name: String(scene.name || "scene"),
    width,
    height,
    tilePx,
    frame,
    tiles,
    entities,
    solidTiles,
    imageById,
  };
}

function renderSceneStateToCanvas(canvas, state) {
  if (!(canvas instanceof HTMLCanvasElement) || !state) {
    return false;
  }
  const { width, height, tilePx, frame } = state;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return false;
  }

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#9bbc0f";
  ctx.fillRect(0, 0, width, height);

  for (const tile of state.tiles) {
    const x = tile.x * tilePx;
    const y = tile.y * tilePx;
    const image = tile.asset_id ? state.imageById.get(tile.asset_id) : null;
    if (image) {
      ctx.drawImage(image, x, y, tilePx, tilePx);
      continue;
    }
    ctx.fillStyle = tileColor(frame);
    ctx.fillRect(x, y, tilePx, tilePx);
  }

  for (const entity of state.entities) {
    const x = clamp(entity.position.x, 0, width - tilePx);
    const y = clamp(entity.position.y, 0, height - tilePx);
    const image = entity.asset_id ? state.imageById.get(entity.asset_id) : null;
    if (image) {
      ctx.drawImage(image, x, y, tilePx, tilePx);
      continue;
    }
    ctx.fillStyle = "#0f380f";
    ctx.fillRect(x, y, tilePx, tilePx);
  }

  return true;
}

function positionIsBlocked(state, x, y, movingEntityIndex) {
  if (!state) {
    return true;
  }
  if (x < 0 || y < 0 || x > state.width - state.tilePx || y > state.height - state.tilePx) {
    return true;
  }
  const tileX = Math.floor(x / state.tilePx);
  const tileY = Math.floor(y / state.tilePx);
  if (state.solidTiles.has(`${tileX},${tileY}`)) {
    return true;
  }
  for (let i = 0; i < state.entities.length; i += 1) {
    if (i === movingEntityIndex) {
      continue;
    }
    const entity = state.entities[i];
    if (entity.position.x === x && entity.position.y === y) {
      return true;
    }
  }
  return false;
}

function movePrimaryEntityInState(state, dxTiles, dyTiles) {
  if (!state || state.entities.length === 0) {
    return false;
  }
  const entityIndex = 0;
  const entity = state.entities[entityIndex];
  const nextX = entity.position.x + dxTiles * state.tilePx;
  const nextY = entity.position.y + dyTiles * state.tilePx;
  if (positionIsBlocked(state, nextX, nextY, entityIndex)) {
    return false;
  }
  entity.position.x = nextX;
  entity.position.y = nextY;
  return true;
}

function movementFromKey(event) {
  switch (event.key) {
    case "ArrowLeft":
    case "a":
    case "A":
      return { dx: -1, dy: 0 };
    case "ArrowRight":
    case "d":
    case "D":
      return { dx: 1, dy: 0 };
    case "ArrowUp":
    case "w":
    case "W":
      return { dx: 0, dy: -1 };
    case "ArrowDown":
    case "s":
    case "S":
      return { dx: 0, dy: 1 };
    default:
      return null;
  }
}

function applyViewportScale(canvas) {
  if (!(canvas instanceof HTMLCanvasElement)) {
    return;
  }
  const baseWidth = Math.max(1, canvas.width || 160);
  const baseHeight = Math.max(1, canvas.height || 144);
  const maxWidth = Math.max(baseWidth, window.innerWidth - 64);
  const maxHeight = Math.max(baseHeight, window.innerHeight - 180);
  const scale = Math.max(1, Math.floor(Math.min(maxWidth / baseWidth, maxHeight / baseHeight)));
  canvas.style.width = `${baseWidth * scale}px`;
  canvas.style.height = `${baseHeight * scale}px`;
}

function resolveMovementAudioId(audioById) {
  const preferred = ["audio_step", "audio_move", "audio_footstep", "audio_theme"];
  for (const id of preferred) {
    if (audioById.has(id)) {
      return id;
    }
  }
  const first = audioById.keys().next();
  return first?.done ? null : first.value;
}

function normalizeAudioBindings(rawBindings, audioById) {
  const bindings = new Map();
  if (!rawBindings || typeof rawBindings !== "object") {
    return bindings;
  }
  for (const [rawEvent, rawAudioId] of Object.entries(rawBindings)) {
    const eventKey = normalizeGameplayEventKey(rawEvent);
    const audioKey = String(rawAudioId || "").trim();
    if (!eventKey || !audioKey || !audioById.has(audioKey)) {
      continue;
    }
    bindings.set(eventKey, audioKey);
  }
  return bindings;
}

function resolveGameplayAudioId(eventName, audioById, audioBindingsByEvent) {
  const eventKey = normalizeGameplayEventKey(eventName);
  if (!eventKey) {
    return null;
  }
  const boundAudioId = audioBindingsByEvent.get(eventKey);
  if (boundAudioId && audioById.has(boundAudioId)) {
    return boundAudioId;
  }

  const eventDerived = `audio_${eventKey}`;
  if (audioById.has(eventDerived)) {
    return eventDerived;
  }

  const aliases = {
    item_pickup: "audio_pickup",
    pickup: "audio_pickup",
    quest_state: "audio_quest",
    interaction: "audio_interact",
    ui_open: "audio_ui_open",
    ui_close: "audio_ui_close",
    menu_confirm: "audio_confirm",
    menu_move: "audio_menu_move",
    battle_start: "audio_battle_start",
    battle_win: "audio_battle_win",
    damage: "audio_damage",
    heal: "audio_heal",
  };
  const aliasId = aliases[eventKey];
  if (aliasId && audioById.has(aliasId)) {
    return aliasId;
  }
  return null;
}

async function bootExportRuntime() {
  const [scenes, assetCatalog, metadata] = await Promise.all([
    loadScenes(),
    loadAssetCatalog(),
    loadMetadata(),
  ]);
  const loadedAssetCount = assetCatalog?.imageById instanceof Map ? assetCatalog.imageById.size : 0;
  const loadedAudioCount = assetCatalog?.audioById instanceof Map ? assetCatalog.audioById.size : 0;
  const canvas = document.getElementById("export-viewport");
  const sceneLabel = document.getElementById("export-scene-name");
  const scenesByName = new Map(scenes.map((scene) => [scene.name, scene]));
  const audioById = assetCatalog?.audioById instanceof Map ? assetCatalog.audioById : new Map();
  const movementAudioId = resolveMovementAudioId(audioById);
  let audioBindingsByEvent = normalizeAudioBindings(
    metadata?.audio_bindings || metadata?.audioBindings,
    audioById
  );
  const audioPlaybackEvents = [];
  let activeSceneState = null;
  const bridge = {
    renderSceneByName(name) {
      const scene = scenesByName.get(name);
      if (!scene) {
        return false;
      }
      activeSceneState = buildSceneState(scene, assetCatalog);
      const ok = renderSceneStateToCanvas(canvas, activeSceneState);
      if (ok && sceneLabel) {
        sceneLabel.textContent = `Scene: ${scene.name}`;
      }
      return ok;
    },
    movePrimaryEntity(dxTiles, dyTiles) {
      if (!activeSceneState) {
        return false;
      }
      const moved = movePrimaryEntityInState(activeSceneState, dxTiles, dyTiles);
      if (!moved) {
        return false;
      }
      return renderSceneStateToCanvas(canvas, activeSceneState);
    },
    getPrimaryEntityPosition() {
      if (!activeSceneState || activeSceneState.entities.length === 0) {
        return null;
      }
      const entity = activeSceneState.entities[0];
      return { x: entity.position.x, y: entity.position.y };
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
    getLoadedAssetCount() {
      return loadedAssetCount;
    },
    getLoadedAudioCount() {
      return loadedAudioCount;
    },
    listAudioIds() {
      return [...audioById.keys()];
    },
    hasAudioAsset(id) {
      return audioById.has(String(id || ""));
    },
    async playAudioById(id, options = {}) {
      const key = String(id || "");
      const source = String(options?.source || "manual");
      audioPlaybackEvents.push({
        id: key,
        source,
        ok: null,
        reason: "attempted",
      });
      const audio = audioById.get(key);
      if (!audio) {
        audioPlaybackEvents.push({
          id: key,
          source,
          ok: false,
          reason: "missing_asset",
        });
        return false;
      }
      const restart = options?.restart !== false;
      if (restart) {
        audio.currentTime = 0;
      }
      if (typeof options?.loop === "boolean") {
        audio.loop = options.loop;
      }
      if (typeof options?.volume === "number") {
        audio.volume = Math.max(0, Math.min(1, options.volume));
      }
      try {
        await audio.play();
        audioPlaybackEvents.push({
          id: key,
          source,
          ok: true,
          reason: "played",
        });
        return true;
      } catch {
        audioPlaybackEvents.push({
          id: key,
          source,
          ok: false,
          reason: "play_rejected",
        });
        return false;
      }
    },
    stopAudioById(id) {
      const key = String(id || "");
      const audio = audioById.get(key);
      if (!audio) {
        return false;
      }
      audio.pause();
      audio.currentTime = 0;
      return true;
    },
    getAudioPlaybackEvents() {
      return audioPlaybackEvents.slice();
    },
    getAudioPlaybackEventCount() {
      return audioPlaybackEvents.length;
    },
    getAudioBindings() {
      return Object.fromEntries(audioBindingsByEvent.entries());
    },
    setAudioBindings(bindings) {
      audioBindingsByEvent = normalizeAudioBindings(bindings, audioById);
      return bridge.getAudioBindings();
    },
    async triggerGameplayEventAudio(eventName, options = {}) {
      const eventKey = normalizeGameplayEventKey(eventName);
      if (!eventKey) {
        return { ok: false, event: "", audioId: null, reason: "missing_event" };
      }
      const audioId = resolveGameplayAudioId(eventKey, audioById, audioBindingsByEvent);
      if (!audioId) {
        return { ok: false, event: eventKey, audioId: null, reason: "missing_binding" };
      }
      const ok = await bridge.playAudioById(audioId, {
        ...options,
        source: `gameplay:${eventKey}`,
      });
      return {
        ok,
        event: eventKey,
        audioId,
        reason: ok ? "played" : "play_failed",
      };
    },
  };

  window.__exportPreview = bridge;
  if (Array.isArray(scenes) && scenes.length > 0) {
    bridge.renderSceneByName(scenes[0].name);
  }
  applyViewportScale(canvas);
  window.addEventListener("resize", () => applyViewportScale(canvas));
  window.addEventListener("keydown", (event) => {
    const target = event.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target?.isContentEditable
    ) {
      return;
    }
    const movement = movementFromKey(event);
    if (!movement) {
      return;
    }
    const moved = bridge.movePrimaryEntity(movement.dx, movement.dy);
    if (moved) {
      if (movementAudioId) {
        void bridge.playAudioById(movementAudioId, {
          restart: true,
          volume: 0.3,
          source: "movement",
        });
      }
      event.preventDefault();
    }
  });
}

bootExportRuntime().catch((error) => {
  console.error(error);
});
