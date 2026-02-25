import { expect, test } from "@playwright/test";

test.describe("visual shell baseline @visual", () => {
  test.use({
    viewport: { width: 1440, height: 900 },
  });

  test("topbar and workspace shell remain visually stable", async ({ page }) => {
    await page.goto("/");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.getByRole("button", { name: "Open" }).click();

    await expect(page.locator(".topbar")).toBeVisible();
    await expect(page.locator(".topbar")).toHaveScreenshot("topbar.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.015,
    });

    await expect(page.locator(".canvas-area")).toBeVisible();
    await expect(page.locator(".canvas-area")).toHaveScreenshot("canvas-area.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.02,
    });
  });

  test("issues drawer visual severity rows stay readable", async ({ page }) => {
    await page.goto("/");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.getByRole("button", { name: "Open" }).click();
    await page.getByLabel("ui-profile-select").selectOption("builder");
    await page.getByLabel("new-project-template").selectOption("blank");
    await page.getByRole("button", { name: "New" }).click();
    await page.locator("#right-tab-draw").click();

    await page.getByLabel("draw-assisted-primitive-select", { exact: true }).selectOption("chest");
    await page.getByLabel("draw-assisted-profile-select", { exact: true }).selectOption("snes");
    await page.locator("#draw-seed-preset-line").click();
    await page.getByLabel("draw-seed-preset-name").fill("visual_line_pack");
    await page.locator("#draw-seed-preset-save").click();
    await page.locator("#draw-seed-preset-export").click();
    await page
      .getByLabel("draw-seed-preset-json")
      .fill(
        '{"schema_id":"gcs.draw_seed_preset","schema_version":1,"name":"visual_line_pack","points":[{"x":99,"y":-5,"foo":1}],"mystery_key":true}'
      );
    await page.locator("#draw-seed-preset-import").click();

    await expect(page.locator("#issues-list")).toContainText(
      "Preset import warning: unknown top-level key(s): mystery_key."
    );

    await page.locator("#right-tab-issues").click();
    await expect(page.locator(".right-panel .issues")).toHaveScreenshot(
      "issues-drawer-severity.png",
      {
        animations: "disabled",
        caret: "hide",
        maxDiffPixelRatio: 0.02,
      }
    );
  });

  test("light theme compact density keeps topbar and canvas readable", async ({ page }) => {
    await page.goto("/");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.getByRole("button", { name: "Open" }).click();

    await page.getByLabel("theme-select").selectOption("light");
    await page.getByLabel("density-select").selectOption("compact");

    await expect(page.locator(".topbar")).toHaveScreenshot("topbar-light-compact.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.02,
    });
    await expect(page.locator(".canvas-area")).toHaveScreenshot("canvas-light-compact.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.025,
    });
  });

  test("high contrast compact density keeps issue semantics legible", async ({ page }) => {
    await page.goto("/");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.getByRole("button", { name: "Open" }).click();
    await page.getByLabel("ui-profile-select").selectOption("builder");

    await page.getByLabel("theme-select").selectOption("dark_high_contrast");
    await page.getByLabel("density-select").selectOption("compact");

    await page.getByLabel("new-project-template").selectOption("blank");
    await page.getByRole("button", { name: "New" }).click();
    await page.locator("#right-tab-draw").click();
    await page.getByLabel("draw-assisted-primitive-select", { exact: true }).selectOption("chest");
    await page.getByLabel("draw-assisted-profile-select", { exact: true }).selectOption("snes");
    await page.locator("#draw-seed-preset-line").click();
    await page.getByLabel("draw-seed-preset-name").fill("visual_line_pack_hc");
    await page.locator("#draw-seed-preset-save").click();
    await page.locator("#draw-seed-preset-export").click();
    await page
      .getByLabel("draw-seed-preset-json")
      .fill(
        '{"schema_id":"gcs.draw_seed_preset","schema_version":1,"name":"visual_line_pack_hc","points":[{"x":99,"y":-5,"foo":1}],"mystery_key":true}'
      );
    await page.locator("#draw-seed-preset-import").click();
    await page.locator("#right-tab-issues").click();

    await expect(page.locator(".right-panel .issues")).toHaveScreenshot(
      "issues-drawer-high-contrast-compact.png",
      {
        animations: "disabled",
        caret: "hide",
        maxDiffPixelRatio: 0.025,
      }
    );
  });
});

test.describe("visual shell responsive baseline @visual", () => {
  test("mid-width layout keeps canvas and right panel readable", async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 900 });
    await page.goto("/");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.getByRole("button", { name: "Open" }).click();
    await page.getByLabel("ui-profile-select").selectOption("builder");
    await page.getByLabel("theme-select").selectOption("light");
    await page.getByLabel("density-select").selectOption("compact");

    await expect(page.locator(".canvas-area")).toHaveScreenshot("canvas-midwidth-light-compact.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.03,
    });
    await expect(page.locator(".right-panel")).toHaveScreenshot("right-panel-midwidth-light-compact.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.03,
    });
  });

  test("narrow-width layout keeps topbar actions and tabs legible", async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 900 });
    await page.goto("/");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.getByRole("button", { name: "Open" }).click();
    await page.getByLabel("ui-profile-select").selectOption("builder");
    await page.getByLabel("theme-select").selectOption("dark_high_contrast");
    await page.getByLabel("density-select").selectOption("compact");

    await expect(page.locator(".topbar .actions")).toHaveScreenshot("topbar-actions-narrow-high-contrast-compact.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.03,
    });
    await expect(page.locator("#right-panel-tabs")).toHaveScreenshot("right-tabs-narrow-high-contrast-compact.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.03,
    });
  });
});
