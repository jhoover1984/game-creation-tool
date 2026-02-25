// @ts-check
/**
 * WASM runtime loader for web playtest physics parity.
 *
 * Uses dynamic import() only — never static import of ./wasm/gcs_wasm.js.
 * This means module evaluation succeeds even when WASM artifacts are absent
 * (i.e. before `npm run build:wasm` has been run). All functions degrade
 * gracefully to no-ops when WASM is unavailable.
 *
 * Phase 1 scope: movement + physics + camera.
 * Script events, breakpoints, and scene transitions are Phase 2.
 */

/** @type {import('./wasm/gcs_wasm.js').WasmRuntime | null} */
let _runtime = null;

/** @type {Promise<void> | null} */
let _initPromise = null;

let _wasmUnavailable = false;

/**
 * Kick off WASM module initialization. Idempotent — safe to call multiple times.
 * Resolves when the WASM binary is compiled and ready, or when it fails
 * (in which case isWasmReady() returns false and all operations are no-ops).
 * @returns {Promise<void>}
 */
export function initWasm() {
  if (_initPromise) return _initPromise;
  _initPromise = import("./wasm/gcs_wasm.js")
    .then((/** @type {any} */ m) => m.default())
    .catch((/** @type {Error} */ err) => {
      console.warn(
        "[gcs-wasm] WASM unavailable, using JS stubs for playtest:",
        err.message,
      );
      _wasmUnavailable = true;
    });
  return _initPromise;
}

/**
 * Clear the unavailable flag and reset init state so the next
 * createWasmRuntime() call will retry. Useful when a developer runs
 * `npm run build:wasm` mid-session and re-enters playtest.
 */
export function retryWasm() {
  _wasmUnavailable = false;
  _initPromise = null;
}

/** @returns {boolean} True if the WASM runtime was constructed successfully. */
export function isWasmReady() {
  return _runtime !== null;
}

/**
 * Build the init payload that WasmRuntime::new() expects from the
 * current fallbackEditor state.
 *
 * Phase 1: entities named "player" (case-insensitive) receive movement +
 * collision defaults. All other entities are sent without components and
 * will not respond to input. This is logged at playtest entry.
 *
 * @param {object} editorState - the current fallbackEditor snapshot
 * @returns {object}
 */
function buildInitPayload(editorState) {
  const defaultedNames = /** @type {string[]} */ ([]);

  const entities = /** @type {Array<{x:number,y:number}>} */ (
    editorState.entities || []
  ).map((/** @type {any} */ e) => {
    const isPlayer =
      typeof e.name === "string" && e.name.toLowerCase() === "player";
    if (isPlayer) defaultedNames.push(e.name);
    const result = /** @type {any} */ ({
      id: e.id,
      name: e.name,
      x: e.position?.x ?? 0,
      y: e.position?.y ?? 0,
    });

    // Forward animation component if present.
    if (e.animation && e.animation.clips) {
      const clipEntries = Object.entries(e.animation.clips);
      if (clipEntries.length > 0) {
        result.animation = {
          clips: clipEntries.map(([name, clip]) => ({
            name,
            frames: clip.frames || [],
            frame_duration_ticks: clip.frame_duration_ticks || 1,
            loop_mode: clip.loop_mode || "loop",
          })),
          initial_clip: e.animation.state?.current_clip_name || clipEntries[0][0],
          transitions: (e.animation.transitions || []).map((/** @type {any} */ t) => ({
            from_state: t.from_state,
            to_state: t.to_state,
            condition: t.condition,
          })),
        };
      }
    }

    return result;
  });

  if (defaultedNames.length > 0) {
    console.info(
      "[gcs-wasm] Applied movement defaults to: " +
        defaultedNames.join(", ") +
        ". Other entities need a component system (Phase 2) to respond to input.",
    );
  } else {
    console.warn(
      '[gcs-wasm] No entity named "Player" found — key input will have no effect ' +
        "in web playtest. Rename an entity to \"Player\" to enable movement.",
    );
  }

  return {
    entities,
    tiles: (editorState.tiles || []).map((/** @type {any} */ t) => ({
      x: t.x,
      y: t.y,
      tile_id: t.tile_id,
    })),
    physics: editorState.physicsConfig ?? null,
  };
}

/**
 * Create a WasmRuntime seeded from the current editor state.
 * Clears any previous stale-failure state before attempting to load WASM
 * (so build:wasm + re-enter playtest works without a page reload).
 * @param {object} editorState - current fallbackEditor state
 * @returns {Promise<void>}
 */
export async function createWasmRuntime(editorState) {
  // Clear stale unavailable flag so a mid-session build:wasm takes effect.
  retryWasm();
  if (_wasmUnavailable) return;

  await initWasm();
  if (_wasmUnavailable) return;

  try {
    const { WasmRuntime } = /** @type {any} */ (
      await import("./wasm/gcs_wasm.js")
    );
    const payload = buildInitPayload(editorState);
    _runtime = new WasmRuntime(JSON.stringify(payload));
  } catch (err) {
    console.warn("[gcs-wasm] Failed to construct WasmRuntime:", err);
    _wasmUnavailable = true;
  }
}

/**
 * Free the WASM runtime allocation and clear the reference.
 * Safe to call even if no runtime was created.
 */
export function destroyWasmRuntime() {
  _runtime?.free?.();
  _runtime = null;
}

/**
 * Advance simulation by `deltaMs` milliseconds.
 * @param {number} deltaMs
 * @returns {object | null} Parsed WasmStateSnapshot or null if WASM unavailable.
 */
export function wasmTick(deltaMs) {
  if (!_runtime) return null;
  try {
    return JSON.parse(_runtime.tick(deltaMs));
  } catch {
    return null;
  }
}

/** @param {string} key - snake_case KeyCode name e.g. "arrow_up" */
export function wasmKeyDown(key) {
  _runtime?.key_down(key);
}

/** @param {string} key - snake_case KeyCode name */
export function wasmKeyUp(key) {
  _runtime?.key_up(key);
}

export function wasmEnterPlaytest() {
  _runtime?.enter_playtest();
}

export function wasmExitPlaytest() {
  _runtime?.exit_playtest();
}

/**
 * @param {number} gravity
 * @param {number} friction
 */
export function wasmSetPhysicsConfig(gravity, friction) {
  _runtime?.set_physics_config(gravity, friction);
}

/** @param {string} mode - "follow" | "fixed" | "lerp" | "screen_lock" */
export function wasmSetCameraMode(mode) {
  _runtime?.set_camera_mode(mode);
}
