import { test, expect } from "@playwright/test";

test("desktop runtime bridge uses invoke_command path in browser flow", async ({ page }) => {
  await page.addInitScript(() => {
    const invokeCalls = [];
    window.__TAURI_INVOKE_CALLS__ = invokeCalls;
    window.__TAURI__ = {
      core: {
        invoke: async (commandName, payload) => {
          invokeCalls.push({ commandName, payload });
          if (commandName !== "invoke_command") {
            throw new Error(`unexpected command name: ${commandName}`);
          }

          const command = payload?.command;
          if (command === "open_project") {
            return JSON.stringify({
              manifest: { project_schema_version: 1, name: "Desktop Runtime Project" },
              health: { warnings: [], near_limits: [], missing_assets: [], trashed_refs: [] },
              migration_report: null,
            });
          }

          if (command === "editor_state") {
            return JSON.stringify({
              entities: [],
              tiles: [],
              selection: [],
              watch_flags: [],
              watch_selected_flags: [],
              watch_variables: [],
              watch_selected_variables: [],
              watch_inventory: [],
              watch_selected_inventory: [],
              playtest_breakpoints: [],
              playtest_trace: [],
              playtest: {
                active: false,
                paused: false,
                speed: 1,
                frame: 0,
                trace_enabled: false,
                last_tick_delta_ms: 0,
                last_tick_steps: 0,
              },
              can_undo: false,
              can_redo: false,
              last_breakpoint_hit: null,
            });
          }

          return JSON.stringify({
            entities: [],
            tiles: [],
            selection: [],
            watch_flags: [],
            watch_selected_flags: [],
            watch_variables: [],
            watch_selected_variables: [],
            watch_inventory: [],
            watch_selected_inventory: [],
            playtest_breakpoints: [],
            playtest_trace: [],
            playtest: {
              active: false,
              paused: false,
              speed: 1,
              frame: 0,
              trace_enabled: false,
              last_tick_delta_ms: 0,
              last_tick_steps: 0,
            },
            can_undo: false,
            can_redo: false,
            last_breakpoint_hit: null,
          });
        },
      },
    };
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Open" }).click();

  await expect(page.locator(".canvas-header h1")).toContainText("Desktop Runtime Project");
  await expect(page.locator("#health-summary")).toContainText("Healthy project state.");

  const commands = await page.evaluate(() =>
    (window.__TAURI_INVOKE_CALLS__ || []).map((entry) => entry.payload?.command)
  );
  expect(commands).toContain("open_project");
  expect(commands).toContain("editor_state");
});
