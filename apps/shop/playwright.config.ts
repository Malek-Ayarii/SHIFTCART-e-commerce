import { defineConfig, devices } from "@playwright/test";

/**
 * E2E (optional, not part of `pnpm test`): `pnpm test:e2e`.
 * Starts a mock of apps/api on :8099 and the shop dev server on :3100 pointing at it.
 */
const SHOP_PORT = 3100;
const API_PORT = 8099;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${SHOP_PORT}`,
    trace: "retain-on-failure",
    // Optional: reuse an already installed Chromium instead of `npx playwright install`.
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: [
    {
      command: "node tests/e2e/mock-api.mjs",
      port: API_PORT,
      env: { MOCK_API_PORT: String(API_PORT) },
      reuseExistingServer: false,
    },
    {
      command: `next dev --port ${SHOP_PORT}`,
      port: SHOP_PORT,
      timeout: 120_000,
      env: { API_URL: `http://localhost:${API_PORT}`, NEXT_PUBLIC_WHATSAPP_NUMBER: "21600000000" },
      reuseExistingServer: false,
    },
  ],
});
