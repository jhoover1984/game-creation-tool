/**
 * @typedef {(...args: any[]) => any} AnyFactory
 */

/**
 * @typedef {[
 *   { createWalkthroughController: AnyFactory },
 *   { createDrawSeedController: AnyFactory },
 *   { createPlaytestController: AnyFactory },
 *   { createMapInteractionController: AnyFactory },
 *   { createHelpTourController: AnyFactory },
 *   { createOnboardingController: AnyFactory },
 *   { createDebugPanelsController: AnyFactory },
 *   { createScriptTemplatesController: AnyFactory },
 *   { createScriptLabController: AnyFactory },
 *   { createPreferencesController: AnyFactory },
 *   { createCommandBarController: AnyFactory },
 *   { createEditorInputController: AnyFactory },
 *   { createMapViewportController: AnyFactory },
 *   { createDrawAssistControlsController: AnyFactory },
 *   { createLayoutPanelsController: AnyFactory },
 *   { createCanvasRendererController: AnyFactory },
 *   { createFlipbookStudioController: AnyFactory },
 *   { createAnimationTransitionsController: AnyFactory },
 *   { createIssuesRecoveryController: AnyFactory }
 * ]} WorkspaceEditorModuleBundle
 */

/**
 * @returns {Promise<WorkspaceEditorModuleBundle>}
 */
export function loadDefaultEditorModules() {
  return /** @type {Promise<WorkspaceEditorModuleBundle>} */ (
    Promise.all([
    import("../../ui-walkthrough.js"),
    import("../../ui-draw-seed.js"),
    import("../../ui-playtest.js"),
    import("../../ui-map-interaction.js"),
    import("../../ui-help-tour.js"),
    import("../../ui-onboarding.js"),
    import("../../ui-debug-panels.js"),
    import("../../ui-script-templates.js"),
    import("../../ui-script-lab.js"),
    import("../../ui-preferences.js"),
    import("../../ui-command-bar.js"),
    import("../../ui-editor-input.js"),
    import("../../ui-map-viewport.js"),
    import("../../ui-draw-assist-controls.js"),
    import("../../ui-layout-panels.js"),
    import("../../ui-canvas-renderer.js"),
    import("../../ui-flipbook-studio.js"),
    import("../../ui-animation-transitions.js"),
    import("../../ui-issues-recovery.js"),
    ])
  );
}

/**
 * @param {{
 *   markPreloadSource: (source: string) => void,
 *   markPreloadResolved: () => void,
 *   loadModules?: () => Promise<WorkspaceEditorModuleBundle>
 * }} deps
 */
export function createEditorModuleBundleLoader({
  markPreloadSource,
  markPreloadResolved,
  loadModules = loadDefaultEditorModules,
}) {
  let moduleBundlePromise = null;

  /**
   * @param {string} source
   * @returns {Promise<WorkspaceEditorModuleBundle>}
   */
  function loadEditorModuleBundle(source = "init_on_demand") {
    if (!moduleBundlePromise) {
      markPreloadSource(source);
      moduleBundlePromise = loadModules()
        .then((modules) => {
          markPreloadResolved();
          return modules;
        })
        .catch((error) => {
          // Allow retry after transient dynamic-import failures.
          moduleBundlePromise = null;
          throw error;
        });
    }
    return moduleBundlePromise;
  }

  function hasModuleBundlePromise() {
    return Boolean(moduleBundlePromise);
  }

  return {
    hasModuleBundlePromise,
    loadEditorModuleBundle,
  };
}


