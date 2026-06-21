import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  webServer: {
    command: "npm run dev:local",
    url: "http://127.0.0.1:3000/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  use: {
    baseURL: process.env.BASE_URL ?? "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium-desktop",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 960 },
        storageState: "e2e/.auth/admin.json",
      },
    },
    {
      name: "chromium-mobile",
      dependencies: ["setup"],
      use: {
        ...devices["Pixel 5"],
        storageState: "e2e/.auth/admin.json",
      },
    },
  ],
});
