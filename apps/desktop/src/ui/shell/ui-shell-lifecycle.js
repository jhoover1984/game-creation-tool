/**
 * @typedef {{
 *   reportError: (action: string, message: string) => void
 * }} LifecycleStatePort
 */

/**
 * @typedef {{
 *   state: LifecycleStatePort,
 *   disposeControllers: () => void
 * }} ShellLifecycleControllerDeps
 */

/**
 * Handles shell-wide lifecycle wiring that should stay outside feature modules:
 * - global runtime error boundaries
 * - before-unload teardown
 *
 * @param {ShellLifecycleControllerDeps} deps
 */
export function createShellLifecycleController({ state, disposeControllers }) {
  /** @type {Array<() => void>} */
  const listeners = [];

  function addWindowListener(event, handler) {
    if (typeof window === "undefined") {
      return;
    }
    window.addEventListener(event, handler);
    listeners.push(() => window.removeEventListener(event, handler));
  }

  function installGlobalErrorBoundary() {
    if (typeof window === "undefined") {
      return;
    }
    const lifecycleWindow = /** @type {Window & { __gcsGlobalErrorBoundaryInstalled?: boolean }} */ (
      window
    );
    if (lifecycleWindow.__gcsGlobalErrorBoundaryInstalled) {
      return;
    }
    lifecycleWindow.__gcsGlobalErrorBoundaryInstalled = true;

    addWindowListener("error", (event) => {
      const details = event?.error instanceof Error ? event.error.message : event?.message;
      const message = details || "Unhandled runtime error";
      state.reportError("window:error", message);
    });

    addWindowListener("unhandledrejection", (event) => {
      const reason = event?.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : reason
            ? String(reason)
            : "Unhandled promise rejection";
      state.reportError("window:unhandledrejection", message);
      event.preventDefault?.();
    });
  }

  function bindBeforeUnload() {
    addWindowListener("beforeunload", () => {
      disposeControllers();
    });
  }

  function dispose() {
    listeners.forEach((unsubscribe) => unsubscribe());
    listeners.length = 0;
  }

  return {
    bindBeforeUnload,
    dispose,
    installGlobalErrorBoundary,
  };
}


