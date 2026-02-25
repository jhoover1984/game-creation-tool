import { test, expect } from "@playwright/test";
import { Buffer } from "node:buffer";
import { buildPreviewSignature } from "../src/viewport-signature.js";

test("shell loads and map entity create flow works", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#launch-dashboard h1")).toContainText("Game Creator Studio");
  await expect(page.locator("#dashboard-runtime-mode")).toContainText("Web Mode");

  await page.locator("#dashboard-action-open").click();
  await expect(page.locator("#runtime-mode-badge")).toContainText("Web Mode");
  await page.locator("#map-create").click();
  await expect(page.locator("#entity-list li")).toContainText("Entity 1");
});

test("launch and workspace expose performance metrics probes", async ({ page }, testInfo) => {
  await page.goto("/");
  const launchMetrics = await page.evaluate(() => window.__gcsPerfMetrics);
  expect(launchMetrics).toBeTruthy();
  expect(launchMetrics.dashboardFirstPaintDeltaMs).not.toBeNull();
  expect(launchMetrics.dashboardFirstPaintDeltaMs).toBeGreaterThanOrEqual(0);

  await page.locator("#dashboard-action-open").click();
  await expect(page.locator("#editor-workspace")).toBeVisible();

  const workspaceMetrics = await page.evaluate(() => window.__gcsPerfMetrics);
  expect(workspaceMetrics.editorInitDurationMs).not.toBeNull();
  expect(workspaceMetrics.editorInitDurationMs).toBeGreaterThanOrEqual(0);
  expect(workspaceMetrics.workspaceEnteredDeltaMs).not.toBeNull();
  expect(workspaceMetrics.workspaceEnteredDeltaMs).toBeGreaterThanOrEqual(0);

  await testInfo.attach("perf-launch-workspace", {
    body: Buffer.from(
      JSON.stringify(
        {
          launch: launchMetrics,
          workspace: workspaceMetrics,
        },
        null,
        2
      ),
      "utf8"
    ),
    contentType: "application/json",
  });
});

test("playtest telemetry exposes first-frame and update-delay probes", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.locator("#dashboard-action-open").click();
  await page.locator(".topbar button[data-command='play']").click();
  await expect(page.locator("#playtest-overlay")).toBeVisible();

  const playtestMetrics = await page.waitForFunction(() => {
    const metrics = window.__gcsPerfMetrics || {};
    if (
      typeof metrics.playtestFirstFrameDeltaMs === "number" &&
      typeof metrics.playtestLastMetricUpdateDeltaMs === "number"
    ) {
      return metrics;
    }
    return null;
  });
  const metricValues = await playtestMetrics.jsonValue();
  expect(metricValues.playtestFirstFrameDeltaMs).toBeGreaterThanOrEqual(0);
  expect(metricValues.playtestLastMetricUpdateDeltaMs).toBeGreaterThanOrEqual(0);

  await expect(page.locator("#playtest-metric-feedback")).not.toContainText("pending");

  await testInfo.attach("perf-playtest-feedback", {
    body: Buffer.from(
      JSON.stringify(
        {
          playtest: metricValues,
          feedback: await page.locator("#playtest-metric-feedback").textContent(),
        },
        null,
        2
      ),
      "utf8"
    ),
    contentType: "application/json",
  });
});

test("dashboard template cards and beginner default drive first project setup", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("dashboard-ui-mode-select")).toHaveValue("beginner");

  await page.locator("[data-dashboard-template='platformer']").click();
  await expect(page.getByLabel("dashboard-template-select")).toHaveValue("platformer");
  await page.locator("#dashboard-action-new").click();

  await expect(page.locator(".canvas-header h1")).toContainText("Platformer Starter");
  await expect(page.getByLabel("ui-profile-select")).toHaveValue("beginner");
  await expect(page.locator("#map-move")).toBeHidden();
});

test("dashboard new applies puzzle starter script scaffold", async ({ page }) => {
  await page.goto("/");
  await page.locator("[data-dashboard-template='puzzle']").click();
  await expect(page.getByLabel("dashboard-template-select")).toHaveValue("puzzle");

  await page.locator("#dashboard-action-new").click();
  await expect(page.locator(".canvas-header h1")).toContainText("Puzzle Starter");

  await page.getByLabel("ui-profile-select").selectOption("builder");
  await page.locator("#right-tab-script").click();
  await expect(page.locator("#script-graph-input")).toHaveValue(/event_move_input/);
  await expect(page.locator("#script-graph-input")).toHaveValue(/action_push_crate/);
});

test("dogfood flow builds and export-previews a mini puzzle game", async ({ page }) => {
  await page.goto("/");
  await page.locator("#dashboard-action-open").click();

  await page.getByLabel("walkthrough-select").selectOption("puzzle_room");
  await page.locator("#walkthrough-start").click();
  for (let i = 0; i < 5; i += 1) {
    await page.locator("#walkthrough-run-step").click();
  }

  await expect(page.locator("#walkthrough-status")).toContainText("Complete");
  await expect(page.locator(".canvas-header h1")).toContainText("Puzzle Starter");
  await expect(page.locator("#entity-list")).not.toContainText("No entities.");
  await expect(page.locator("#tile-layer .tile-cell")).not.toHaveCount(0);

  await page.evaluate(() => {
    const button = document.querySelector("[data-walkthrough-action='export_preview']");
    if (!(button instanceof HTMLElement)) {
      throw new Error("export-preview walkthrough action not found");
    }
    button.click();
  });
  await expect(page.locator("#log-lines")).toContainText("Export preview generated");

  await page.getByLabel("ui-profile-select").selectOption("builder");
  await page.locator("#right-tab-script").click();
  await expect(page.locator("#script-graph-input")).toHaveValue(/event_move_input/);
  await expect(page.locator("#script-graph-input")).toHaveValue(/action_push_crate/);
});

test("dashboard continue and recover actions enter workspace", async ({ page }) => {
  await page.goto("/");
  await page.locator("#dashboard-action-continue").click();
  await expect(page.locator("#editor-workspace")).toBeVisible();
  await expect(page.locator("#launch-dashboard")).toBeHidden();
  await expect(page.locator("#runtime-mode-badge")).toContainText("Web Mode");

  await page.goto("/");
  await page.locator("#dashboard-action-recover").click();
  await expect(page.locator("#editor-workspace")).toBeVisible();
  await expect(page.locator("#launch-dashboard")).toBeHidden();
  await expect(page.locator("#runtime-mode-badge")).toContainText("Web Mode");
});

test("dashboard recent projects list can reopen a recent project", async ({ page }) => {
  await page.goto("/");
  await page.locator("#dashboard-action-open").click();
  await expect(page.locator("#editor-workspace")).toBeVisible();

  await page.goto("/");
  await expect(page.locator("#dashboard-recent-list")).toContainText("Sample Project");
  await page.locator("#dashboard-recent-list .launch-recent-item").first().click();

  await expect(page.locator("#editor-workspace")).toBeVisible();
  await expect(page.locator("#log-lines")).toContainText("Dashboard: opened recent project");
});

test("dashboard recent projects list is recency-sorted and capped", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    const seeded = Array.from({ length: 120 }, (_, index) => ({
      projectDir: `C:/projects/demo-${index}`,
      projectName: `Demo ${index}`,
      updatedAt: 1000 + index,
    }));
    const recents = [
      ...seeded,
      { projectDir: "", projectName: "Missing path", updatedAt: 5000 },
      { projectName: "No dir field", updatedAt: 5001 },
      { projectDir: "   ", projectName: "Whitespace path", updatedAt: 5002 },
    ];
    window.localStorage.setItem("gcs.dashboard.recent_projects.v1", JSON.stringify(recents));
  });

  await page.reload();

  const recentItems = page.locator("#dashboard-recent-list .launch-recent-item");
  await expect(recentItems).toHaveCount(8);
  await expect(recentItems.first()).toContainText("Demo 119");

  await recentItems.first().click();
  await expect(page.locator("#log-lines")).toContainText(
    "Dashboard: opened recent project (C:/projects/demo-119)."
  );
});

test("new project template seeds starter map content", async ({ page }) => {
  await page.goto("/");
  await page.locator("#dashboard-action-open").click();
  await page.getByLabel("new-project-template").selectOption("platformer");
  await page.getByRole("button", { name: "New" }).click();

  await expect(page.locator(".canvas-header h1")).toContainText("Platformer Starter");
  await expect(page.locator("#entity-list")).toContainText("Player");
  await expect(page.locator("#entity-list")).toContainText("Goal Flag");
  await expect(page.locator("#tile-layer .tile-cell")).toHaveCount(12);
});

test("puzzle starter applies sokoban script template scaffold", async ({ page }) => {
  await page.goto("/");
  await page.locator("#dashboard-action-open").click();
  await page.getByLabel("new-project-template").selectOption("puzzle");
  await page.getByRole("button", { name: "New" }).click();

  await expect(page.locator(".canvas-header h1")).toContainText("Puzzle Starter");
  await expect(page.locator("#entity-list")).toContainText("Player");

  await page.getByLabel("ui-profile-select").selectOption("builder");
  await page.locator("#right-tab-script").click();
  await expect(page.locator("#script-graph-input")).toHaveValue(/event_move_input/);
  await expect(page.locator("#script-graph-input")).toHaveValue(/action_push_crate/);
});

test("quick start checklist advances through starter workflow", async ({ page }) => {
  await page.goto("/");
  await page.locator("#dashboard-action-open").click();
  await page.getByLabel("new-project-template").selectOption("rpg");
  await page.getByRole("button", { name: "New" }).click();

  await expect(page.locator("#onboarding-status")).toContainText("Quick Start progress: 3/5");
  await expect(page.locator("#onboarding-checklist")).toContainText(
    "[Done] Place at least one entity"
  );
  await expect(page.locator("#onboarding-checklist")).toContainText(
    "[Done] Paint at least one tile"
  );

  await page.locator(".topbar button[data-command='play']").click();
  await page.locator(".topbar").getByRole("button", { name: "Save" }).click();
  await expect(page.locator("#onboarding-status")).toContainText("Quick Start complete");
});

test("quick start checklist surfaces action buttons for pending steps", async ({ page }) => {
  await page.goto("/");
  await page.locator("#dashboard-action-open").click();
  await page.getByLabel("new-project-template").selectOption("blank");
  await page.getByRole("button", { name: "New" }).click();

  await expect(page.locator("[data-onboarding-action='add_entity']")).toBeVisible();
  await expect(page.locator("[data-onboarding-action='paint_tile']")).toBeVisible();
  await expect(page.locator("[data-onboarding-action='playtest']")).toBeVisible();
  await expect(page.locator("[data-onboarding-action='save_project']")).toBeVisible();
});

test("quick start hint text tracks the next pending step", async ({ page }) => {
  await page.goto("/");
  await page.locator("#dashboard-action-open").click();
  await page.getByLabel("new-project-template").selectOption("blank");
  await page.getByRole("button", { name: "New" }).click();

  await expect(page.locator("#onboarding-hint")).toContainText("Click Add Entity");
  await page.locator("#map-create").click();
  await expect(page.locator("#onboarding-hint")).toContainText("Click Paint Tile");
});

test("assisted primitive generator adds profile-aware starter prop and tile footprint", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#dashboard-action-open").click();
  await page.getByLabel("new-project-template").selectOption("blank");
  await page.getByRole("button", { name: "New" }).click();

  await page.getByLabel("assisted-primitive-select", { exact: true }).selectOption("rock");
  await page.getByLabel("assisted-profile-select", { exact: true }).selectOption("nes");
  await page.getByRole("button", { name: "Generate Primitive" }).click();

  await expect(page.locator("#entity-list")).toContainText("Rock Prop (NES)");
  await expect(page.locator("#tile-layer .tile-cell")).toHaveCount(3);
});

test("draw studio seed controls generate assisted primitive content", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.removeItem("gcs.draw_seed_presets.v1"));
  await page.locator("#dashboard-action-open").click();
  await page.getByLabel("ui-profile-select").selectOption("builder");
  await page.getByLabel("new-project-template").selectOption("blank");
  await page.getByRole("button", { name: "New" }).click();
  await page.locator("#right-tab-draw").click();

  await page.getByLabel("draw-assisted-primitive-select", { exact: true }).selectOption("chest");
  await page.getByLabel("draw-assisted-profile-select", { exact: true }).selectOption("snes");
  await page.getByLabel("draw-assisted-offset-x").fill("5");
  await page.getByLabel("draw-assisted-offset-y").fill("4");
  await page.getByLabel("draw-assisted-mirror-x").check();
  await expect(page.locator("#draw-seed-summary")).toContainText("mirrored");
  await expect(page.locator("#draw-seed-preview")).toContainText("Tile @ (7, 4)");
  await page.locator("#draw-seed-preset-line").click();
  await expect(page.locator("#draw-seed-preview")).toContainText("Tile @ (8, 4)");
  await expect(page.locator("#draw-seed-preview")).not.toContainText("Tile @ (6, 5)");
  await page.getByLabel("draw-seed-preset-name").fill("line_pack");
  await page.locator("#draw-seed-preset-save").click();
  await expect(page.getByLabel("draw-seed-preset-select")).toContainText("line_pack (Custom)");
  await page.locator("#draw-seed-preset-cluster").click();
  await expect(page.locator("#draw-seed-preview")).toContainText("Tile @ (6, 5)");
  await page.getByLabel("draw-seed-preset-select").selectOption("custom_line_pack");
  await page.locator("#draw-seed-preset-apply").click();
  await expect(page.locator("#draw-seed-preview")).toContainText("Tile @ (8, 4)");
  await expect(page.locator("#draw-seed-preview")).not.toContainText("Tile @ (6, 5)");
  await page.locator("#draw-seed-preset-copy").click();
  await expect(page.getByLabel("draw-seed-preset-json")).toHaveValue(/"points"/);
  await expect(page.locator("#log-lines")).toContainText(
    /Draw preset copied to clipboard|Clipboard unavailable/
  );
  await page.locator("#draw-seed-preset-export").click();
  await expect(page.getByLabel("draw-seed-preset-json")).toHaveValue(/"schema_version": 1/);
  await expect(page.getByLabel("draw-seed-preset-json")).toHaveValue(/"points"/);
  await page.locator("#draw-seed-preset-import").click();
  await expect(page.getByLabel("draw-seed-preset-select")).toContainText("line_pack (2) (Custom)");
  await page.getByLabel("draw-seed-preset-select").selectOption("custom_line_pack_2");
  await page.locator("#draw-seed-preset-apply").click();
  await expect(page.locator("#draw-seed-preview")).toContainText("Tile @ (8, 4)");
  await page
    .getByLabel("draw-seed-preset-json")
    .fill(
      '{"schema_id":"gcs.draw_seed_preset","schema_version":1,"name":"line_pack","points":[{"x":99,"y":-5,"foo":1}],"mystery_key":true}'
    );
  await page.locator("#draw-seed-preset-import").click();
  await expect(page.locator("#log-lines")).toContainText("warning(s)");
  await expect(page.locator("#issues-list")).toContainText(
    "Preset import warning: unknown top-level key(s): mystery_key."
  );
  await expect(page.locator("#issues-list .issue-severity-warning").first()).toContainText(
    "warning"
  );
  await page.locator("#right-tab-issues").click();
  await expect(page.locator("[data-issue-action='dismiss_draw_preset_warnings']")).toBeVisible();
  await page.evaluate(() => {
    const button = document.querySelector("[data-issue-action='dismiss_draw_preset_warnings']");
    if (!(button instanceof HTMLElement)) {
      throw new Error("dismiss_draw_preset_warnings action missing");
    }
    button.click();
  });
  await expect(page.locator("#issues-list")).not.toContainText(
    "Preset import warning: unknown top-level key(s): mystery_key."
  );
  await page.locator("#right-tab-draw").click();
  await page.getByLabel("draw-seed-preset-select").selectOption("custom_line_pack_3");
  await page.locator("#draw-seed-preset-apply").click();
  await expect(page.locator("#draw-seed-preview")).toContainText("Tile @ (12, 4)");
  await page.getByLabel("draw-seed-preset-select").selectOption("custom_line_pack_2");
  await page.locator("#draw-seed-preset-apply").click();
  await expect(page.locator("#draw-seed-preview")).toContainText("Tile @ (8, 4)");
  await page.locator("#draw-assisted-generate").click();

  await expect(page.locator("#entity-list")).toContainText("Chest Prop (SNES)");
  await expect(page.locator("#entity-list")).toContainText("@ (80, 64)");
  await expect(page.locator("#tile-layer .tile-cell")).toHaveCount(4);
  await expect(page.locator("#log-lines")).toContainText("Draw Studio seed generated");
});

test("assisted generation guardrails surface near-limit messaging", async ({ page }) => {
  await page.goto("/");
  await page.locator("#dashboard-action-open").click();
  await page.getByLabel("new-project-template").selectOption("blank");
  await page.getByRole("button", { name: "New" }).click();
  await page.getByLabel("assisted-primitive-select", { exact: true }).selectOption("rock");
  await page.getByLabel("assisted-profile-select", { exact: true }).selectOption("nes");

  for (let i = 0; i < 8; i += 1) {
    await page.getByRole("button", { name: "Generate Primitive" }).click();
  }

  await expect(page.locator("#issues-list")).toContainText("Assisted content near NES profile cap");
  await expect(page.locator("#onboarding-hint")).toContainText("Guardrail:");
});

test("assisted guardrail action can switch profile", async ({ page }) => {
  await page.goto("/");
  await page.locator("#dashboard-action-open").click();
  await page.getByLabel("new-project-template").selectOption("blank");
  await page.getByRole("button", { name: "New" }).click();
  await page.getByLabel("assisted-primitive-select", { exact: true }).selectOption("rock");
  await page.getByLabel("assisted-profile-select", { exact: true }).selectOption("nes");

  for (let i = 0; i < 8; i += 1) {
    await page.getByRole("button", { name: "Generate Primitive" }).click();
  }

  await expect(page.locator("#issues-list")).toContainText("Use SNES assisted profile");
  await page.evaluate(() => {
    const button = document.querySelector("[data-issue-action='assisted_switch_snes']");
    if (!(button instanceof HTMLElement)) {
      throw new Error("assisted_switch_snes action missing");
    }
    button.click();
  });
  await expect(page.getByLabel("assisted-profile-select", { exact: true })).toHaveValue("snes");
});

test("assisted guardrail action can clean generated props", async ({ page }) => {
  await page.goto("/");
  await page.locator("#dashboard-action-open").click();
  await page.getByLabel("new-project-template").selectOption("blank");
  await page.getByRole("button", { name: "New" }).click();
  await page.getByLabel("assisted-primitive-select", { exact: true }).selectOption("rock");
  await page.getByLabel("assisted-profile-select", { exact: true }).selectOption("nes");

  for (let i = 0; i < 8; i += 1) {
    await page.getByRole("button", { name: "Generate Primitive" }).click();
  }

  await expect(page.locator("#issues-list")).toContainText("Remove generated props");
  await page.evaluate(() => {
    const button = document.querySelector("[data-issue-action='assisted_cleanup_profile']");
    if (!(button instanceof HTMLElement)) {
      throw new Error("assisted_cleanup_profile action missing");
    }
    button.click();
  });
  await expect(page.locator("#entity-list")).not.toContainText("(NES)");
});

test("ui profile toggle hides advanced panels for beginner mode", async ({ page }) => {
  await page.goto("/");
  await page.locator("#dashboard-action-open").click();

  await page.getByLabel("ui-profile-select").selectOption("beginner");
  await expect(page.locator("#map-move")).toBeHidden();
  await expect(page.getByRole("heading", { name: "Runtime Watch" })).toBeHidden();
  await expect(page.getByRole("heading", { name: "Script Lab" })).toBeHidden();

  await page.getByLabel("ui-profile-select").selectOption("builder");
  await page.locator("#right-tab-script").click();
  await expect(page.locator("#map-move")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Runtime Watch" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Script Lab" })).toBeVisible();
});

test("theme and density controls apply and persist across workspace reload", async ({ page }) => {
  await page.goto("/");
  await page.locator("#dashboard-action-open").click();

  await page.getByLabel("theme-select").selectOption("light");
  await page.getByLabel("density-select").selectOption("compact");

  const applied = await page.evaluate(() => ({
    theme: document.body.getAttribute("data-theme"),
    density: document.body.getAttribute("data-density"),
  }));
  expect(applied.theme).toBe("light");
  expect(applied.density).toBe("compact");

  await page.reload();
  await page.locator("#dashboard-action-open").click();

  await expect(page.getByLabel("theme-select")).toHaveValue("light");
  await expect(page.getByLabel("density-select")).toHaveValue("compact");
});

test("layout controls support panel collapse and right-panel tabs", async ({ page }) => {
  await page.goto("/");
  await page.locator("#dashboard-action-open").click();

  await expect(page.locator("#entity-list")).toBeVisible();
  await page.locator("#right-tab-issues").click();
  await expect(page.locator("#issues-list")).toBeVisible();
  await expect(page.locator("#entity-list")).toBeHidden();
  await page.locator("#right-tab-inspector").click();
  await expect(page.locator("#entity-list")).toBeVisible();

  await page.locator("#panel-toggle-left").click();
  await expect(page.locator("body")).toHaveClass(/panel-left-collapsed/);
  await page.locator("#panel-toggle-left").click();
  await expect(page.locator("body")).not.toHaveClass(/panel-left-collapsed/);

  await page.locator("#panel-toggle-right").click();
  await expect(page.locator("body")).toHaveClass(/panel-right-collapsed/);
  await page.locator("#panel-toggle-right").click();
  await expect(page.locator("body")).not.toHaveClass(/panel-right-collapsed/);

  await page.getByLabel("ui-profile-select").selectOption("beginner");
  await expect(page.locator("#right-tab-script")).toBeHidden();
  await expect(page.locator("#right-tab-draw")).toBeHidden();
});

test("animation tab flipbook supports clip and frame strip editing", async ({ page }) => {
  await page.goto("/");
  await page.locator("#dashboard-action-open").click();
  await page.getByLabel("ui-profile-select").selectOption("builder");

  await page.locator("#map-create").click();
  await expect(page.locator("#entity-list li")).toContainText("Entity 1");

  await page.locator("#right-tab-animation").click();
  await expect(page.locator("#flipbook-summary")).toContainText("Entity 1");

  await page.locator("#flipbook-clip-add").click();
  await expect(page.locator("#flipbook-status")).toContainText("Created clip");
  await expect(page.locator("#flipbook-clip-select")).toHaveValue("clip_1");

  await page.locator("#flipbook-frame-add").click();
  await expect(page.locator("#flipbook-status")).toContainText("Frame added");
  await expect(page.locator("#flipbook-frame-strip .flipbook-frame-chip")).toHaveCount(2);

  await page.locator("#flipbook-frame-duplicate").click();
  await expect(page.locator("#flipbook-status")).toContainText("Frame duplicated");
  await expect(page.locator("#flipbook-frame-strip .flipbook-frame-chip")).toHaveCount(3);
});

test("guided walkthrough runs step-by-step in quick start panel", async ({ page }) => {
  await page.goto("/");
  await page.locator("#dashboard-action-open").click();

  await page.getByLabel("walkthrough-select").selectOption("zelda_room");
  await page.locator("#walkthrough-start").click();
  await expect(page.locator("#walkthrough-status")).toContainText("Focused control:");
  await expect(page.locator(".topbar button[data-command='new']")).toHaveClass(/tour-focus/);
  await expect(page.locator("#walkthrough-focus-hint")).toBeVisible();
  await expect(page.locator("#walkthrough-focus-why")).toContainText("Why:");
  await expect(page.locator("#walkthrough-focus-expected")).toContainText("Expected:");
  await expect(page.locator("#walkthrough-steps")).toContainText("Why:");
  await expect(page.locator("#walkthrough-steps")).toContainText("Expected:");
  await expect(page.locator("[data-walkthrough-focus]").first()).toBeVisible();

  await page.locator("#walkthrough-run-step").click();
  await expect(page.locator("#walkthrough-status")).toContainText("Focused control:");
  await expect(page.locator("#walkthrough-steps")).toContainText(
    "[Done] Scaffold RPG starter room"
  );
});

test("guided walkthrough completion exposes clear next actions", async ({ page }) => {
  await page.goto("/");
  await page.locator("#dashboard-action-open").click();
  await page.getByLabel("walkthrough-select").selectOption("zelda_room");
  await page.locator("#walkthrough-start").click();

  for (let i = 0; i < 5; i += 1) {
    await page.locator("#walkthrough-run-step").click();
  }

  await expect(page.locator("#walkthrough-status")).toContainText("Complete");
  await expect(page.locator("[data-walkthrough-action='playtest']")).toBeVisible();
  await expect(page.locator("[data-walkthrough-action='export_preview']")).toBeVisible();
  await expect(page.locator("[data-walkthrough-action='restart']")).toBeVisible();
});

test("guided walkthrough completion actions execute expected flows", async ({ page }) => {
  await page.goto("/");
  await page.locator("#dashboard-action-open").click();
  await page.getByLabel("walkthrough-select").selectOption("zelda_room");
  await page.locator("#walkthrough-start").click();

  for (let i = 0; i < 5; i += 1) {
    await page.locator("#walkthrough-run-step").click();
  }

  await page.evaluate(() => {
    const button = document.querySelector("[data-walkthrough-action='playtest']");
    if (!(button instanceof HTMLElement)) {
      throw new Error("playtest walkthrough action not found");
    }
    button.click();
  });
  await expect(page.locator("#hud-mode")).toContainText("Playtest");
  await page.keyboard.press("Escape");
  await expect(page.locator("#playtest-overlay")).toBeHidden();
  await expect(page.locator("#hud-mode")).toContainText("Edit");

  await page.evaluate(() => {
    const button = document.querySelector("[data-walkthrough-action='export_preview']");
    if (!(button instanceof HTMLElement)) {
      throw new Error("export-preview walkthrough action not found");
    }
    button.click();
  });
  await expect(page.locator("#log-lines")).toContainText("Export preview generated");

  await page.evaluate(() => {
    const button = document.querySelector("[data-walkthrough-action='restart']");
    if (!(button instanceof HTMLElement)) {
      throw new Error("restart walkthrough action not found");
    }
    button.click();
  });
  await expect(page.locator("#walkthrough-status")).toContainText("Focused control:");
});

test("help overlay shows contextual map and playtest guidance", async ({ page }) => {
  await page.goto("/");
  await page.locator("#dashboard-action-open").click();

  await page.locator("#help-toggle").click();
  await expect(page.locator("#help-overlay")).toBeVisible();
  await expect(page.locator("#help-context")).toContainText("Map Help");
  await expect(page.locator("#help-list")).toContainText("Add Entity");

  await page.locator(".topbar button[data-command='play']").click();
  await expect(page.locator("#help-context")).toContainText("Playtest Help");
  await expect(page.locator("#help-list")).toContainText("Pause/Resume");
});

test("help guided tour highlights controls step-by-step", async ({ page }) => {
  await page.goto("/");
  await page.locator("#dashboard-action-open").click();
  await page.locator("#help-toggle").click();

  await page.locator("#help-tour-start").click();
  await expect(page.locator("#help-tour-status")).toContainText("Step 1/6");
  await expect(page.locator("#new-project-template")).toHaveClass(/tour-focus/);

  await page.locator("#help-tour-next").click();
  await expect(page.locator("#help-tour-status")).toContainText("Step 2/6");
  await expect(page.locator(".topbar button[data-command='new']")).toHaveClass(/tour-focus/);

  await page.locator("#help-tour-stop").click();
  await expect(page.locator("#help-tour-status")).toContainText("Tour idle.");
});

test("help guided tour Do It advances to the next guided step", async ({ page }) => {
  await page.goto("/");
  await page.locator("#dashboard-action-open").click();
  await page.locator("#help-toggle").click();
  await page.locator("#help-tour-start").click();

  await expect(page.locator("#help-tour-status")).toContainText("Step 1/6");
  await page.locator("#help-tour-do").click();
  await expect(page.locator("#help-tour-status")).toContainText("Step 2/6");
  await expect(page.locator(".topbar button[data-command='new']")).toHaveClass(/tour-focus/);

  await page.locator("#help-tour-do").click();
  await expect(page.locator("#help-tour-status")).toContainText("Step 3/6");
  await expect(page.locator("#map-create")).toHaveClass(/tour-focus/);
});

test("help tour complete summary exposes playtest/export actions", async ({ page }) => {
  await page.goto("/");
  await page.locator("#dashboard-action-open").click();
  await page.locator("#help-toggle").click();
  await page.locator("#help-tour-start").click();

  for (let i = 0; i < 6; i += 1) {
    await page.locator("#help-tour-next").click();
  }

  await expect(page.locator("#help-tour-status")).toContainText("Tour complete");
  await expect(page.locator("[data-help-summary-action='playtest_again']")).toBeVisible();
  await expect(page.locator("[data-help-summary-action='export_preview']")).toBeVisible();
});

test("playtest breakpoint on tick pauses runtime", async ({ page }) => {
  await page.goto("/");
  await page.locator("#dashboard-action-open").click();
  await page.locator("#map-create").click();
  await page.locator(".topbar button[data-command='play']").click();
  await page.locator("#bp-tick").click();
  await page.locator("#playtest-pause").click();

  await expect(page.locator("#playtest-overlay")).toBeVisible();
  await expect(page.locator(".playtest-exit-hint")).toContainText("Press Esc to exit");
  await expect(page.locator("#playtest-pause")).toContainText("Resume");
});

test("move selected command updates map coordinates", async ({ page }) => {
  await page.goto("/");
  await page.locator("#dashboard-action-open").click();
  await page.locator("#map-create").click();

  await expect(page.locator("#entity-list li").first()).toContainText("@ (16, 16)");
  await page.getByRole("button", { name: "Move Selected" }).click();
  await expect(page.locator("#entity-list li").first()).toContainText("@ (20, 16)");
});

test("drag pipeline commits move via deterministic pointer events", async ({ page }) => {
  await page.goto("/");
  await page.locator("#dashboard-action-open").click();
  await page.locator("#map-create").click();
  await expect(page.locator("#entity-list li").first()).toContainText("@ (16, 16)");

  // Set 1x zoom so scale = 1 and pointer-event deltas map 1:1 to logical pixels.
  await page.locator("#map-zoom-1x").click();

  await page.evaluate(async () => {
    const node = document.querySelector("button[data-entity-id='1']");
    if (!(node instanceof HTMLElement)) {
      throw new Error("entity node not found");
    }

    const down = new window.PointerEvent("pointerdown", {
      bubbles: true,
      pointerId: 77,
      pointerType: "mouse",
      button: 0,
      buttons: 1,
      clientX: 100,
      clientY: 100,
    });
    node.dispatchEvent(down);

    await new Promise((resolve) => window.setTimeout(resolve, 0));

    const move = new window.PointerEvent("pointermove", {
      bubbles: true,
      pointerId: 77,
      pointerType: "mouse",
      button: -1,
      buttons: 1,
      clientX: 112,
      clientY: 104,
    });
    window.dispatchEvent(move);

    await new Promise((resolve) => window.setTimeout(resolve, 0));

    const up = new window.PointerEvent("pointerup", {
      bubbles: true,
      pointerId: 77,
      pointerType: "mouse",
      button: 0,
      buttons: 0,
      clientX: 112,
      clientY: 104,
    });
    window.dispatchEvent(up);
  });

  await expect(page.locator("#entity-list li").first()).toContainText("@ (28, 20)");
});

test("keyboard shortcuts switch tools and toggle playtest", async ({ page }) => {
  await page.goto("/");
  await page.locator("#dashboard-action-open").click();
  await page.locator(".canvas-surface").click();

  await page.keyboard.press("KeyB");
  await expect(page.locator("#hud-tool")).toContainText("Tool: Paint");

  await page.keyboard.press("KeyE");
  await expect(page.locator("#hud-tool")).toContainText("Tool: Erase");

  await page.keyboard.press("KeyV");
  await expect(page.locator("#hud-tool")).toContainText("Tool: Select");

  await page.keyboard.press("F5");
  await expect(page.locator("#hud-mode")).toContainText("Playtest");
  await expect(page.locator("#playtest-overlay")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.locator("#playtest-overlay")).toBeHidden();
  await expect(page.locator("#hud-mode")).toContainText("Edit");
});

test("trace dock filters by breakpoint events", async ({ page }) => {
  await page.goto("/");
  await page.locator("#dashboard-action-open").click();
  await page.locator("#map-create").click();
  await page.locator(".topbar button[data-command='play']").click();
  await page.locator("#bp-tick").click();
  await page.locator("#playtest-pause").click();

  const traceItems = page.locator("#trace-lines li");
  await expect(traceItems.first()).toContainText("breakpoint:");

  await page.locator("[data-trace-filter='breakpoint']").click();
  await expect(traceItems.first()).toContainText("breakpoint:");
});

test("watch filter chips swap sections", async ({ page }) => {
  await page.goto("/");
  await page.locator("#dashboard-action-open").click();
  await page.getByLabel("ui-profile-select").selectOption("builder");
  await page.locator("#map-create").click();
  await page.locator("#right-tab-script").click();

  const watchList = page.locator("#watch-flags");
  await expect(watchList).toContainText("Global Flags");
  await expect(watchList).toContainText("Selected Flags");

  await page.locator("#watch-filter-vars").click();
  await expect(watchList).toContainText("Global Vars");
  await expect(watchList).toContainText("Selected Vars");
  await expect(watchList).not.toContainText("Global Inventory");

  await page.locator("#watch-filter-inventory").click();
  await expect(watchList).toContainText("Global Inventory");
  await expect(watchList).toContainText("Selected Inventory");
});

test("script lab validation surfaces graph issues in summary and issues drawer", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#dashboard-action-open").click();
  await page.getByLabel("ui-profile-select").selectOption("builder");
  await page.locator("#right-tab-script").click();

  const invalidGraph = JSON.stringify(
    {
      nodes: [{ id: "event_start", kind: "event" }],
      edges: [{ from: "event_start", to: "action_missing" }],
    },
    null,
    2
  );
  await page.locator("#script-graph-input").fill(invalidGraph);
  await page.locator("#script-validate").click();

  await expect(page.locator("#script-validation-summary")).toContainText("1 issue(s) found.");
  await expect(page.locator("#issues-list")).toContainText("Script missing_target_node");
});

test("script lab templates can be applied and saved as custom templates", async ({ page }) => {
  await page.goto("/");
  await page.locator("#dashboard-action-open").click();
  await page.getByLabel("ui-profile-select").selectOption("builder");
  await page.locator("#right-tab-script").click();

  await page.locator("#script-template-select").selectOption("quest_trigger");
  await page.locator("#script-template-use").click();
  await expect(page.locator("#script-validation-summary")).toContainText("Script graph is valid.");

  await expect(page.locator("#script-graph-input")).toHaveValue(/cond_has_key/);

  await page.locator("#script-template-name").fill("Quest Fast Start");
  await page.locator("#script-template-save").click();
  await expect(page.locator("#script-template-select")).toContainText("Quest Fast Start (Custom)");
});

test("script lab issues drawer surfaces auto-fix controls for missing target node", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#dashboard-action-open").click();
  await page.getByLabel("ui-profile-select").selectOption("builder");
  await page.locator("#right-tab-script").click();

  const invalidGraph = JSON.stringify(
    {
      nodes: [{ id: "event_start", kind: "event" }],
      edges: [{ from: "event_start", to: "action_missing" }],
    },
    null,
    2
  );
  await page.locator("#script-graph-input").fill(invalidGraph);
  await page.locator("#script-validate").click();
  await expect(page.locator("#script-validation-summary")).toContainText("1 issue(s) found.");

  await page.locator("#right-tab-issues").click();
  await expect(page.locator("[data-script-fix-code='missing_target_node']")).toBeVisible();
});

test("playtest viewport scene signature includes background, tile, and entity samples", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#dashboard-action-open").click();
  await page.locator("#map-create").click();

  await page.locator("#tool-paint").click();
  await page.locator(".canvas-surface").click({ position: { x: 8, y: 8 } });

  await page.locator(".topbar button[data-command='play']").click();
  await page.locator("#playtest-pause").click();
  await expect(page.locator("#playtest-viewport")).toBeVisible();
  const frameLabel = await page.locator("#playtest-metric-frame").textContent();
  const frame = Number.parseInt((frameLabel || "").replace(/[^\d]/g, ""), 10) || 0;

  const actual = await page.evaluate(() => {
    const canvas = document.getElementById("playtest-viewport");
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error("playtest viewport canvas missing");
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("playtest viewport context missing");
    }
    const sample = (x, y) => Array.from(ctx.getImageData(x, y, 1, 1).data);
    return {
      backgroundFar: sample(123, 119),
      backgroundNear: sample(37, 45),
      paintedTile: sample(4, 4),
      entityCore: sample(20, 20),
    };
  });

  const expected = buildPreviewSignature({
    options: { width: 160, height: 144, tilePx: 8 },
    snapshot: {
      tiles: [{ x: 0, y: 0, tile_id: 1 }],
      entities: [{ id: 1, name: "Entity 1", position: { x: 16, y: 16 } }],
      playtest: { frame },
    },
    points: [
      { id: "backgroundFar", x: 123, y: 119 },
      { id: "backgroundNear", x: 37, y: 45 },
      { id: "paintedTile", x: 4, y: 4 },
      { id: "entityCore", x: 20, y: 20 },
    ],
  });

  expect(actual).toEqual(expected);
});

test("multi-tab browser sessions keep editor state isolated", async ({ browser }) => {
  const context = await browser.newContext();
  const pageA = await context.newPage();
  const pageB = await context.newPage();

  await pageA.goto("/");
  await pageA.locator("#dashboard-action-open").click();
  await pageA.locator("#map-create").click();
  await expect(pageA.locator("#entity-list li")).toContainText("Entity 1");

  await pageB.goto("/");
  await pageB.locator("#dashboard-action-open").click();
  await expect(pageB.locator("#entity-list li")).toContainText("No entities.");

  await pageB.locator("#map-create").click();
  await expect(pageB.locator("#entity-list li")).toContainText("Entity 1");

  await expect(pageA.locator("#entity-list li")).toContainText("Entity 1");
  await expect(pageA.locator("#entity-list li")).toHaveCount(1);
  await expect(pageB.locator("#entity-list li")).toHaveCount(1);

  await context.close();
});

test("playtest viewport supports readable zoom presets", async ({ page }) => {
  await page.goto("/");
  await page.locator("#dashboard-action-open").click();
  await page.locator(".topbar button[data-command='play']").click();
  await expect(page.locator("#playtest-viewport")).toBeVisible();

  const widthAtFit = await page.evaluate(() => {
    const canvas = document.getElementById("playtest-viewport");
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error("playtest viewport canvas missing");
    }
    return Math.round(canvas.getBoundingClientRect().width);
  });
  expect(widthAtFit).toBeGreaterThanOrEqual(160);

  await page.locator("#playtest-zoom-4x").click();
  const widthAt4x = await page.evaluate(() => {
    const canvas = document.getElementById("playtest-viewport");
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error("playtest viewport canvas missing");
    }
    return Math.round(canvas.getBoundingClientRect().width);
  });
  expect(widthAt4x).toBe(640);
});

test("map editor supports zoom presets while keeping interaction layers scaled", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#dashboard-action-open").click();

  await page.locator("#map-create").click();
  await page.locator("#map-zoom-3x").click();

  const zoomScale = await page.evaluate(() => {
    const surface = document.querySelector(".canvas-surface");
    if (!(surface instanceof HTMLElement)) {
      throw new Error("canvas surface missing");
    }
    return surface.style.getPropertyValue("--map-zoom-scale");
  });
  expect(zoomScale).toBe("3");

  await page.locator("#map-zoom-1x").click();
  const zoomScale1x = await page.evaluate(() => {
    const surface = document.querySelector(".canvas-surface");
    if (!(surface instanceof HTMLElement)) {
      throw new Error("canvas surface missing");
    }
    return surface.style.getPropertyValue("--map-zoom-scale");
  });
  expect(zoomScale1x).toBe("1");
});

test("global window error is surfaced in issues drawer", async ({ page }) => {
  await page.goto("/");
  await page.locator("#dashboard-action-open").click();
  await page.locator("#right-tab-issues").click();

  await page.evaluate(() => {
    window.dispatchEvent(
      new window.ErrorEvent("error", {
        message: "simulated global crash",
        error: new Error("simulated global crash"),
      })
    );
  });

  await expect(page.locator("#issues-list")).toContainText(
    "Runtime error (window:error): simulated global crash"
  );
  await expect(page.locator("[data-issue-action='reload_editor']")).toBeVisible();
  await expect(page.locator("#log-lines")).toContainText(
    "Error (window:error): simulated global crash"
  );
});

test("unhandled rejection is surfaced in issues drawer", async ({ page }) => {
  await page.goto("/");
  await page.locator("#dashboard-action-open").click();
  await page.locator("#right-tab-issues").click();

  await page.evaluate(() => {
    Promise.reject(new Error("simulated unhandled rejection"));
  });

  await expect(page.locator("#issues-list")).toContainText(
    "Runtime error (window:unhandledrejection): simulated unhandled rejection"
  );
  await expect(page.locator("#log-lines")).toContainText(
    "Error (window:unhandledrejection): simulated unhandled rejection"
  );
});

// Test 1: exit is a hard barrier — overlay hides synchronously even when
// key-input async responses are still in flight.
test("zelda exit: overlay hides immediately with concurrent pending input", async ({ page }) => {
  await page.goto("/");
  await page.locator("#dashboard-action-open").click();
  await page.getByLabel("new-project-template").selectOption("rpg");
  await page.getByRole("button", { name: "New" }).click();
  await expect(page.locator("#entity-list")).toContainText("Player");

  await page.locator(".topbar button[data-command='play']").click();
  await expect(page.locator("#playtest-overlay")).toBeVisible();

  // Fire key inputs to create in-flight async mutations, then immediately exit
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Escape");

  // Hard-barrier: overlay must hide before backend round-trip completes
  await expect(page.locator("#playtest-overlay")).toBeHidden();
  await expect(page.locator("#hud-mode")).toContainText("Edit");
});

// Test 2: editor entity/tile state and export survive a full playtest cycle.
test("zelda loop: editor state survives playtest exit and export succeeds", async ({ page }) => {
  await page.goto("/");
  await page.locator("#dashboard-action-open").click();
  await page.getByLabel("new-project-template").selectOption("rpg");
  await page.getByRole("button", { name: "New" }).click();

  await expect(page.locator("#entity-list")).toContainText("Player");
  const preTileCount = await page.locator("#tile-layer .tile-cell").count();
  const preEntityCount = await page.locator("#entity-list li").count();
  expect(preTileCount).toBeGreaterThan(0);

  // Enter playtest, pause and step frames to verify physics ticks advance
  await page.locator(".topbar button[data-command='play']").click();
  await expect(page.locator("#playtest-overlay")).toBeVisible();
  await page.locator("#playtest-pause").click();
  await expect(page.locator("#playtest-pause")).toContainText("Resume");

  for (let i = 0; i < 4; i += 1) {
    await page.locator("#playtest-step").click();
  }

  const frameText = await page.locator("#playtest-metric-frame").textContent();
  const frame = Number.parseInt((frameText || "").replace(/[^\d]/g, ""), 10) || 0;
  expect(frame).toBeGreaterThanOrEqual(4);

  // Exit cleanly
  await page.keyboard.press("Escape");
  await expect(page.locator("#playtest-overlay")).toBeHidden();
  await expect(page.locator("#hud-mode")).toContainText("Edit");

  // Editor state must be intact after playtest exit (no entity or tile corruption)
  await expect(page.locator("#entity-list")).toContainText("Player");
  await expect(page.locator("#entity-list li")).toHaveCount(preEntityCount);
  await expect(page.locator("#tile-layer .tile-cell")).toHaveCount(preTileCount);

  // Export preview must succeed
  await page.locator("#right-tab-export").click();
  await page.locator("#export-run").click();
  await expect(page.locator("#log-lines")).toContainText("Export preview generated");
});

// Track C — Screen Transitions

test("scene panel supports add, switch, and remove", async ({ page }) => {
  await page.goto("/");
  await page.locator("#dashboard-action-open").click();
  await page.locator("#map-create").click();

  // Empty state
  await expect(page.locator("#scene-list .scene-empty")).toBeVisible();

  // Add first scene
  await page.locator("#scene-name-input").fill("dungeon");
  await page.locator("#scene-add-btn").click();
  await expect(page.locator("#scene-list .scene-empty")).toBeHidden();
  const sceneItems = page.locator("#scene-list li.scene-item");
  await expect(sceneItems).toHaveCount(1);
  await expect(sceneItems.first()).toContainText("dungeon");

  // Add second scene
  await page.locator("#scene-name-input").fill("overworld");
  await page.locator("#scene-add-btn").click();
  await expect(sceneItems).toHaveCount(2);

  // Switch to second scene
  await sceneItems.nth(1).locator(".scene-select-btn").click();
  await expect(sceneItems.nth(1)).toHaveClass(/active/);

  // Remove first scene
  await sceneItems.first().locator(".scene-remove-btn").click();
  await expect(sceneItems).toHaveCount(1);
  await expect(sceneItems.first()).toContainText("overworld");
});

test("transition overlay activates and deactivates via bridge", async ({ page }) => {
  await page.goto("/");
  await page.locator("#dashboard-action-open").click();
  await page.locator("#map-create").click();

  // Bridge must be available after workspace init.
  await expect
    .poll(() => page.evaluate(() => typeof window.__canvasBridge?.forceTransition))
    .toBe("function");

  // No overlay visible by default.
  const initialVisible = await page.evaluate(() => window.__canvasBridge.isTransitionVisible());
  expect(initialVisible).toBe(false);

  // Force opacity=0.5 — overlay should appear.
  await page.evaluate(() => window.__canvasBridge.forceTransition(0.5));
  const afterActivate = await page.evaluate(() => window.__canvasBridge.isTransitionVisible());
  expect(afterActivate).toBe(true);

  const opacity = await page.evaluate(
    () => parseFloat(document.querySelector(".transition-overlay")?.style.opacity || "-1"),
  );
  expect(opacity).toBeCloseTo(0.5, 1);

  // Force opacity=0 — overlay should hide.
  await page.evaluate(() => window.__canvasBridge.forceTransition(0));
  const afterDeactivate = await page.evaluate(() => window.__canvasBridge.isTransitionVisible());
  expect(afterDeactivate).toBe(false);
});
