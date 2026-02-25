import assert from "node:assert/strict";
import test from "node:test";

import { createPreferencesController } from "../src/ui-preferences.js";

function createSelect(initialValue = "") {
  const listeners = new Map();
  return {
    value: initialValue,
    addEventListener(event, handler) {
      const handlers = listeners.get(event) || new Set();
      handlers.add(handler);
      listeners.set(event, handlers);
    },
    removeEventListener(event, handler) {
      const handlers = listeners.get(event);
      if (!handlers) {
        return;
      }
      handlers.delete(handler);
      if (handlers.size === 0) {
        listeners.delete(event);
      }
    },
    dispatch(event) {
      const handlers = listeners.get(event);
      if (!handlers) {
        return;
      }
      for (const handler of handlers) {
        handler({ type: event });
      }
    },
  };
}

function installDomEnvironment({ initialStorage = {}, setItemError = null } = {}) {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const store = new Map(Object.entries(initialStorage));
  const bodyAttributes = new Map();

  globalThis.window = {
    localStorage: {
      getItem(key) {
        return store.has(key) ? store.get(key) : null;
      },
      setItem(key, value) {
        if (setItemError) {
          throw setItemError;
        }
        store.set(key, String(value));
      },
    },
  };

  globalThis.document = {
    body: {
      setAttribute(name, value) {
        bodyAttributes.set(name, String(value));
      },
      getAttribute(name) {
        return bodyAttributes.get(name) || null;
      },
    },
  };

  return {
    store,
    bodyAttributes,
    cleanup() {
      globalThis.window = originalWindow;
      globalThis.document = originalDocument;
    },
  };
}

test("preferences controller applies stored ui profile, theme, and density", () => {
  const env = installDomEnvironment({
    initialStorage: {
      "gcs.ui_profile.v1": "beginner",
      "gcs.theme.v1": "light",
      "gcs.density.v1": "compact",
    },
  });
  const uiProfileSelect = createSelect("builder");
  const themeSelect = createSelect("dark");
  const densitySelect = createSelect("comfortable");

  const controller = createPreferencesController({
    elements: { uiProfileSelect, themeSelect, densitySelect },
    render: () => {},
    log: () => {},
  });

  controller.applyPreferences();

  assert.equal(env.bodyAttributes.get("data-ui-profile"), "beginner");
  assert.equal(env.bodyAttributes.get("data-theme"), "light");
  assert.equal(env.bodyAttributes.get("data-density"), "compact");
  assert.equal(uiProfileSelect.value, "beginner");
  assert.equal(themeSelect.value, "light");
  assert.equal(densitySelect.value, "compact");

  controller.dispose();
  env.cleanup();
});

test("preferences controller persists updated values and can unbind listeners", () => {
  const env = installDomEnvironment();
  const uiProfileSelect = createSelect("builder");
  const themeSelect = createSelect("dark");
  const densitySelect = createSelect("comfortable");
  let renderCount = 0;

  const controller = createPreferencesController({
    elements: { uiProfileSelect, themeSelect, densitySelect },
    render: () => {
      renderCount += 1;
    },
    log: () => {},
  });
  controller.bindEvents();

  uiProfileSelect.value = "beginner";
  uiProfileSelect.dispatch("change");
  themeSelect.value = "light";
  themeSelect.dispatch("change");
  densitySelect.value = "compact";
  densitySelect.dispatch("change");

  assert.equal(renderCount, 3);
  assert.equal(env.store.get("gcs.ui_profile.v1"), "beginner");
  assert.equal(env.store.get("gcs.theme.v1"), "light");
  assert.equal(env.store.get("gcs.density.v1"), "compact");

  controller.applyPreferences();
  assert.equal(env.bodyAttributes.get("data-ui-profile"), "beginner");
  assert.equal(env.bodyAttributes.get("data-theme"), "light");
  assert.equal(env.bodyAttributes.get("data-density"), "compact");

  controller.dispose();
  themeSelect.value = "dark_high_contrast";
  themeSelect.dispatch("change");
  assert.equal(renderCount, 3);

  env.cleanup();
});

test("preferences controller logs and continues when local storage quota is exceeded", () => {
  const env = installDomEnvironment({
    setItemError: { name: "QuotaExceededError" },
  });
  const uiProfileSelect = createSelect("builder");
  const themeSelect = createSelect("dark");
  const densitySelect = createSelect("comfortable");
  const logs = [];

  const controller = createPreferencesController({
    elements: { uiProfileSelect, themeSelect, densitySelect },
    render: () => {},
    log: (message) => logs.push(message),
  });
  controller.bindEvents();

  themeSelect.value = "light";
  themeSelect.dispatch("change");

  assert.equal(logs.some((line) => line.includes("storage quota exceeded")), true);

  controller.dispose();
  env.cleanup();
});
