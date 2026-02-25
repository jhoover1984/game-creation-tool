import { applyBreakpointToggle } from "../../ui-breakpoints.js";

/**
 * @typedef {import("../../types.js").EditorSnapshot} EditorSnapshot
 */

/**
 * @param {{
 *   state: {
 *     snapshot: () => EditorSnapshot,
 *     enterPlaytest: () => Promise<unknown>,
 *     exitPlaytest: () => Promise<unknown>
 *   },
 *   render: () => void,
 *   log: (message: string) => void,
 *   breakpointToggler?: (deps: { state: unknown, render: () => void, log: (message: string) => void }, kind: string) => void
 * }} deps
 */
export function createShellRuntimeController({
  state,
  render,
  log,
  breakpointToggler = applyBreakpointToggle,
}) {
  async function togglePlaytest() {
    const snapshot = state.snapshot();
    if (snapshot.playtest.active) {
      await state.exitPlaytest();
      return;
    }
    await state.enterPlaytest();
  }

  /**
   * @param {string} kind
   */
  function toggleBreakpoint(kind) {
    breakpointToggler({ state, render, log }, kind);
  }

  /**
   * @param {Array<{ dispose?: () => void } | null | undefined>} controllers
   */
  function disposeControllers(controllers) {
    controllers.forEach((controller) => controller?.dispose?.());
  }

  return {
    disposeControllers,
    toggleBreakpoint,
    togglePlaytest,
  };
}


