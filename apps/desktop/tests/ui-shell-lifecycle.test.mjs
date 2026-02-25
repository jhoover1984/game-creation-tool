import test from "node:test";
import assert from "node:assert/strict";

import { createShellLifecycleController } from "../src/ui-shell-lifecycle.js";

function createMockWindow() {
  const listeners = new Map();
  const removed = [];
  return {
    listeners,
    removed,
    addEventListener(event, handler) {
      if (!listeners.has(event)) {
        listeners.set(event, []);
      }
      listeners.get(event).push(handler);
    },
    removeEventListener(event, handler) {
      removed.push({ event, handler });
      const current = listeners.get(event) || [];
      listeners.set(
        event,
        current.filter((entry) => entry !== handler)
      );
    },
  };
}

test("shell lifecycle forwards global runtime errors and unhandled rejections", () => {
  const originalWindow = globalThis.window;
  const mockWindow = createMockWindow();
  globalThis.window = mockWindow;

  try {
    const reports = [];
    let disposeCount = 0;
    const controller = createShellLifecycleController({
      state: {
        reportError(action, message) {
          reports.push({ action, message });
        },
      },
      disposeControllers() {
        disposeCount += 1;
      },
    });

    controller.installGlobalErrorBoundary();
    controller.bindBeforeUnload();

    assert.equal(mockWindow.listeners.get("error")?.length || 0, 1);
    assert.equal(mockWindow.listeners.get("unhandledrejection")?.length || 0, 1);
    assert.equal(mockWindow.listeners.get("beforeunload")?.length || 0, 1);

    const errorHandler = mockWindow.listeners.get("error")[0];
    errorHandler({ error: new Error("boom") });
    assert.deepEqual(reports[0], { action: "window:error", message: "boom" });

    let defaultPrevented = false;
    const rejectionHandler = mockWindow.listeners.get("unhandledrejection")[0];
    rejectionHandler({
      reason: new Error("async boom"),
      preventDefault() {
        defaultPrevented = true;
      },
    });
    assert.deepEqual(reports[1], {
      action: "window:unhandledrejection",
      message: "async boom",
    });
    assert.equal(defaultPrevented, true);

    const beforeUnloadHandler = mockWindow.listeners.get("beforeunload")[0];
    beforeUnloadHandler();
    assert.equal(disposeCount, 1);

    controller.dispose();
    assert.equal(mockWindow.removed.length >= 3, true);
  } finally {
    globalThis.window = originalWindow;
  }
});
