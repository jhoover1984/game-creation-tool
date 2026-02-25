/**
 * @typedef {import("./types.js").EditorSnapshot} EditorSnapshot
 */

/**
 * @typedef {{
 *   issuesList: HTMLElement | null,
 *   entityList: HTMLElement | null,
 *   inspectorNameInput: HTMLInputElement | null
 * }} WorkspaceBindingElements
 */

/**
 * @param {EditorSnapshot} snapshot
 * @param {number} id
 * @param {boolean} additive
 * @returns {number[]}
 */
export function buildEntitySelectionFromClick(snapshot, id, additive) {
  if (!additive) {
    return [id];
  }
  const existing = Array.isArray(snapshot.selection) ? snapshot.selection : [];
  return Array.from(new Set([...existing, id]));
}

/**
 * @param {string} value
 * @returns {string}
 */
export function normalizeProjectNameInput(value) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || "Untitled Project";
}

/**
 * @param {{
 *   elements: WorkspaceBindingElements,
 *   state: {
 *     snapshot: () => EditorSnapshot,
 *     selectEntities: (next: number[]) => Promise<unknown>,
 *     setProjectName: (name: string) => void
 *   },
 *   render: () => void,
 *   getIssuesRecoveryController: () => { runIssueRecoveryAction?: (action: string) => Promise<unknown> } | null,
 *   getScriptLabController: () => { applyIssueAutoFix?: (code: string, nodeId: string | null) => Promise<unknown> } | null
 * }} deps
 */
export function createWorkspaceBindingsController({
  elements,
  state,
  render,
  getIssuesRecoveryController,
  getScriptLabController,
}) {
  const listeners = [];
  let eventsBound = false;

  function addListener(target, event, handler) {
    if (!target) {
      return;
    }
    target.addEventListener(event, handler);
    listeners.push(() => target.removeEventListener(event, handler));
  }

  function bindEvents() {
    if (eventsBound) {
      return;
    }
    eventsBound = true;

    addListener(elements.issuesList, "click", async (event) => {
      const rawTarget = event.target;
      const target =
        rawTarget instanceof HTMLElement
          ? rawTarget
          : rawTarget instanceof globalThis.Node
            ? rawTarget.parentElement
            : null;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const issueActionTarget = target.closest("[data-issue-action]");
      const issueAction = issueActionTarget?.getAttribute("data-issue-action");
      if (issueAction) {
        await getIssuesRecoveryController()?.runIssueRecoveryAction?.(issueAction);
        return;
      }
      const scriptFixTarget = target.closest("[data-script-fix-code]");
      const code = scriptFixTarget?.getAttribute("data-script-fix-code");
      const nodeId = scriptFixTarget?.getAttribute("data-script-fix-node-id");
      if (!code) {
        return;
      }
      await getScriptLabController()?.applyIssueAutoFix?.(code, nodeId || null);
    });

    addListener(elements.entityList, "click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const idRaw = target.getAttribute("data-entity-id");
      if (!idRaw) {
        return;
      }
      const id = Number.parseInt(idRaw, 10);
      if (Number.isNaN(id)) {
        return;
      }
      const snapshot = state.snapshot();
      const additive = event.ctrlKey || event.metaKey;
      const next = buildEntitySelectionFromClick(snapshot, id, additive);
      await state.selectEntities(next);
      render();
    });

    addListener(elements.inspectorNameInput, "change", () => {
      state.setProjectName(normalizeProjectNameInput(elements.inspectorNameInput?.value));
      render();
    });
  }

  function dispose() {
    listeners.forEach((unsubscribe) => unsubscribe());
    listeners.length = 0;
    eventsBound = false;
  }

  return {
    bindEvents,
    dispose,
  };
}
