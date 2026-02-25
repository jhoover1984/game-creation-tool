import assert from "node:assert/strict";
import test from "node:test";

import {
  buildWorkspaceBootstrapElements,
  createHelpTourSteps,
} from "../src/ui-shell-bootstrap-elements.js";

test("createHelpTourSteps returns deterministic onboarding sequence", () => {
  const steps = createHelpTourSteps();
  assert.equal(steps.length, 6);
  assert.equal(steps[0]?.action, "select_template_rpg");
  assert.equal(steps[5]?.action, "save_project");
});

test("buildWorkspaceBootstrapElements maps source references for bootstrap contract", () => {
  const source = {
    assistedGenerateBtn: { id: "assist" },
    helpToggleBtn: { id: "help" },
    themeSelect: { id: "theme" },
    densitySelect: { id: "density" },
    commandButtons: { create: { id: "create" } },
    rightPanelTabButtons: [{ id: "tab-1" }],
    rightPanelSections: [{ id: "section-1" }],
  };

  const mapped = buildWorkspaceBootstrapElements(source);
  assert.equal(mapped.assistedGenerateBtn, source.assistedGenerateBtn);
  assert.equal(mapped.helpToggleBtn, source.helpToggleBtn);
  assert.equal(mapped.themeSelect, source.themeSelect);
  assert.equal(mapped.densitySelect, source.densitySelect);
  assert.equal(mapped.commandButtons, source.commandButtons);
  assert.equal(mapped.rightPanelTabButtons, source.rightPanelTabButtons);
  assert.equal(mapped.rightPanelSections, source.rightPanelSections);
});
