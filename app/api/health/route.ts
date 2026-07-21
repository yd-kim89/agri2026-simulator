import { NextResponse } from "next/server";
import { isSupabaseEnabled } from "@/lib/supabase";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "agri2026-simulator",
    supabase: isSupabaseEnabled ? "connected" : "disabled (graceful)",
  });
}
