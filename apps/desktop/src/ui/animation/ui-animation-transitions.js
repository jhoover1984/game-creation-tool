/**
 * @typedef {import("../../types.js").EditorSnapshot} EditorSnapshot
 */

/**
 * @typedef {{
 *   animationTransitionList: HTMLElement | null,
 *   animationTransitionAddBtn: HTMLElement | null,
 *   animationTransitionSaveBtn: HTMLElement | null,
 *   animationTransitionFromInput: HTMLInputElement | null,
 *   animationTransitionToInput: HTMLInputElement | null,
 *   animationTransitionKindSelect: HTMLSelectElement | null,
 *   animationTransitionStatus: HTMLElement | null,
 * }} AnimationTransitionElements
 */

/**
 * @param {{
 *   elements: AnimationTransitionElements,
 *   state: {
 *     snapshot: () => EditorSnapshot,
 *     buildAnimationTransitionDraft?: (seed?: { from_state?: string, to_state?: string, kind?: string }) => { from_state: string, to_state: string, condition: object },
 *     finalizeAnimationTransitionDraft?: (draft: { from_state: string, to_state: string, condition: object }) => { from_state: string, to_state: string, condition: object },
 *     setSelectedEntityAnimationTransitions?: (transitions: Array<{ from_state: string, to_state: string, condition: object }>) => Promise<unknown>,
 *     events?: { on: (event: string, handler: (snapshot: EditorSnapshot) => void) => () => void }
 *   },
 *   render?: () => void,
 *   log?: (message: string) => void,
 * }} deps
 */
export function createAnimationTransitionsController({ elements, state, render, log }) {
  /** @type {Array<{ from_state: string, to_state: string, condition: object }>} */
  let drafts = [];
  /** @type {Array<() => void>} */
  const disposers = [];

  function setStatus(message) {
    if (elements.animationTransitionStatus) {
      elements.animationTransitionStatus.textContent = message;
    }
    if (log && message) {
      log(`[animation] ${message}`);
    }
  }

  function kindOf(rule) {
    return rule?.condition?.kind || "unknown";
  }

  function renderDrafts() {
    const list = elements.animationTransitionList;
    if (!list) return;
    if (drafts.length === 0) {
      list.textContent = "No transitions. Add one to define animation state flow.";
      return;
    }
    list.textContent = drafts
      .map((rule, index) => `${index + 1}. ${rule.from_state} -> ${rule.to_state} (${kindOf(rule)})`)
      .join("\n");
  }

  /**
   * @param {EditorSnapshot} snapshot
   */
  function syncFromSnapshot(snapshot) {
    const selectedId = snapshot.selection?.length === 1 ? snapshot.selection[0] : null;
    if (!selectedId) {
      drafts = [];
      renderDrafts();
      return;
    }
    const entity = snapshot.entities?.find((entry) => entry.id === selectedId);
    const transitions = entity?.animation?.transitions;
    if (!Array.isArray(transitions)) {
      drafts = [];
      renderDrafts();
      return;
    }
    drafts = transitions.map((rule) => JSON.parse(JSON.stringify(rule)));
    renderDrafts();
  }

  function addDraftFromForm() {
    const fromState = (elements.animationTransitionFromInput?.value || "").trim();
    const toState = (elements.animationTransitionToInput?.value || "").trim();
    const kind = (elements.animationTransitionKindSelect?.value || "flag_set").trim();
    if (!fromState || !toState) {
      setStatus("From/To state are required.");
      return;
    }
    const builder = state.buildAnimationTransitionDraft;
    if (typeof builder !== "function") {
      setStatus("Animation transition builder unavailable.");
      return;
    }
    drafts.push(builder({ from_state: fromState, to_state: toState, kind }));
    renderDrafts();
    setStatus("Transition draft added.");
    if (render) render();
  }

  async function saveDrafts() {
    if (typeof state.setSelectedEntityAnimationTransitions !== "function") {
      setStatus("Animation transitions action unavailable.");
      return;
    }
    if (typeof state.finalizeAnimationTransitionDraft !== "function") {
      setStatus("Animation transition finalizer unavailable.");
      return;
    }
    try {
      const normalized = drafts.map((rule) => state.finalizeAnimationTransitionDraft(rule));
      await state.setSelectedEntityAnimationTransitions(normalized);
      setStatus("Transitions saved.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Save failed: ${message}`);
    }
  }

  function bindEvents() {
    if (elements.animationTransitionAddBtn) {
      const onAdd = () => addDraftFromForm();
      elements.animationTransitionAddBtn.addEventListener("click", onAdd);
      disposers.push(() => elements.animationTransitionAddBtn?.removeEventListener("click", onAdd));
    }
    if (elements.animationTransitionSaveBtn) {
      const onSave = () => {
        void saveDrafts();
      };
      elements.animationTransitionSaveBtn.addEventListener("click", onSave);
      disposers.push(() => elements.animationTransitionSaveBtn?.removeEventListener("click", onSave));
    }
    if (state.events) {
      disposers.push(state.events.on("editor:state-updated", (snapshot) => syncFromSnapshot(snapshot)));
    }
    syncFromSnapshot(state.snapshot());
  }

  function dispose() {
    disposers.forEach((disposeFn) => disposeFn());
    disposers.length = 0;
  }

  return {
    bindEvents,
    dispose,
    syncFromSnapshot,
    renderDrafts,
  };
}
