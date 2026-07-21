// GET /api/history — 최근 시뮬레이션 기록 (Supabase 라이브)
import { NextResponse } from "next/server";
import { getHistory, isSupabaseEnabled } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { rows, count } = await getHistory();
  return NextResponse.json({ enabled: isSupabaseEnabled, count, rows });
}
