export function createCommandBarController({
  elements,
  state,
  render,
  log,
  togglePlaytest,
  getNewProjectTemplate,
  applyStarterScriptForTemplate,
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

    (elements.commandButtons || []).forEach((button) => {
      addListener(button, "click", async () => {
        const command = button.getAttribute("data-command");
        log(`Command: ${command}`);

        if (command === "open") {
          await state.open(".");
          requestRender();
          return;
        }
        if (command === "save") {
          await state.save();
          requestRender();
          return;
        }
        if (command === "play") {
          await togglePlaytest();
          requestRender();
          return;
        }
        if (command === "new") {
          const template = getNewProjectTemplate();
          await state.newProjectFromTemplate(template);
          await applyStarterScriptForTemplate(template);
          requestRender();
        }
      });
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
