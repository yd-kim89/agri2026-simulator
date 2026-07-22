// 브라우저 전용 Supabase 클라이언트 — Auth(매직링크) + 본인 이력(RLS, 멀티세션)
// 원칙(PRD graceful degradation): env 없으면 null — 앱은 정상 동작, 로그인·계정 이력만 비활성.
// 서버(API 라우트)는 lib/supabase.ts(익명 로그)를 계속 사용한다 — 역할 분리.
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { HistoryRow, SimLogPayload } from "@/lib/supabase";

let browserClient: SupabaseClient | null = null;

/** 브라우저 싱글턴. SSR 중이거나 env 없으면 null. */
export function getBrowserSupabase(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!browserClient) browserClient = createClient(url, key);
  return browserClient;
}

/** 매직링크 발송 (S-004). 에러는 원문 그대로 반환 — 뭉뚱그린 메시지 금지(PRD 08절). */
export async function sendMagicLink(
  email: string,
): Promise<{ ok: boolean; reason?: string }> {
  const sb = getBrowserSupabase();
  if (!sb) return { ok: false, reason: "Supabase 미연결 (env 미설정)" };
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}

/** 로그인 사용자의 시뮬레이션 기록 저장 — owner = auth.uid() (RLS 검증). */
export async function logMySimulation(
  payload: SimLogPayload,
  ownerId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const sb = getBrowserSupabase();
  if (!sb) return { ok: false, reason: "supabase-disabled" };
  try {
    const { error } = await sb.from("simulation_log").insert({
      item_code: payload.item_code,
      item_name: payload.item_name,
      quantity: payload.quantity,
      target_date: payload.target_date || null,
      best_scenario: payload.best_scenario,
      scenarios: payload.scenarios,
      user_id: payload.user_id,
      owner: ownerId,
    });
    if (error) return { ok: false, reason: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
}

/** 내 기록만 조회 (멀티세션 — 어느 기기에서든 같은 계정이면 같은 기록). */
export async function getMyHistory(): Promise<{
  rows: HistoryRow[];
  count: number;
}> {
  const sb = getBrowserSupabase();
  if (!sb) return { rows: [], count: 0 };
  try {
    const { data, error, count } = await sb
      .from("simulation_log")
      .select(
        "id,item_name,quantity,best_scenario,scenarios,target_date,created_at",
        { count: "exact" },
      )
      .not("owner", "is", null) // RLS가 본인 행만 통과시키지만 의도를 명시
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return { rows: [], count: 0 };
    return { rows: (data as HistoryRow[]) || [], count: count ?? 0 };
  } catch {
    return { rows: [], count: 0 };
  }
}
