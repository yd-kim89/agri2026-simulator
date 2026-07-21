// Supabase 연동 — 이력 저장(simulation_log)
// 원칙(PRD graceful degradation): env 없으면 no-op. 앱은 정상 동작, 이력 저장만 비활성.
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;
if (url && key) {
  client = createClient(url, key);
}

export const isSupabaseEnabled = !!client;

export interface SimLogPayload {
  item_code: string;
  item_name: string;
  quantity: number;
  target_date: string;
  best_scenario: string;
  scenarios: unknown;
  user_id: string;
}

/** 시뮬레이션 실행 로그 저장. 실패해도 예외를 던지지 않음(도구 신뢰 우선). */
export async function logSimulation(
  payload: SimLogPayload,
): Promise<{ ok: boolean; reason?: string }> {
  if (!client) return { ok: false, reason: "supabase-disabled" };
  try {
    const { error } = await client.from("simulation_log").insert({
      item_code: payload.item_code,
      item_name: payload.item_name,
      quantity: payload.quantity,
      target_date: payload.target_date || null,
      best_scenario: payload.best_scenario,
      scenarios: payload.scenarios,
      user_id: payload.user_id,
    });
    if (error) return { ok: false, reason: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
}
