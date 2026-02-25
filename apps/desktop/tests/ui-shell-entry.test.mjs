import test from "node:test";
import assert from "node:assert/strict";

import { createShellEntryController, normalizeEntryMode } from "../src/ui-shell-entry.js";

test("normalizeEntryMode maps unknown values to launch_dashboard", () => {
  assert.equal(normalizeEntryMode("editor_workspace"), "editor_workspace");
  assert.equal(normalizeEntryMode("anything_else"), "launch_dashboard");
});

test("shell entry controller enters workspace immediately when already initialized", async () => {
  let renderCount = 0;
  let workspaceEnteredCount = 0;
  let initializeCount = 0;

  const controller = createShellEntryController({
    getIsWorkspaceInitialized: () => true,
    hasModuleBundlePromise: () => false,
    initializeWorkspace: async () => {
      initializeCount += 1;
    },
    preloadModuleBundle: async () => {},
    markWorkspaceEntered: () => {
      workspaceEnteredCount += 1;
    },
    markPreloadScheduled: () => {},
    reportError: () => {},
    render: () => {
      renderCount += 1;
    },
  });

  controller.setEntryMode("editor_workspace");
  await Promise.resolve();
  assert.equal(controller.getEntryMode(), "editor_workspace");
  assert.equal(workspaceEnteredCount, 1);
  assert.equal(renderCount, 1);
  assert.equal(initializeCount, 0);
});

test("shell entry controller initializes workspace once and reports init errors", async () => {
  let initialized = false;
  let initializeCount = 0;
  const errors = [];

  const controller = createShellEntryController({
    getIsWorkspaceInitialized: () => initialized,
    hasModuleBundlePromise: () => false,
    initializeWorkspace: async () => {
      initializeCount += 1;
      throw new Error("init failed");
    },
    preloadModuleBundle: async () => {},
    markWorkspaceEntered: () => {},
    markPreloadScheduled: () => {},
    reportError: (action, message) => {
      errors.push({ action, message });
    },
    render: () => {},
  });

  await controller.ensureWorkspaceInitialization().catch(() => {});
  await controller.ensureWorkspaceInitialization().catch(() => {});
  assert.equal(initializeCount, 2);
  assert.deepEqual(errors, [
    { action: "editor_workspace_init", message: "init failed" },
    { action: "editor_workspace_init", message: "init failed" },
  ]);

  initialized = true;
  await controller.ensureWorkspaceInitialization();
  assert.equal(initializeCount, 2);
});

test("shell entry controller schedules preload once and uses idle callback when available", async () => {
  let preloadScheduledCount = 0;
  const preloadSources = [];
  const idleCalls = [];
  const timeoutCalls = [];

  const controller = createShellEntryController({
    getIsWorkspaceInitialized: () => false,
    hasModuleBundlePromise: () => false,
    initializeWorkspace: async () => {},
    preloadModuleBundle: async (source) => {
      preloadSources.push(source);
    },
    markWorkspaceEntered: () => {},
    markPreloadScheduled: () => {
      preloadScheduledCount += 1;
    },
    reportError: () => {},
    render: () => {},
    requestIdleCallback: (callback, options) => {
      idleCalls.push(options);
      callback();
      return 1;
    },
    scheduleTimeout: (callback, delayMs) => {
      timeoutCalls.push(delayMs);
      callback();
      return 1;
    },
  });

  controller.scheduleModulePreload();
  controller.scheduleModulePreload();
  await Promise.resolve();
  assert.equal(preloadScheduledCount, 1);
  assert.deepEqual(preloadSources, ["idle_preload"]);
  assert.equal(idleCalls.length, 1);
  assert.equal(timeoutCalls.length, 0);
});
