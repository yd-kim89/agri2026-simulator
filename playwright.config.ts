import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E 설정 — agri2026 매입 시뮬레이터 (overedge)
 * PRD v6-sync 기준 QA. 실패 시 screenshot·video·trace 저장(docs/test 증거).
 * 데스크톱 + 모바일(375px) 프로젝트. dev 서버 자동 기동.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: /staging-.*\.spec\.ts/, // mutation 테스트는 스테이징 전용 config로만 실행(prod 오염 방지)
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["list"],
    ["html", { outputFolder: "docs/test/playwright-report", open: "never" }],
    ["json", { outputFile: "docs/test/results.json" }],
  ],
  outputDir: "docs/test/test-results",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 5"] }, // 393x851 근사 모바일
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
