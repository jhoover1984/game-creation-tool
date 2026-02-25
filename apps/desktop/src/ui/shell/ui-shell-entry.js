/**
 * @typedef {{
 *   getIsWorkspaceInitialized: () => boolean,
 *   hasModuleBundlePromise: () => boolean,
 *   initializeWorkspace: () => Promise<void>,
 *   preloadModuleBundle: (source: string) => Promise<unknown>,
 *   markWorkspaceEntered: () => void,
 *   markPreloadScheduled: () => void,
 *   reportError: (action: string, message: string) => void,
 *   render: () => void,
 *   requestIdleCallback?: ((callback: (deadline?: unknown) => void, options?: { timeout?: number }) => unknown) | null,
 *   scheduleTimeout?: ((callback: () => void, delayMs: number) => unknown) | null
 * }} ShellEntryControllerDeps
 */

/**
 * @param {string} nextMode
 * @returns {"launch_dashboard" | "editor_workspace"}
 */
export function normalizeEntryMode(nextMode) {
  return nextMode === "editor_workspace" ? "editor_workspace" : "launch_dashboard";
}

/**
 * @param {ShellEntryControllerDeps} deps
 */
export function createShellEntryController({
  getIsWorkspaceInitialized,
  hasModuleBundlePromise,
  initializeWorkspace,
  preloadModuleBundle,
  markWorkspaceEntered,
  markPreloadScheduled,
  reportError,
  render,
  requestIdleCallback = null,
  scheduleTimeout = null,
}) {
  /** @type {"launch_dashboard" | "editor_workspace"} */
  let entryMode = "launch_dashboard";
  /** @type {Promise<void> | null} */
  let workspaceInitPromise = null;
  let preloadScheduled = false;

  const idleCallback =
    requestIdleCallback ||
    (typeof window !== "undefined" && typeof window.requestIdleCallback === "function"
      ? window.requestIdleCallback.bind(window)
      : null);
  const timeoutScheduler =
    scheduleTimeout ||
    (typeof globalThis.setTimeout === "function" ? globalThis.setTimeout.bind(globalThis) : null);

  function getEntryMode() {
    return entryMode;
  }

  function ensureWorkspaceInitialization() {
    if (getIsWorkspaceInitialized()) {
      return Promise.resolve();
    }
    if (workspaceInitPromise) {
      return workspaceInitPromise;
    }
    workspaceInitPromise = initializeWorkspace()
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        reportError("editor_workspace_init", message);
        throw error;
      })
      .finally(() => {
        workspaceInitPromise = null;
      });
    return workspaceInitPromise;
  }

  function setEntryMode(nextMode) {
    const normalized = normalizeEntryMode(nextMode);
    if (entryMode === normalized) {
      return;
    }

    if (normalized === "editor_workspace") {
      if (getIsWorkspaceInitialized()) {
        entryMode = normalized;
        markWorkspaceEntered();
        render();
        return;
      }
      ensureWorkspaceInitialization()
        .then(() => {
          entryMode = normalized;
          markWorkspaceEntered();
          render();
        })
        .catch(() => {
          // surfaced via app:error boundary
        });
      return;
    }

    entryMode = normalized;
    render();
  }

  function scheduleModulePreload() {
    if (
      preloadScheduled ||
      getIsWorkspaceInitialized() ||
      workspaceInitPromise ||
      hasModuleBundlePromise()
    ) {
      return;
    }
    preloadScheduled = true;
    markPreloadScheduled();

    const preload = () => {
      preloadModuleBundle("idle_preload").catch(() => {
        // Preload remains best-effort and non-blocking.
      });
    };

    if (idleCallback) {
      idleCallback(preload, { timeout: 1200 });
      return;
    }
    timeoutScheduler?.(preload, 200);
  }

  function dispose() {
    workspaceInitPromise = null;
  }

  return {
    dispose,
    ensureWorkspaceInitialization,
    getEntryMode,
    setEntryMode,
    scheduleModulePreload,
  };
}


