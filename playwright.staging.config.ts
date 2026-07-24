import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright STAGING 설정 — Vercel Preview(스테이징 Supabase 연동) 대상.
 * 원격 preview URL에 직접 접속(webServer 없음). mutation 테스트 포함.
 * 케이스별 video·screenshot·trace를 항상 저장(교육자료용).
 *
 * 필수 env:
 *   STAGING_URL                     Vercel Preview 배포 URL (예: https://agri2026-simulator-git-staging-xxx.vercel.app)
 * 선택 env:
 *   VERCEL_AUTOMATION_BYPASS_SECRET 배포 보호가 켜진 경우에만 필요(overedge는 보호 OFF라 불필요)
 */
const STAGING_URL = process.env.STAGING_URL || "http://localhost:3000";
const BYPASS = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /staging-.*\.spec\.ts/,
  fullyParallel: false, // mutation 순서 관찰 위해 직렬
  workers: 1,
  retries: 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: "docs/test/staging-report", open: "never" }],
    ["json", { outputFile: "docs/test/staging-results.json" }],
  ],
  outputDir: "docs/test/staging-artifacts",
  timeout: 45_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: STAGING_URL,
    trace: "on",
    screenshot: "on",
    video: "on", // 케이스별 영상 항상 저장
    actionTimeout: 15_000,
    ...(BYPASS
      ? { extraHTTPHeaders: { "x-vercel-protection-bypass": BYPASS } }
      : {}),
  },
  projects: [
    {
      name: "staging-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
});
