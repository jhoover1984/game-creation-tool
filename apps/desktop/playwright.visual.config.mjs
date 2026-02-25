import { defineConfig, devices } from "@playwright/test";

const port = "4174";
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests-e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: "node scripts/static-server.mjs",
    env: {
      GCS_STATIC_PORT: port,
    },
    url: baseURL,
    reuseExistingServer: false,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
