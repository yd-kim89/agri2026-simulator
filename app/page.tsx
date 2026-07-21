"use client";

import { useMemo, useState } from "react";
import { T } from "@/lib/tokens";
import {
  ITEMS,
  GRID,
  HIST,
  MONTH_SAVING,
  topFalls,
  topRises,
  type Verdict,
} from "@/lib/data";
import { simulate, type SimResult } from "@/lib/simulate";

type Tab = "board" | "sim" | "hist" | "trade";

const fmt = (n: number) => "₩" + Math.round(n).toLocaleString("ko-KR");
const unitShort = (u: string) => (u.indexOf("상자") === 0 ? "상자" : "kg");

export default function Page() {
  const [tab, setTab] = useState<Tab>("board");
  const [apiDown, setApiDown] = useState(false);
  // 시뮬레이터
  const [selIdx, setSelIdx] = useState(0);
  const [qty, setQty] = useState("100");
  const [targetDate, setTargetDate] = useState("2026-07-28");
  const [sale, setSale] = useState("");
  const [result, setResult] = useState<SimResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(-1);
  // 이력
  const [histFilter, setHistFilter] = useState<"전체" | Verdict>("전체");
  const [histOpen, setHistOpen] = useState(-1);
  // 직거래
  const [tradeIdx, setTradeIdx] = useState(0);
  const [quoteSent, setQuoteSent] = useState(false);

  const selItem = ITEMS[selIdx];

  function runSim(idx?: number, q?: number) {
    const useIdx = idx ?? selIdx;
    const useQty = q != null ? String(q) : qty;
    setSelIdx(useIdx);
    setQty(useQty);
    setLoading(true);
    setResult(null);
    setExpanded(-1);
    setTab("sim");
    // 로딩 연출(예측 API 호출 체감) 후 순수 로직 계산
    window.setTimeout(() => {
      const r = simulate({
        item: ITEMS[useIdx].code,
        quantity: parseFloat(useQty) || 1,
        targetDate,
        salePrice: sale ? parseFloat(sale) : null,
        apiDown,
      });
      setResult(r);
      setLoading(false);
      // 이력 저장(API 경유, env 없으면 no-op) — fire-and-forget
      fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item: ITEMS[useIdx].code,
          quantity: parseFloat(useQty) || 1,
          target_date: targetDate,
          sale_price: sale || null,
          api_down: apiDown,
        }),
      }).catch(() => {});
    }, 650);
  }

  return (
    <div
      style={{
        fontFamily: T.font,
        color: T.ink,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* 글로벌 내비 (pure black) */}
      <nav
        style={{
          background: T.black,
          height: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 1024,
            padding: "0 22px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: T.parchment, letterSpacing: "-0.2px" }}>
            agri2026 <span style={{ fontWeight: 400, color: "rgba(245,245,247,0.6)" }}>시세마당</span>
          </div>
          <div style={{ display: "flex", gap: 20, fontSize: 12, color: "rgba(245,245,247,0.8)" }}>
            <span>19품목 라이브</span>
            <a href="/api/simulate" style={{ color: "rgba(245,245,247,0.8)" }}>API</a>
            <button
              onClick={() => setApiDown((v) => !v)}
              style={{ background: "none", border: "none", color: apiDown ? T.primaryOnDark : "rgba(245,245,247,0.8)", fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: 0 }}
              title="예측 API 장애 시뮬레이션 (graceful degradation 데모)"
            >
              {apiDown ? "참고값 모드 ●" : "상태"}
            </button>
          </div>
        </div>
      </nav>

      {/* 서브내비 (frosted parchment) */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(245,245,247,0.8)",
          backdropFilter: "saturate(180%) blur(20px)",
          WebkitBackdropFilter: "saturate(180%) blur(20px)",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            maxWidth: 1024,
            margin: "0 auto",
            padding: "0 22px",
            height: 52,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: 21, fontWeight: 600, letterSpacing: "0.231px", lineHeight: 1.19 }}>
            매입 시뮬레이터
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
            {(
              [
                ["board", "시세보드"],
                ["sim", "시뮬레이터"],
                ["hist", "이력·검증"],
                ["trade", "농가 직거래"],
              ] as [Tab, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                style={{
                  background: "none",
                  border: "none",
                  padding: "4px 0",
                  fontFamily: "inherit",
                  cursor: "pointer",
                  fontSize: 14,
                  letterSpacing: "-0.2px",
                  color: tab === id ? T.ink : T.inkMuted,
                  fontWeight: tab === id ? 600 : 400,
                  borderBottom: `2px solid ${tab === id ? T.ink : "transparent"}`,
                }}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => setTab("sim")}
              style={{
                background: T.primary,
                color: "#fff",
                border: "none",
                borderRadius: T.rPill,
                padding: "7px 16px",
                fontSize: 13,
                fontWeight: 400,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              시뮬레이션 실행
            </button>
          </div>
        </div>
      </div>

      {/* 참고값 모드 배너 */}
      {apiDown && (
        <div style={{ background: T.parchment, borderBottom: `1px solid ${T.hairline}` }}>
          <div style={{ maxWidth: 1024, margin: "0 auto", padding: "12px 22px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 600, background: "#6e6e73", color: "#fff", borderRadius: T.rPill, padding: "3px 12px" }}>
              참고값 모드
            </span>
            <span style={{ fontSize: 17, letterSpacing: "-0.374px", lineHeight: 1.47 }}>
              예측 서버 연결 실패 — 최근 저장된 시세 기준 참고값을 표시합니다
            </span>
          </div>
        </div>
      )}

      {tab === "board" && <Board apiDown={apiDown} onSim={runSim} goSim={() => setTab("sim")} />}
      {tab === "sim" && (
        <Sim
          selIdx={selIdx}
          setSelIdx={(i) => { setSelIdx(i); setResult(null); }}
          qty={qty}
          setQty={setQty}
          targetDate={targetDate}
          setTargetDate={setTargetDate}
          sale={sale}
          setSale={setSale}
          result={result}
          loading={loading}
          expanded={expanded}
          setExpanded={setExpanded}
          run={() => runSim()}
          runExample={runSim}
          selItem={selItem}
          goTrade={() => { setTradeIdx(selIdx); setQuoteSent(false); setTab("trade"); }}
        />
      )}
      {tab === "hist" && (
        <Hist filter={histFilter} setFilter={setHistFilter} open={histOpen} setOpen={setHistOpen} />
      )}
      {tab === "trade" && (
        <Trade idx={tradeIdx} setIdx={(i) => { setTradeIdx(i); setQuoteSent(false); }} sale={sale} quoteSent={quoteSent} sendQuote={() => setQuoteSent(true)} />
      )}

      <footer style={{ background: T.parchment, borderTop: `1px solid ${T.hairline}` }}>
        <div style={{ maxWidth: 1024, margin: "0 auto", padding: "24px 22px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 12, color: T.inkFaint }}>
            agri2026 매입 시뮬레이터 — AgriY&D · 특허 출원 10-2026-0098735
          </span>
          <span style={{ fontSize: 12, color: T.inkFaint }}>
            실측 수치와 시나리오/데모 값은 항상 라벨로 분리합니다
          </span>
        </div>
      </footer>
    </div>
  );
}

/* ══════════ S-000 시세 대시보드 ══════════ */
function Board({ apiDown, onSim, goSim }: { apiDown: boolean; onSim: (i: number) => void; goSim: () => void }) {
  const falls = topFalls();
  const rises = topRises();
  const strip = (g: [string, number, number, number]) => ({
    name: g[0],
    price: g[1].toLocaleString("ko-KR") + "원/kg",
    change: (g[2] > 0 ? "+" : "−") + Math.abs(g[2]).toFixed(1) + "%",
  });
  return (
    <div style={{ flex: 1 }}>
      <section style={{ background: T.canvas }}>
        <div style={{ maxWidth: 1024, margin: "0 auto", padding: "72px 22px 56px" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <h1 style={{ fontSize: "clamp(34px,7vw,56px)", fontWeight: 600, lineHeight: 1.07, letterSpacing: "-0.28px", margin: 0 }}>
              오늘, 뭘 사야 유리한가.
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: T.rPill, background: apiDown ? "#6e6e73" : T.signalDown, display: "inline-block" }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: T.inkMuted }}>
                {apiDown ? "참고값 데이터" : "라이브 데이터"} · 2026-07-21 06:00 기준
              </span>
            </div>
          </div>
          <p style={{ fontSize: 28, fontWeight: 400, lineHeight: 1.14, letterSpacing: "0.196px", color: T.inkMuted, margin: "16px 0 0", maxWidth: 640 }}>
            스크롤 없이 3초. 매입 기회와 급등 신호를 먼저 봅니다.
          </p>
        </div>
      </section>

      {/* 액션 스트립 */}
      <section style={{ background: T.parchment }}>
        <div style={{ maxWidth: 1024, margin: "0 auto", padding: "48px 22px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16 }}>
            <div style={{ background: T.canvas, border: `1px solid ${T.hairline}`, borderRadius: T.rLg, padding: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.signalDown, letterSpacing: "0.2px", marginBottom: 14 }}>● 오늘의 매입 기회 TOP3</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {falls.map((g) => {
                  const s = strip(g);
                  return (
                    <div key={s.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.374px" }}>{s.name}</span>
                      <span style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                        <span style={{ fontSize: 15, color: T.inkMuted }}>{s.price}</span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: T.signalDown }}>{s.change}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 12, color: T.inkFaint, marginTop: 14 }}>전일 대비 하락 상위 · 실측 품목만 표시</div>
            </div>

            <div style={{ background: T.canvas, border: `1px solid ${T.hairline}`, borderRadius: T.rLg, padding: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.signalUp, letterSpacing: "0.2px", marginBottom: 14 }}>● 급등 주의</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {rises.length === 0 ? (
                  <div style={{ fontSize: 15, color: T.inkFaint }}>상승 품목 없음</div>
                ) : (
                  rises.map((g) => {
                    const s = strip(g);
                    return (
                      <div key={s.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.374px" }}>{s.name}</span>
                        <span style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                          <span style={{ fontSize: 15, color: T.inkMuted }}>{s.price}</span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: T.signalUp }}>{s.change}</span>
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
              <div style={{ fontSize: 12, color: T.inkFaint, marginTop: 14 }}>상승 품목 없을 시 빈 슬롯 표시</div>
            </div>

            <div style={{ background: T.tileDark1, borderRadius: T.rLg, padding: 24, color: T.parchment, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.bodyMuted, letterSpacing: "0.2px", marginBottom: 14 }}>명절 경보</div>
                <div style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.14 }}>추석 D-66</div>
                <div style={{ fontSize: 14, color: T.bodyMuted, marginTop: 8, lineHeight: 1.5 }}>
                  선매입 검토 시점 D-14 (9/11)<br />사과 급등 발생률 70% · 27년 실측
                </div>
              </div>
              <button onClick={() => onSim(3)} style={{ alignSelf: "flex-start", marginTop: 16, background: "transparent", border: "none", color: T.primaryOnDark, fontSize: 14, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
                선매입 시뮬레이션 ›
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 19품목 그리드 */}
      <section style={{ background: T.canvas }}>
        <div style={{ maxWidth: 1024, margin: "0 auto", padding: "56px 22px 80px" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 8 }}>
            <h2 style={{ fontSize: 40, fontWeight: 600, lineHeight: 1.1, margin: 0 }}>19품목 도매시세</h2>
            <span style={{ fontSize: 14, color: T.inkMuted }}>kg당 대표 단가 · 전일 대비</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 16 }}>
            {GRID.map(([name, price, chg, ready], i) => {
              const itemIdx = ITEMS.findIndex((x) => x.name === name);
              return (
                <div key={name + i} style={{ background: T.canvas, border: `1px solid ${T.hairline}`, borderRadius: T.rLg, padding: 24, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.374px" }}>{name}</div>
                  <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.2px" }}>
                    {price.toLocaleString("ko-KR")}
                    <span style={{ fontSize: 13, fontWeight: 400, color: T.inkMuted }}> 원/kg</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: chg > 0 ? T.signalUp : chg < 0 ? T.signalDown : T.inkMuted }}>
                    {(chg > 0 ? "▲ +" : chg < 0 ? "▼ −" : "— ") + Math.abs(chg).toFixed(1) + "%"}
                  </div>
                  {ready === 1 && itemIdx >= 0 ? (
                    <button onClick={() => onSim(itemIdx)} style={{ background: "none", border: "none", padding: 0, textAlign: "left", fontSize: 14, color: T.primary, cursor: "pointer", fontFamily: "inherit" }}>
                      시뮬레이션 ›
                    </button>
                  ) : (
                    <span style={{ fontSize: 12, color: T.inkFaint }}>예측 준비 중</span>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 24 }}>
            <button onClick={goSim} style={{ background: T.primary, color: "#fff", border: "none", borderRadius: T.rPill, padding: "12px 28px", fontSize: 18, fontWeight: 300, cursor: "pointer", fontFamily: "inherit" }}>
              시뮬레이터 열기
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ══════════ S-001 시뮬레이터 ══════════ */
function Sim(props: {
  selIdx: number;
  setSelIdx: (i: number) => void;
  qty: string;
  setQty: (v: string) => void;
  targetDate: string;
  setTargetDate: (v: string) => void;
  sale: string;
  setSale: (v: string) => void;
  result: SimResult | null;
  loading: boolean;
  expanded: number;
  setExpanded: (i: number) => void;
  run: () => void;
  runExample: (i: number, q: number) => void;
  selItem: (typeof ITEMS)[number];
  goTrade: () => void;
}) {
  const { result: r, selItem } = props;
  const chipStyle = (on: boolean): React.CSSProperties => ({
    borderRadius: T.rPill,
    padding: "9px 20px",
    fontSize: 15,
    fontFamily: "inherit",
    cursor: "pointer",
    background: T.canvas,
    border: on ? `2px solid ${T.primaryFocus}` : "1px solid rgba(0,0,0,0.12)",
    fontWeight: on ? 600 : 400,
    color: T.ink,
  });
  const inputWrap: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    background: T.canvas,
    border: "1px solid rgba(0,0,0,0.12)",
    borderRadius: T.rPill,
    height: 44,
    padding: "0 20px",
    gap: 8,
  };

  return (
    <div style={{ flex: 1 }}>
      <section style={{ background: T.canvas }}>
        <div style={{ maxWidth: 1024, margin: "0 auto", padding: "64px 22px 48px" }}>
          <h1 style={{ fontSize: "clamp(34px,7vw,56px)", fontWeight: 600, lineHeight: 1.07, letterSpacing: "-0.28px", margin: 0 }}>
            살까, 기다릴까.
          </h1>
          <p style={{ fontSize: 28, fontWeight: 400, lineHeight: 1.14, letterSpacing: "0.196px", color: T.inkMuted, margin: "16px 0 40px" }}>
            입력 3개면 됩니다. 시나리오 셋을 나란히.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
            {ITEMS.slice(0, 4).map((it, i) => (
              <button key={it.code} onClick={() => props.setSelIdx(i)} style={chipStyle(props.selIdx === i)}>
                {it.name}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div style={inputWrap}>
              <span style={{ fontSize: 14, color: T.inkMuted }}>수량</span>
              <input value={props.qty} onChange={(e) => props.setQty(e.target.value)} inputMode="numeric" style={{ border: "none", outline: "none", width: 64, fontSize: 17, fontWeight: 600, background: "transparent" }} />
              <span style={{ fontSize: 14, color: T.inkMuted }}>{selItem.unit}</span>
            </div>
            <div style={inputWrap}>
              <span style={{ fontSize: 14, color: T.inkMuted }}>매입 예정일</span>
              <input type="date" value={props.targetDate} onChange={(e) => props.setTargetDate(e.target.value)} style={{ border: "none", outline: "none", fontSize: 15, background: "transparent", color: T.ink }} />
            </div>
            <div style={inputWrap}>
              <span style={{ fontSize: 14, color: T.inkMuted }}>판매 예정가</span>
              <input value={props.sale} onChange={(e) => props.setSale(e.target.value)} placeholder="선택 입력" inputMode="numeric" style={{ border: "none", outline: "none", width: 88, fontSize: 17, fontWeight: 600, background: "transparent" }} />
              <span style={{ fontSize: 14, color: T.inkMuted }}>원/{unitShort(selItem.unit)}</span>
            </div>
            <button onClick={props.run} style={{ background: T.primary, color: "#fff", border: "none", borderRadius: T.rPill, padding: "12px 28px", fontSize: 18, fontWeight: 300, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.1px" }}>
              시뮬레이션 실행
            </button>
          </div>
        </div>
      </section>

      {/* 결과 밴드 */}
      <section style={{ background: T.parchment, minHeight: 360 }}>
        <div style={{ maxWidth: 1024, margin: "0 auto", padding: "56px 22px 80px" }}>
          {!props.loading && !r && (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <p style={{ fontSize: 21, fontWeight: 600, letterSpacing: "0.231px", margin: "0 0 8px", color: T.inkFaint }}>
                품목을 선택하면 3가지 매입 시나리오를 비교해 드립니다
              </p>
              <p style={{ fontSize: 14, color: T.inkFaint, margin: "0 0 28px" }}>예시로 바로 시작해 보세요</p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                {[
                  ["배추 100kg — 살까 기다릴까", 0, 100],
                  ["사과 20상자 — 추석 선매입", 3, 20],
                  ["양파 200kg — 직거래 검토", 2, 200],
                ].map(([label, i, q]) => (
                  <button key={label as string} onClick={() => props.runExample(i as number, q as number)} style={{ background: T.canvas, border: "1px solid rgba(0,0,0,0.12)", borderRadius: T.rPill, padding: "10px 20px", fontSize: 15, cursor: "pointer", fontFamily: "inherit", color: T.primary }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {props.loading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "64px 0" }}>
              <div style={{ width: 28, height: 28, border: `3px solid ${T.hairline}`, borderTopColor: T.primary, borderRadius: T.rPill, animation: "spin 0.8s linear infinite" }} />
              <span style={{ fontSize: 14, color: T.inkMuted }}>예측 API 호출 중 (h=7 · 이벤트 신호)</span>
            </div>
          )}

          {r && !props.loading && (
            <>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 28 }}>
                <h2 style={{ fontSize: 40, fontWeight: 600, lineHeight: 1.1, margin: 0 }}>{r.verdict}</h2>
                <span style={{ fontSize: 14, fontWeight: 600, color: T.inkMuted }}>
                  {r.item} {r.quantity}
                  {unitShort(r.unit)} · 매입 예정일 {r.targetDate}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16, alignItems: "stretch" }}>
                {r.cards.map((c, i) => {
                  const best = i === r.bestIndex;
                  const dColor = c.deltaKind === "up" ? T.signalUp : c.deltaKind === "down" ? T.signalDown : T.inkMuted;
                  return (
                    <div key={c.id} style={{ borderRadius: T.rLg, padding: 24, display: "flex", flexDirection: "column", background: T.canvas, border: best ? `2px solid ${T.primary}` : `1px solid ${T.hairline}`, opacity: c.refOnly ? 0.85 : 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: 26 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: T.inkMuted, letterSpacing: "0.2px" }}>{c.tag}</span>
                        {best && (
                          <span style={{ background: T.primary, color: "#fff", fontSize: 12, fontWeight: 600, borderRadius: T.rPill, padding: "3px 12px" }}>최유리</span>
                        )}
                      </div>
                      <div style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.15, letterSpacing: "-0.2px", marginTop: 10 }}>{c.name}</div>
                      <div style={{ fontSize: 38, fontWeight: 600, letterSpacing: "-0.28px", marginTop: 16 }}>{c.cost != null ? fmt(c.cost) : "—"}</div>
                      <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.374px", marginTop: 6, color: dColor }}>{c.deltaLabel}</div>
                      {c.marginPct != null && (
                        <div style={{ fontSize: 14, color: T.inkMuted, marginTop: 4 }}>판매가 대비 마진 {c.marginPct}%</div>
                      )}
                      <div style={{ fontSize: 14, color: T.inkMuted, marginTop: 14, lineHeight: 1.5 }}>{c.note}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
                        <span style={{ fontSize: 14, letterSpacing: "1px" }} title="예측 신뢰도">{c.stars}</span>
                        <button onClick={() => props.setExpanded(props.expanded === i ? -1 : i)} style={{ background: "none", border: "none", padding: 0, fontSize: 14, color: T.primary, cursor: "pointer", fontFamily: "inherit" }}>
                          {props.expanded === i ? "근거 접기" : "근거 보기 ›"}
                        </button>
                      </div>
                      {props.expanded === i && (
                        <div style={{ borderTop: `1px solid ${T.hairline}`, marginTop: 14, paddingTop: 14 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: T.inkFaint, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>근거 · {c.source}</div>
                          <div style={{ fontSize: 14, lineHeight: 1.5, color: T.ink }}>{c.detail}</div>
                        </div>
                      )}
                      {c.refOnly && (
                        <div style={{ fontSize: 12, color: T.inkFaint, marginTop: 12 }}>참고용 — 신뢰도 최저 등급</div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, flexWrap: "wrap", gap: 12 }}>
                <span style={{ fontSize: 12, color: T.inkFaint, maxWidth: 620 }}>
                  시나리오 ②는 단기예측 API(h=7), 시나리오 ③은 27년 실측 이벤트 계수 — 근거 출처를 섞지 않습니다.
                </span>
                <button onClick={props.goTrade} style={{ background: T.primary, color: "#fff", border: "none", borderRadius: T.rPill, padding: "9px 20px", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
                  이 품목 직납 견적 받기 ›
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

/* ══════════ S-002 이력·사후 검증 ══════════ */
function Hist(props: {
  filter: "전체" | Verdict;
  setFilter: (v: "전체" | Verdict) => void;
  open: number;
  setOpen: (i: number) => void;
}) {
  const badge = (v: Verdict): React.CSSProperties => {
    const c =
      v === "적중" ? [T.signalDownBg, T.signalDown]
      : v === "근접" ? [T.parchment, T.inkMuted]
      : v === "빗나감" ? [T.signalUpBg, T.signalUp]
      : [T.parchment, T.inkFaint];
    return { flexShrink: 0, fontSize: 12, fontWeight: 600, borderRadius: T.rPill, padding: "4px 12px", background: c[0], color: c[1] };
  };
  const filtered = HIST.filter((h) => props.filter === "전체" || h.verdict === props.filter);
  return (
    <div style={{ flex: 1 }}>
      <section style={{ background: T.canvas }}>
        <div style={{ maxWidth: 1024, margin: "0 auto", padding: "64px 22px 48px" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.inkMuted, letterSpacing: "0.2px" }}>이번 달 누적 절감액</div>
          <div style={{ fontSize: "clamp(40px,8vw,56px)", fontWeight: 600, lineHeight: 1.07, letterSpacing: "-0.28px", marginTop: 8 }}>{fmt(MONTH_SAVING)}</div>
          <p style={{ fontSize: 17, lineHeight: 1.47, letterSpacing: "-0.374px", color: T.inkMuted, margin: "12px 0 0", maxWidth: 560 }}>
            시뮬레이션 시점 최유리가 대비 실제 매입 시점가 차이의 누적. 이 도구가 맞았는지, 장부로 확인하세요.
          </p>
        </div>
      </section>
      <section style={{ background: T.parchment }}>
        <div style={{ maxWidth: 1024, margin: "0 auto", padding: "40px 22px 80px" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {(["전체", "적중", "근접", "빗나감", "검증 대기중"] as const).map((f) => (
              <button key={f} onClick={() => { props.setFilter(f); props.setOpen(-1); }} style={{ borderRadius: T.rPill, padding: "7px 16px", fontSize: 14, fontFamily: "inherit", cursor: "pointer", background: props.filter === f ? T.ink : T.canvas, color: props.filter === f ? "#fff" : T.ink, border: props.filter === f ? `1px solid ${T.ink}` : "1px solid rgba(0,0,0,0.12)", fontWeight: props.filter === f ? 600 : 400 }}>
                {f}
              </button>
            ))}
          </div>
          <div style={{ background: T.canvas, border: `1px solid ${T.hairline}`, borderRadius: T.rLg, overflow: "hidden" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "56px 24px", textAlign: "center", fontSize: 17, color: T.inkFaint }}>해당 판정의 기록이 없습니다</div>
            ) : (
              filtered.map((h, i) => (
                <div key={h.date + h.title}>
                  <button onClick={() => props.setOpen(props.open === i ? -1 : i)} style={{ width: "100%", background: "none", border: "none", borderTop: `1px solid ${T.dividerSoft}`, padding: "18px 24px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer", fontFamily: "inherit", textAlign: "left", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, color: T.inkMuted, width: 52, flexShrink: 0 }}>{h.date}</span>
                    <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.374px", width: 130, flexShrink: 0 }}>{h.title}</span>
                    <span style={{ fontSize: 14, color: T.inkMuted, flex: 1, minWidth: 120 }}>{h.scenario}</span>
                    <span style={{ fontSize: 15, color: T.ink }}>{h.compare}</span>
                    <span style={badge(h.verdict)}>{h.verdict}</span>
                  </button>
                  {props.open === i && (
                    <div style={{ padding: "0 24px 20px 92px", background: "#fafafa" }}>
                      <div style={{ fontSize: 14, lineHeight: 1.6, color: T.inkMuted }}>{h.detail}</div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          <div style={{ fontSize: 12, color: T.inkFaint, marginTop: 16 }}>
            적중 = 오차 ≤3% · 근접 = ≤8% · 빗나감 = &gt;8% — 실측 대조 미수집 품목은 "검증 대기중"으로 구분 표시합니다(오류 아님).
          </div>
        </div>
      </section>
    </div>
  );
}

/* ══════════ S-003 농가 직거래 비교 ══════════ */
function Trade(props: {
  idx: number;
  setIdx: (i: number) => void;
  sale: string;
  quoteSent: boolean;
  sendQuote: () => void;
}) {
  const it = ITEMS[props.idx];
  const saleN = parseFloat(props.sale) || 0;
  const savingPct = it.direct ? Math.round((1 - it.direct / it.today) * 100) : 0;
  const unit = unitShort(it.unit);
  const chipStyle = (on: boolean): React.CSSProperties => ({
    borderRadius: T.rPill,
    padding: "9px 20px",
    fontSize: 15,
    fontFamily: "inherit",
    cursor: "pointer",
    background: T.canvas,
    border: on ? `2px solid ${T.primaryFocus}` : "1px solid rgba(0,0,0,0.12)",
    fontWeight: on ? 600 : 400,
    color: T.ink,
  });
  return (
    <div style={{ flex: 1 }}>
      <section style={{ background: T.canvas }}>
        <div style={{ maxWidth: 1024, margin: "0 auto", padding: "64px 22px 40px" }}>
          <h1 style={{ fontSize: "clamp(34px,7vw,56px)", fontWeight: 600, lineHeight: 1.07, letterSpacing: "-0.28px", margin: 0 }}>누구에게 살까.</h1>
          <p style={{ fontSize: 28, fontWeight: 400, lineHeight: 1.14, letterSpacing: "0.196px", color: T.inkMuted, margin: "16px 0 32px" }}>
            도매 다단계를 우회하면, 같은 품목이 얼마가 되는가.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {ITEMS.map((x, i) => (
              <button key={x.code} onClick={() => props.setIdx(i)} style={chipStyle(props.idx === i)}>{x.name}</button>
            ))}
          </div>
        </div>
      </section>

      {it.direct ? (
        <section>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
            {/* 도매 — 실측 (product-tile-light) */}
            <div style={{ background: T.canvas, borderTop: `1px solid ${T.hairline}`, padding: "64px 48px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.signalDown }}>● 실측 시세</div>
              <div style={{ fontSize: 40, fontWeight: 600, lineHeight: 1.1, marginTop: 12 }}>도매 즉시매입</div>
              <div style={{ fontSize: 56, fontWeight: 600, letterSpacing: "-0.28px", marginTop: 24 }}>
                {it.today.toLocaleString("ko-KR")}
                <span style={{ fontSize: 17, fontWeight: 400, color: T.inkMuted }}> 원/{unit}</span>
              </div>
              <div style={{ fontSize: 17, lineHeight: 1.47, letterSpacing: "-0.374px", color: T.inkMuted, marginTop: 16, maxWidth: 320 }}>
                가락시장 경락 기반 오늘 대표가. 다단계 유통 마진 포함.
              </div>
              {saleN > 0 && (
                <div style={{ fontSize: 17, fontWeight: 600, marginTop: 12 }}>판매가 대비 마진 {Math.round((saleN - it.today) / saleN * 100)}%</div>
              )}
            </div>
            {/* 직거래 — 시나리오 (product-tile-parchment) */}
            <div style={{ background: T.parchment, borderTop: `1px solid ${T.hairline}`, padding: "64px 48px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <div style={{ fontSize: 12, color: T.inkFaint, border: "1px solid rgba(0,0,0,0.16)", borderRadius: T.rPill, padding: "3px 12px" }}>거래 기능 개발 중 · 시나리오 값</div>
              <div style={{ fontSize: 40, fontWeight: 600, lineHeight: 1.1, marginTop: 12 }}>농가 직거래</div>
              <div style={{ fontSize: 56, fontWeight: 600, letterSpacing: "-0.28px", marginTop: 24 }}>
                {it.direct.toLocaleString("ko-KR")}
                <span style={{ fontSize: 17, fontWeight: 400, color: T.inkMuted }}> 원/{unit}</span>
              </div>
              <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.374px", color: T.signalDown, marginTop: 8 }}>
                −{savingPct}% · {(it.today - it.direct).toLocaleString("ko-KR")}원/{unit} 절감
              </div>
              <div style={{ fontSize: 17, lineHeight: 1.47, letterSpacing: "-0.374px", color: T.inkMuted, marginTop: 12, maxWidth: 320 }}>{it.partner}</div>
              {saleN > 0 && (
                <div style={{ fontSize: 17, fontWeight: 600, marginTop: 12 }}>판매가 대비 마진 {Math.round((saleN - it.direct) / saleN * 100)}%</div>
              )}
              {props.quoteSent ? (
                <div style={{ marginTop: 24, fontSize: 17, fontWeight: 600, color: T.signalDown }}>
                  ✓ 견적 요청 전송됨 — 품목·수량·희망 시점이 파트너 농가에 전달됩니다
                </div>
              ) : (
                <button onClick={props.sendQuote} style={{ marginTop: 24, background: T.primary, color: "#fff", border: "none", borderRadius: T.rPill, padding: "12px 28px", fontSize: 17, fontWeight: 400, cursor: "pointer", fontFamily: "inherit" }}>
                  직납 견적 요청
                </button>
              )}
            </div>
          </div>
          <div style={{ maxWidth: 1024, margin: "0 auto", padding: "24px 22px 80px" }}>
            <div style={{ fontSize: 12, color: T.inkFaint, textAlign: "center" }}>
              타이밍 절감(실측)과 직거래 절감(시나리오)은 근거가 다릅니다. 직거래가는 파트너 농가 실제 견적으로 대체 예정 — 과대표현을 차단하기 위해 라벨을 상시 노출합니다.
            </div>
          </div>
        </section>
      ) : (
        <section style={{ background: T.parchment, borderTop: `1px solid ${T.hairline}` }}>
          <div style={{ maxWidth: 1024, margin: "0 auto", padding: "96px 22px", textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 600, color: T.inkFaint }}>이 품목은 아직 직거래 파트너 모집 중</div>
            <div style={{ fontSize: 17, color: T.inkFaint, marginTop: 12 }}>파트너 농가가 등록되면 도매가와 나란히 비교해 드립니다.</div>
          </div>
        </section>
      )}
    </div>
  );
}
