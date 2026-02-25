import assert from "node:assert/strict";
import test from "node:test";

import { createEditorModuleBundleLoader } from "../src/ui-shell-module-bundle.js";

test("editor module bundle loader memoizes dynamic load and records preload marks once", async () => {
  const preloadSources = [];
  let preloadResolvedCount = 0;
  let loadCount = 0;

  const loader = createEditorModuleBundleLoader({
    markPreloadSource(source) {
      preloadSources.push(source);
    },
    markPreloadResolved() {
      preloadResolvedCount += 1;
    },
    async loadModules() {
      loadCount += 1;
      return ["mod-a", "mod-b"];
    },
  });

  assert.equal(loader.hasModuleBundlePromise(), false);
  const first = loader.loadEditorModuleBundle("idle_preload");
  const second = loader.loadEditorModuleBundle("init_on_demand");
  assert.equal(loader.hasModuleBundlePromise(), true);
  const [firstResolved, secondResolved] = await Promise.all([first, second]);

  assert.deepEqual(firstResolved, ["mod-a", "mod-b"]);
  assert.deepEqual(secondResolved, ["mod-a", "mod-b"]);
  assert.equal(loadCount, 1);
  assert.deepEqual(preloadSources, ["idle_preload"]);
  assert.equal(preloadResolvedCount, 1);
});

test("editor module bundle loader resets memoized promise after load failure and supports retry", async () => {
  const preloadSources = [];
  let preloadResolvedCount = 0;
  let loadCount = 0;

  const loader = createEditorModuleBundleLoader({
    markPreloadSource(source) {
      preloadSources.push(source);
    },
    markPreloadResolved() {
      preloadResolvedCount += 1;
    },
    async loadModules() {
      loadCount += 1;
      if (loadCount === 1) {
        throw new Error("transient import failure");
      }
      return ["mod-ok"];
    },
  });

  await assert.rejects(loader.loadEditorModuleBundle("idle_preload"), /transient import failure/);
  assert.equal(loader.hasModuleBundlePromise(), false);

  const recovered = await loader.loadEditorModuleBundle("init_on_demand");
  assert.deepEqual(recovered, ["mod-ok"]);
  assert.equal(loadCount, 2);
  assert.deepEqual(preloadSources, ["idle_preload", "init_on_demand"]);
  assert.equal(preloadResolvedCount, 1);
});
