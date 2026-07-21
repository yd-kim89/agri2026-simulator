// POST /api/simulate — 3-시나리오 시뮬레이션 (LLM-Friendly JSON, PRD 08절)
// 이중 페르소나: 사람 화면과 AI 에이전트가 동일 응답 소비. MCP 도구 등록 가능 구조.
import { NextRequest, NextResponse } from "next/server";
import { simulate, toLlmSchema, ITEM_CODES } from "@/lib/simulate";
import { logSimulation, isSupabaseEnabled } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    service: "agri2026 매입 시뮬레이터 API",
    version: "3.0.0",
    usage: "POST { item, quantity, target_date?, sale_price? }",
    items: ITEM_CODES,
    supabase_logging: isSupabaseEnabled,
    confidence_scale: "1(낮음)~5(높음)",
  });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const item = String(body.item ?? "");
  const quantity = Number(body.quantity ?? 0);
  const targetDate = body.target_date ? String(body.target_date) : "";
  const salePrice =
    body.sale_price != null && body.sale_price !== ""
      ? Number(body.sale_price)
      : null;
  const apiDown = !!body.api_down;

  if (!item) {
    return NextResponse.json({ error: "item is required" }, { status: 400 });
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json(
      { error: "quantity must be a positive number" },
      { status: 400 },
    );
  }

  try {
    const result = simulate({
      item,
      quantity,
      targetDate,
      salePrice,
      apiDown,
    });
    const llm = toLlmSchema(result);

    // 이력 저장 (익명 user_id, env 없으면 no-op)
    const log = await logSimulation({
      item_code: result.itemCode,
      item_name: result.item,
      quantity: result.quantity,
      target_date: result.targetDate,
      best_scenario: llm.best_scenario,
      scenarios: llm.scenarios,
      user_id: "anon",
    });

    return NextResponse.json({ ...llm, logged: log.ok });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 404 });
  }
}
