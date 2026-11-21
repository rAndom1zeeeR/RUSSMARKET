import { defineConfig, devices } from "@playwright/test";
import { BASE_URL, DATABASE_URL, PORT } from "./e2e/support/env";

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e",
  // Один общий сервер и одна БД: тесты идут по очереди, каждый начинает со свежего сидера.
  fullyParallel: false,
  workers: 1,
  retries: isCI ? 1 : 0,
  forbidOnly: isCI,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Локально берём установленный Chrome (ничего не скачиваем); в CI — Chromium от Playwright.
    channel: isCI ? undefined : "chrome",
  },
  projects: [
    {
      name: "desktop",
      testIgnore: /mobile\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        channel: isCI ? undefined : "chrome",
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "mobile",
      testMatch: /mobile\.spec\.ts/,
      use: { ...devices["Pixel 5"], channel: isCI ? undefined : "chrome", viewport: { width: 320, height: 640 } },
    },
  ],
  webServer: {
    // Production-сборка: без dev-оверлея Next, который перехватывал бы клики. БД — отдельная, e2e.db.
    command: `pnpm exec tsx e2e/support/prepare-db.ts && pnpm build && pnpm exec next start -p ${PORT}`,
    url: BASE_URL,
    timeout: 300_000,
    reuseExistingServer: !isCI,
    env: { DATABASE_URL },
  },
});
