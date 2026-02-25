/** @type {Record<string, string>} */
const BROWSER_KEY_TO_GAME_KEY = {
  ArrowUp: "arrow_up",
  ArrowDown: "arrow_down",
  ArrowLeft: "arrow_left",
  ArrowRight: "arrow_right",
  z: "key_z",
  Z: "key_z",
  x: "key_x",
  X: "key_x",
  Enter: "enter",
  Shift: "shift_left",
  w: "key_w",
  W: "key_w",
  a: "key_a",
  A: "key_a",
  s: "key_s",
  S: "key_s",
  d: "key_d",
  D: "key_d",
  " ": "space",
};

/**
 * Maps a browser KeyboardEvent.key to the backend KeyCode snake_case string.
 * Returns null if the key is not a game input key.
 * @param {string} browserKey
 * @returns {string | null}
 */
function mapKeyToGameInput(browserKey) {
  return BROWSER_KEY_TO_GAME_KEY[browserKey] ?? null;
}

export function createEditorInputController({
  elements,
  state,
  mapInteractionController,
  render,
  togglePlaytest,
}) {
  let eventsBound = false;
  const listeners = [];

  function requestRender() {
    if (typeof render === "function") {
      render();
    }
  }

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

    addListener(elements.commandButtons?.create, "click", async () => {
      await state.addEntity();
      requestRender();
    });

    addListener(document.getElementById("empty-state-add-entity"), "click", async () => {
      await state.addEntity();
      requestRender();
    });

    addListener(document.getElementById("empty-state-paint-tile"), "click", () => {
      mapInteractionController.setTool("paint");
    });

    addListener(elements.commandButtons?.move, "click", async () => {
      await state.moveSelectedBy(4, 0);
      requestRender();
    });

    addListener(elements.commandButtons?.delete, "click", async () => {
      await state.deleteSelected();
      requestRender();
    });

    addListener(elements.commandButtons?.undo, "click", async () => {
      await state.undo();
      requestRender();
    });

    addListener(elements.commandButtons?.redo, "click", async () => {
      await state.redo();
      requestRender();
    });

    addListener(elements.commandButtons?.reselect, "click", async () => {
      await state.reselectPrevious();
      requestRender();
    });

    addListener(elements.toolButtons?.select, "click", () => {
      mapInteractionController.setTool("select");
    });
    addListener(elements.toolButtons?.paint, "click", () => {
      mapInteractionController.setTool("paint");
    });
    addListener(elements.toolButtons?.erase, "click", () => {
      mapInteractionController.setTool("erase");
    });
    addListener(elements.toolButtons?.fill, "click", () => {
      mapInteractionController.setTool("fill");
    });

    addListener(document, "keydown", async (event) => {
      if (event.key === "F5") {
        event.preventDefault();
        await togglePlaytest();
        requestRender();
        return;
      }

      if (event.key === "Escape" && state.snapshot().playtest.active) {
        event.preventDefault();
        await state.exitPlaytest();
        requestRender();
        return;
      }

      // During playtest, forward game input keys to backend instead of editor shortcuts
      if (state.snapshot().playtest.active && !event.ctrlKey && !event.metaKey) {
        const gameKey = mapKeyToGameInput(event.key);
        if (gameKey) {
          event.preventDefault();
          await state.playtestKeyDown(gameKey);
          return;
        }
      }

      if (!event.ctrlKey && !event.metaKey && !event.altKey) {
        const toolKey = event.key.toLowerCase();
        if (toolKey === "v") {
          mapInteractionController.setTool("select");
          return;
        }
        if (toolKey === "b") {
          mapInteractionController.setTool("paint");
          return;
        }
        if (toolKey === "e") {
          mapInteractionController.setTool("erase");
          return;
        }
        if (toolKey === "g") {
          mapInteractionController.setTool("fill");
          return;
        }
        if (toolKey === "a") {
          event.preventDefault();
          await state.addEntity();
          requestRender();
          return;
        }
      }

      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        state.snapshot().selection.length > 0
      ) {
        const target = event.target;
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
          return;
        }
        event.preventDefault();
        await state.deleteSelected();
        requestRender();
        return;
      }

      const isMod = event.ctrlKey || event.metaKey;
      if (!isMod) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        await state.undo();
        requestRender();
        return;
      }

      if (key === "y" || (key === "z" && event.shiftKey)) {
        event.preventDefault();
        await state.redo();
        requestRender();
        return;
      }

      if (key === "z" && event.altKey) {
        event.preventDefault();
        await state.reselectPrevious();
        requestRender();
      }
    });

    addListener(document, "keyup", async (event) => {
      if (state.snapshot().playtest.active && !event.ctrlKey && !event.metaKey) {
        const gameKey = mapKeyToGameInput(event.key);
        if (gameKey) {
          event.preventDefault();
          await state.playtestKeyUp(gameKey);
        }
      }
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
