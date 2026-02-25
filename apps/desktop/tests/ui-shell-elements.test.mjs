import assert from "node:assert/strict";
import test from "node:test";

import { collectShellElements } from "../src/ui-shell-elements.js";

test("collectShellElements maps key ids/selectors into shell element contract", () => {
  const idCalls = [];
  const selectorCalls = [];
  const doc = {
    getElementById(id) {
      idCalls.push(id);
      return { id };
    },
    querySelector(selector) {
      selectorCalls.push(selector);
      return { selector };
    },
    querySelectorAll(selector) {
      selectorCalls.push(`all:${selector}`);
      return [{ selector, idx: 0 }];
    },
  };

  const elements = collectShellElements(doc);

  assert.equal(elements.logLines.id, "log-lines");
  assert.equal(elements.dashboardRecentList.id, "dashboard-recent-list");
  assert.equal(elements.healthSummary.id, "health-summary");
  assert.equal(elements.dashboardTemplateGrid.selector, ".launch-template-grid");
  assert.equal(elements.projectTitle.selector, ".canvas-header h1");
  assert.equal(elements.playButton.selector, "button[data-command='play']");
  assert.equal(elements.themeSelect.id, "theme-select");
  assert.equal(elements.densitySelect.id, "density-select");
  assert.equal(elements.flipbookClipSelect.id, "flipbook-clip-select");
  assert.equal(elements.flipbookPreviewSpeedSelect.id, "flipbook-preview-speed");
  assert.deepEqual(elements.rightPanelTabButtons, [{ selector: "[data-right-panel-tab]", idx: 0 }]);
  assert.deepEqual(elements.topbarCommandButtons, [{ selector: "button[data-command]", idx: 0 }]);
  assert.equal(elements.commandButtons.create.id, "map-create");
  assert.equal(elements.commandButtons.undo.id, "map-undo");
  assert.equal(elements.toolButtons.select.id, "tool-select");
  assert.equal(elements.toolButtons.erase.id, "tool-erase");
  assert.equal(elements.playtestMetricFeedback.id, "playtest-metric-feedback");
  assert.ok(idCalls.includes("onboarding-status"));
  assert.ok(idCalls.includes("playtest-metric-feedback"));
  assert.ok(idCalls.includes("dashboard-recent-list"));
  assert.ok(idCalls.includes("theme-select"));
  assert.ok(idCalls.includes("density-select"));
  assert.ok(idCalls.includes("flipbook-clip-select"));
  assert.ok(idCalls.includes("flipbook-preview-speed"));
  assert.ok(selectorCalls.includes("all:[data-right-panel-section]"));
});
