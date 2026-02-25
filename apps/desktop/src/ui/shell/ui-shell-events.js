/** @typedef {import("../../types.js").EditorSnapshot} EditorSnapshot */
import { showToast } from "../../ui-toast.js";

/**
 * Event bus payloads are snapshot-shaped and may carry event-specific metadata.
 * @typedef {EditorSnapshot & {
 *   primitiveKind?: string,
 *   primitiveProfile?: string,
 *   removedCount?: number
 * }} ShellEventPayload
 */

/**
 * @typedef {{
 *   on: (event: string, handler: (payload: ShellEventPayload) => void) => () => void
 * }} EventBusPort
 */

/**
 * @typedef {{
 *   events: EventBusPort
 * }} EventStatePort
 */

/**
 * @typedef {{
 *   state: EventStatePort,
 *   log: (message: string) => void,
 *   render: () => void,
 *   getOnboardingController: () => {
 *     onProjectNew?: () => void,
 *     onProjectSaved?: () => void,
 *     onPlaytestChanged?: (snapshot: EditorSnapshot) => void
 *   } | null,
 *   getPlaytestController: () => {
 *     syncPlaytestLoop?: (snapshot: EditorSnapshot) => void
 *   } | null
 * }} ShellEventsControllerDeps
 */

/**
 * @param {ShellEventsControllerDeps} deps
 */
export function createShellEventsController({
  state,
  log,
  render,
  getOnboardingController,
  getPlaytestController,
}) {
  /** @type {Array<() => void>} */
  const unsubscribers = [];
  let eventsBound = false;
  let lastPlaytestStatusKey = "";
  let lastBreakpointSeq = 0;

  /**
   * @param {ShellEventPayload} snapshot
   * @param {{ mode?: string } | null} report
   * @returns {string}
   */
  function describeExportLane(snapshot, report) {
    if (!report || report.mode === "fallback" || snapshot.runtimeMode === "web") {
      return "web fallback lane";
    }
    return "desktop authored lane";
  }

  function bindEvents() {
    if (eventsBound) {
      return;
    }
    eventsBound = true;

    unsubscribers.push(
      state.events.on("project:opened", (snapshot) =>
        log(`Project opened: ${snapshot.projectName}`)
      )
    );
    unsubscribers.push(
      state.events.on("project:new", (snapshot) => {
        getOnboardingController()?.onProjectNew?.();
        log(`New starter project: ${snapshot.projectName}`);
      })
    );
    unsubscribers.push(
      state.events.on("project:saved", (snapshot) => {
        getOnboardingController()?.onProjectSaved?.();
        log(`Project saved: ${snapshot.projectName}`);
        showToast(`Saved — ${snapshot.projectName || "project"}`, "success");
      })
    );
    unsubscribers.push(
      state.events.on("project:export-preview", (snapshot) => {
        const report = snapshot.exportPreviewReport;
        if (!report) {
          return;
        }
        const lane = describeExportLane(snapshot, report);
        log(
          `Export preview generated (${report.profile}, ${report.mode}, ${lane}) at ${report.output_dir || "output path"}`
        );
        showToast("Export ready", "success");
      })
    );
    unsubscribers.push(
      state.events.on("project:health-updated", () => log("Project health refreshed."))
    );
    unsubscribers.push(
      state.events.on("editor:state-updated", (snapshot) => {
        log(`Editor state updated (${snapshot.entities.length} entities).`);
      })
    );
    unsubscribers.push(
      state.events.on("playtest:changed", (snapshot) => {
        getOnboardingController()?.onPlaytestChanged?.(snapshot);

        const statusKey = `${snapshot.playtest.active}:${snapshot.playtest.paused}:${snapshot.playtest.speed}`;
        if (statusKey !== lastPlaytestStatusKey) {
          if (snapshot.playtest.active && !lastPlaytestStatusKey.startsWith("true")) {
            showToast("Playtest started — press F5 or Esc to exit", "info");
          }
          log(
            snapshot.playtest.active
              ? `Playtest ${snapshot.playtest.paused ? "paused" : "running"} @ ${snapshot.playtest.speed}x`
              : "Playtest exited."
          );
          lastPlaytestStatusKey = statusKey;
        }
        const hit = snapshot.lastBreakpointHit;
        if (hit && hit.seq !== lastBreakpointSeq) {
          log(`Breakpoint hit: ${hit.kind} @ frame ${hit.frame}`);
          lastBreakpointSeq = hit.seq;
        }
        getPlaytestController()?.syncPlaytestLoop?.(snapshot);
      })
    );
    unsubscribers.push(
      state.events.on("diagnostics:changed", (snapshot) => {
        const toggles = snapshot.diagnostics;
        log(
          `Diagnostics: grid=${toggles.grid ? "on" : "off"} collision=${toggles.collision ? "on" : "off"} ids=${toggles.ids ? "on" : "off"} trace=${toggles.trace ? "on" : "off"}`
        );
      })
    );
    unsubscribers.push(
      state.events.on("assisted:generated", (snapshot) => {
        const primitiveKind = snapshot.primitiveKind || "primitive";
        const primitiveProfile = snapshot.primitiveProfile || "game_boy";
        log(`Assisted content generated: ${primitiveKind} (${primitiveProfile})`);
      })
    );
    unsubscribers.push(
      state.events.on("assisted:cleanup", (snapshot) => {
        const primitiveProfile = snapshot.primitiveProfile || "game_boy";
        const removedCount = Number(snapshot.removedCount || 0);
        log(`Assisted cleanup: removed ${removedCount} generated prop(s) for ${primitiveProfile}.`);
      })
    );
    unsubscribers.push(
      state.events.on("app:error", (snapshot) => {
        const info = snapshot.lastError;
        if (!info) {
          return;
        }
        log(`Error (${info.action}): ${info.message}`);
        showToast(info.message, "error");
        render();
      })
    );
    unsubscribers.push(
      state.events.on("script:validated", (snapshot) => {
        const parseError = snapshot.scriptValidation?.parseError;
        const issueCount = snapshot.scriptValidation?.errors?.length || 0;
        if (parseError) {
          log(`Script validation failed: ${parseError}`);
          return;
        }
        log(`Script validation completed (${issueCount} issue${issueCount === 1 ? "" : "s"}).`);
      })
    );
  }

  function dispose() {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
    unsubscribers.length = 0;
    eventsBound = false;
    lastPlaytestStatusKey = "";
    lastBreakpointSeq = 0;
  }

  return {
    bindEvents,
    dispose,
  };
}


