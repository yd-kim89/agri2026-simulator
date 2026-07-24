import { test, expect } from "@playwright/test";

/**
 * STAGING MUTATION 테스트 — 스테이징 Supabase에 실제 write가 일어나는 경로만 검증.
 * (prod DB 오염 없이) 익명 시뮬레이션 → simulation_log INSERT → /api/history 로 read-back.
 * 로그인 계정 write(매직링크)는 실제 이메일 발송 제외 항목이라 범위 밖.
 *
 * playwright.staging.config.ts 로 실행: STAGING_URL 필수.
 */

test.describe("STAGING mutation (스테이징 DB write 검증)", () => {
  test("M-1 API 시뮬레이션 → simulation_log INSERT (logged:true)", async ({ request }) => {
    const res = await request.post("/api/simulate", {
      data: { item: "대파", quantity: 77, target_date: "2026-09-01" },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.item).toBe("대파");
    // 스테이징 Supabase 연결 시 서버 로그 기록 성공 → logged:true
    expect(body.logged, "스테이징 Supabase 미연결이면 logged=false — env 확인 필요").toBe(true);
  });

  test("M-2 /api/history read-back — 방금 넣은 익명 기록이 조회됨", async ({ request }) => {
    // 사전 카운트
    const before = await (await request.get("/api/history")).json();
    expect(before.enabled).toBe(true);
    const beforeCount = before.count ?? 0;

    // 고유 수량으로 mutation
    const uniqQty = 313;
    const post = await request.post("/api/simulate", {
      data: { item: "양파", quantity: uniqQty },
    });
    expect((await post.json()).logged).toBe(true);

    // read-back — 카운트 증가 + 해당 행 존재 (익명 owner-null RLS 통과)
    await expect
      .poll(async () => {
        const h = await (await request.get("/api/history")).json();
        return h.count ?? 0;
      }, { timeout: 15_000 })
      .toBeGreaterThan(beforeCount);

    const after = await (await request.get("/api/history")).json();
    const found = (after.rows || []).some(
      (r: { item_name: string; quantity: number }) =>
        r.item_name === "양파" && Number(r.quantity) === uniqQty,
    );
    expect(found, "방금 INSERT한 양파 313 기록이 read-back되어야 함").toBe(true);
  });

  test("M-3 UI 익명 시뮬레이션 → 이력 탭에 라이브 기록 노출", async ({ page }) => {
    await page.goto("/");
    // 시뮬레이터 → 배추 예시 실행 (write 발생)
    await page.getByRole("button", { name: "시뮬레이터", exact: true }).click();
    await page.getByRole("button", { name: /배추 100kg/ }).click();
    await expect(page.getByText("시나리오 ①", { exact: true })).toBeVisible();

    // 이력·검증 탭 → Supabase 연동 + 라이브 배지
    await page.getByRole("button", { name: "이력·검증", exact: true }).click();
    await expect(page.getByText(/Supabase 연동 · 라이브 기록/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("라이브").first()).toBeVisible();
  });
});
