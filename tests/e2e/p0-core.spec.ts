import { test, expect } from "@playwright/test";
import { captureConsole, gotoTab } from "./helpers";

/**
 * P0 — 핵심 기능 (배포 판정의 기준). PRD v6-sync §3 BR-1~BR-9.
 * 단순 렌더 확인이 아니라 "사용자가 실제로 업무를 완료하는가"를 검증한다.
 */

test.describe("P0 핵심", () => {
  test("P0-1 시세보드: 액션 스트립 + 19품목 그리드 로드 (핵심 데이터 표시) [BR-10]", async ({ page }) => {
    const errors = captureConsole(page);
    await page.goto("/");

    // 히어로
    await expect(page.getByRole("heading", { name: "오늘, 뭘 사야 유리한가." })).toBeVisible();
    // 액션 스트립 3종
    await expect(page.getByText("오늘의 매입 기회 TOP3")).toBeVisible();
    await expect(page.getByText("급등 주의")).toBeVisible();
    await expect(page.getByText("명절 경보")).toBeVisible();
    // 하락 TOP3 실측 품목(대파 -7.1% 최상단)
    await expect(page.getByText("대파").first()).toBeVisible();
    // 19품목 그리드 섹션
    await expect(page.getByRole("heading", { name: "19품목 도매시세" })).toBeVisible();
    // 그리드에 대표 품목 존재
    for (const name of ["배추", "양파", "사과", "건고추"]) {
      await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
    }
    expect(errors, errors.join("\n")).toHaveLength(0);
  });

  test("P0-2 시뮬레이터: 배추 100kg 실행 → 3-시나리오 + 최유리 + 배추 역방향 억제 [BR-1,BR-4]", async ({ page }) => {
    const errors = captureConsole(page);
    await page.goto("/");
    await gotoTab(page, "시뮬레이터");
    await expect(page.getByRole("heading", { name: "살까, 기다릴까." })).toBeVisible();

    // 예시 버튼으로 배추 100kg 실행 (핵심 업무 흐름)
    await page.getByRole("button", { name: /배추 100kg/ }).click();

    // 결과 판정 — 배추 today854<f7 1150 → 오늘 사세요 (BR-4)
    await expect(page.getByRole("heading", { name: /오늘 사세요/ })).toBeVisible();

    // 3-시나리오 카드
    await expect(page.getByText("시나리오 ①", { exact: true })).toBeVisible();
    await expect(page.getByText("시나리오 ②", { exact: true })).toBeVisible();
    await expect(page.getByText("시나리오 ③", { exact: true })).toBeVisible();
    // 최유리 배지
    await expect(page.getByText("최유리")).toBeVisible();

    // BR-1: 배추 역방향 — 시나리오 ③ "선매입 억제"(delta 라벨), 금액 미표시(—)
    await expect(page.getByText("선매입 억제", { exact: true })).toBeVisible();

    // BR-6: 배추 conf=2 → 시나리오 ② 참고용 워터마크
    await expect(page.getByText("참고용 — 신뢰도 최저 등급")).toBeVisible();

    expect(errors, errors.join("\n")).toHaveLength(0);
  });

  test("P0-3 급등 로직: 명절경보 → 사과 선매입 → 시나리오 ③ 절감액 양수 [BR-2]", async ({ page }) => {
    const errors = captureConsole(page);
    await page.goto("/");
    // 시세보드 명절 경보의 "선매입 시뮬레이션 ›" (onSim(3)=사과)
    await page.getByRole("button", { name: /선매입 시뮬레이션/ }).click();

    // 사과 결과로 이동
    await expect(page.getByText(/사과/).first()).toBeVisible();
    await expect(page.getByText("시나리오 ③", { exact: true })).toBeVisible();
    // BR-2: surge → "예상 절감 +N원"
    await expect(page.getByText(/예상 절감 \+[\d,]+원/)).toBeVisible();
    // 권고 note
    await expect(page.getByText(/선매입 권고/)).toBeVisible();

    expect(errors, errors.join("\n")).toHaveLength(0);
  });

  test("P0-4 API 계약: POST /api/simulate 정상 스키마 + 경계 오류 [BR-7]", async ({ request }) => {
    // 정상
    const ok = await request.post("/api/simulate", {
      data: { item: "배추", quantity: 100 },
    });
    expect(ok.status()).toBe(200);
    const body = await ok.json();
    expect(body.item).toBe("배추");
    expect(body.best_scenario).toBe("buy_today");
    expect(Array.isArray(body.scenarios)).toBe(true);
    expect(body.scenarios).toHaveLength(3);
    // LLM-friendly 필수 필드
    expect(body.scenarios[0]).toHaveProperty("confidence_grade");
    expect(body.scenarios[0]).toHaveProperty("unit", "KRW");
    expect(body.scenarios[0]).toHaveProperty("recommendation");

    // 잘못된 품목 → 404
    const notFound = await request.post("/api/simulate", {
      data: { item: "돌멩이", quantity: 10 },
    });
    expect(notFound.status()).toBe(404);

    // item 누락 → 400
    const noItem = await request.post("/api/simulate", { data: { quantity: 10 } });
    expect(noItem.status()).toBe(400);

    // quantity ≤ 0 → 400
    const badQty = await request.post("/api/simulate", {
      data: { item: "배추", quantity: 0 },
    });
    expect(badQty.status()).toBe(400);

    // 잘못된 JSON → 400
    const badJson = await request.post("/api/simulate", {
      headers: { "Content-Type": "application/json" },
      data: "not json{",
    });
    expect(badJson.status()).toBe(400);
  });

  test("P0-5 인증: 로그인 화면 렌더 + 이메일 형식 검증 (실제 발송 없음) [BR-9]", async ({ page }) => {
    const errors = captureConsole(page);
    await page.goto("/");
    await gotoTab(page, "로그인");

    // Supabase 연결 환경 → 매직링크 폼 노출
    await expect(page.getByText("매직링크 로그인")).toBeVisible();
    const emailInput = page.getByPlaceholder("you@example.com");
    await expect(emailInput).toBeVisible();

    // 잘못된 형식 → 클라이언트 검증 에러 (네트워크 호출 전 → 이메일 미발송)
    await emailInput.fill("notanemail");
    await page.getByRole("button", { name: "매직링크 받기" }).click();
    await expect(page.getByText("이메일 형식을 확인해 주세요")).toBeVisible();

    // 발송 성공 화면("메일함을 확인해 주세요")이 뜨지 않았는지 = 실제 발송 안 됨 확인
    await expect(page.getByText("메일함을 확인해 주세요")).toHaveCount(0);

    expect(errors, errors.join("\n")).toHaveLength(0);
  });
});
