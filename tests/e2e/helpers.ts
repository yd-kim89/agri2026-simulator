import { Page, TestInfo } from "@playwright/test";

/**
 * 콘솔 오류·페이지 예외 수집기. 각 테스트에서 attach 후 종료 시 assert.
 * favicon/매니페스트 등 무해한 리소스 404는 제외한다(오탐 방지).
 */
export function captureConsole(page: Page) {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (/favicon|manifest\.json|apple-touch-icon/i.test(text)) return;
    // Next.js dev 오버레이의 리소스 404는 앱 결함이 아님
    if (/Failed to load resource.*404/i.test(text) && /favicon/i.test(text)) return;
    errors.push(`[console.error] ${text}`);
  });
  page.on("pageerror", (err) => {
    errors.push(`[pageerror] ${err.message}`);
  });
  return errors;
}

/** 서브내비 탭 전환 (조건부 렌더라 활성 탭만 DOM에 존재). */
export async function gotoTab(
  page: Page,
  name: "시세보드" | "시뮬레이터" | "이력·검증" | "농가 직거래" | "로그인",
) {
  await page.getByRole("button", { name, exact: true }).click();
}
