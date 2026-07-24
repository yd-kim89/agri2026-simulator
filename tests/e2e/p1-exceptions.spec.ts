import { test, expect } from "@playwright/test";
import { captureConsole, gotoTab } from "./helpers";

/**
 * P1 — 예외·경계·탐색. PRD v6-sync §3 BR-3,5,8,10.
 * 잘못된 입력·빈 값·graceful degradation·새로고침·데이터 없음·마진·직거래.
 */

test.describe("P1 예외·탐색", () => {
  test("P1-1 잘못된/빈 수량: 방어적 기본값으로 크래시 없이 결과 [BR-7]", async ({ page, request }) => {
    const errors = captureConsole(page);
    await page.goto("/");
    await gotoTab(page, "시뮬레이터");

    // 수량 필드를 비우고 실행 → parseFloat||1 방어 → 결과 렌더(크래시 없음)
    const qty = page.getByRole("textbox").first();
    await qty.fill("");
    await page.getByRole("button", { name: "시뮬레이션 실행" }).last().click();
    await expect(page.getByText("시나리오 ①", { exact: true })).toBeVisible();

    // API 경계: 음수·문자 → 400
    const neg = await request.post("/api/simulate", { data: { item: "양파", quantity: -5 } });
    expect(neg.status()).toBe(400);
    const nan = await request.post("/api/simulate", { data: { item: "양파", quantity: "abc" } });
    expect(nan.status()).toBe(400);

    expect(errors, errors.join("\n")).toHaveLength(0);
  });

  test("P1-2 새로고침: SPA 상태 초기화 → 시세보드로 복귀(오류 아님)", async ({ page }) => {
    await page.goto("/");
    await gotoTab(page, "농가 직거래");
    await expect(page.getByRole("heading", { name: "누구에게 살까." })).toBeVisible();
    // 새로고침
    await page.reload();
    // 기본 탭(시세보드)로 복귀
    await expect(page.getByRole("heading", { name: "오늘, 뭘 사야 유리한가." })).toBeVisible();
  });

  test("P1-3 탭 내비게이션 무결: 전 화면 순회 후 복귀", async ({ page }) => {
    const errors = captureConsole(page);
    await page.goto("/");
    await gotoTab(page, "시뮬레이터");
    await expect(page.getByRole("heading", { name: "살까, 기다릴까." })).toBeVisible();
    await gotoTab(page, "이력·검증");
    await expect(page.getByText("이번 달 누적 절감액")).toBeVisible();
    await gotoTab(page, "농가 직거래");
    await expect(page.getByRole("heading", { name: "누구에게 살까." })).toBeVisible();
    await gotoTab(page, "로그인");
    await expect(page.getByRole("heading", { name: /비밀번호 없이|내 계정/ })).toBeVisible();
    await gotoTab(page, "시세보드");
    await expect(page.getByRole("heading", { name: "오늘, 뭘 사야 유리한가." })).toBeVisible();
    expect(errors, errors.join("\n")).toHaveLength(0);
  });

  test("P1-4 graceful degradation: 참고값 모드 배너 + 시뮬레이션 지속 [BR-8]", async ({ page }) => {
    const errors = captureConsole(page);
    await page.goto("/");
    // 글로벌 내비 "상태" 토글 → apiDown
    await page.getByRole("button", { name: "상태" }).click();
    await expect(page.getByText("참고값 모드", { exact: true })).toBeVisible();
    await expect(page.getByText(/예측 서버 연결 실패/)).toBeVisible();

    // apiDown 상태에서 시뮬레이션 실행 → 여전히 동작, 시나리오 ② 참고용
    await gotoTab(page, "시뮬레이터");
    await page.getByRole("button", { name: /양파 200kg/ }).click();
    await expect(page.getByText("시나리오 ②", { exact: true })).toBeVisible();
    await expect(page.getByText("참고용 — 신뢰도 최저 등급")).toBeVisible();
    expect(errors, errors.join("\n")).toHaveLength(0);
  });

  test("P1-5 마진 계산: 판매 예정가 입력 시 마진율 표시 [BR-5]", async ({ page }) => {
    await page.goto("/");
    await gotoTab(page, "시뮬레이터");
    // 사과 선택(4번째 칩)
    await page.getByRole("button", { name: "사과", exact: true }).click();
    // 입력칸 순서: 0=수량 · 1=매입예정일(date) · 2=판매예정가
    const inputs = page.getByRole("textbox");
    await inputs.nth(0).fill("20"); // 수량
    await inputs.nth(2).fill("60000"); // 판매 예정가
    await page.getByRole("button", { name: "시뮬레이션 실행" }).last().click();
    await expect(page.getByText(/판매가 대비 마진 \d+%/).first()).toBeVisible();
  });

  test("P1-6 직거래: 도매 vs 직거래 비교 + 견적 요청 + 파트너 미모집 [BR-10]", async ({ page }) => {
    const errors = captureConsole(page);
    await page.goto("/");
    await gotoTab(page, "농가 직거래");
    // 기본 배추 → 정직성 배지 상시
    await expect(page.getByText("거래 기능 개발 중 · 시나리오 값")).toBeVisible();
    // 도매 vs 직거래 2-컬럼 (도매 컬럼 제목은 div — heading 아님)
    await expect(page.getByText("도매 즉시매입")).toBeVisible();
    // 견적 요청 → 전송 확인
    await page.getByRole("button", { name: "직납 견적 요청" }).click();
    await expect(page.getByText(/견적 요청 전송됨/)).toBeVisible();

    // 감자 = direct null → 파트너 모집 중 (데이터 없는 경우)
    await page.getByRole("button", { name: "감자", exact: true }).click();
    await expect(page.getByText("이 품목은 아직 직거래 파트너 모집 중")).toBeVisible();
    expect(errors, errors.join("\n")).toHaveLength(0);
  });

  test("P1-7 이력·검증: 누적 절감액 + 판정 필터 [BR-10]", async ({ page }) => {
    const errors = captureConsole(page);
    await page.goto("/");
    await gotoTab(page, "이력·검증");
    await expect(page.getByText("이번 달 누적 절감액")).toBeVisible();
    // 데모 누적 절감액 ₩163,800
    await expect(page.getByText("₩163,800")).toBeVisible();
    // 필터: 적중만
    await page.getByRole("button", { name: "적중", exact: true }).click();
    // 데모 배지(라이브/데모 구분) 존재
    await expect(page.getByText("데모").first()).toBeVisible();
    // 필터 "빗나감" 전환
    await page.getByRole("button", { name: "빗나감", exact: true }).click();
    await expect(page.getByText("사과 10상자")).toBeVisible();
    expect(errors, errors.join("\n")).toHaveLength(0);
  });

  test("P1-8 양파(none) 이벤트: 시나리오 ③ '해당 없음' [BR-3]", async ({ page }) => {
    await page.goto("/");
    await gotoTab(page, "시뮬레이터");
    await page.getByRole("button", { name: /양파 200kg/ }).click();
    await expect(page.getByText("시나리오 ③", { exact: true })).toBeVisible();
    await expect(page.getByText("해당 없음")).toBeVisible();
  });

  test("P1-9 근거 펼침: 시나리오 카드 근거 보기 토글", async ({ page }) => {
    await page.goto("/");
    await gotoTab(page, "시뮬레이터");
    await page.getByRole("button", { name: /배추 100kg/ }).click();
    await expect(page.getByText("시나리오 ①", { exact: true })).toBeVisible();
    // 첫 카드 근거 보기
    await page.getByRole("button", { name: /근거 보기/ }).first().click();
    await expect(page.getByText(/가락시장 경락 기반/)).toBeVisible();
  });
});
