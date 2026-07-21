// 3-시나리오 매입 시뮬레이터 — 핵심 로직 (UI + /api/simulate 공유)
// PRD 05절 P0: 계산 로직 이원화
//   시나리오 ②(N≤7): 단기예측 API(h=7)  /  시나리오 ③: 27년 실측 이벤트 계수
// 근거 출처를 섞지 않고 각 카드에 표기한다.

import { ITEMS, findItem, Item, EventKind } from "./data";
import { stars } from "./tokens";

export interface ScenarioCard {
  id: "s1" | "s2" | "s3";
  tag: string;
  name: string;
  cost: number | null; // 예상 매입액 (KRW), 억제/해당없음은 null
  unitPrice: number | null;
  deltaLabel: string; // 차액 라벨
  deltaKind: "neutral" | "up" | "down"; // 상태색 결정
  note: string;
  confidence: number; // 신뢰도 5등급 (0=해당없음)
  stars: string;
  source: string; // 근거 출처 (라이브 실측 vs 27년 계수)
  detail: string; // 펼침 근거
  marginPct: number | null; // 판매가 입력 시 마진율
  refOnly: boolean; // 참고용 워터마크(신뢰도≤2 또는 API 장애)
  eventKind?: EventKind;
}

export interface SimResult {
  item: string;
  itemCode: string;
  quantity: number;
  unit: string;
  targetDate: string;
  salePrice: number | null;
  bestIndex: number; // 최유리 카드 index (0=①, 1=②)
  verdict: string; // "오늘 사세요 — ..." 등
  cards: ScenarioCard[];
  apiDown: boolean;
  generatedAt: string;
}

export interface SimInput {
  item: string; // code 또는 이름
  quantity: number;
  targetDate?: string;
  salePrice?: number | null;
  apiDown?: boolean;
  now?: string; // 테스트 주입용 (기본 미사용)
}

function marginOf(sale: number | null, unitPrice: number | null): number | null {
  if (!sale || sale <= 0 || unitPrice == null) return null;
  return Math.round(((sale - unitPrice) / sale) * 100);
}

/** 순수 계산 — 부수효과 없음. 잘못된 입력은 안전한 기본값으로 방어. */
export function simulate(input: SimInput): SimResult {
  const it: Item | undefined = findItem(input.item);
  if (!it) {
    throw new Error(`알 수 없는 품목: ${input.item}`);
  }
  const n = Math.max(1, Number.isFinite(input.quantity) ? input.quantity : 1);
  const sale =
    input.salePrice != null && input.salePrice > 0 ? input.salePrice : null;
  const apiDown = !!input.apiDown;
  const targetDate = input.targetDate || "";

  const c1 = n * it.today; // ① 오늘 즉시
  const c2 = n * it.f7; // ② 7일 대기
  const d2 = c2 - c1; // 대기 시 차액

  const cards: ScenarioCard[] = [];

  // ① 오늘 즉시 매입 — 라이브 실측
  cards.push({
    id: "s1",
    tag: "시나리오 ①",
    name: "오늘 즉시 매입",
    cost: c1,
    unitPrice: it.today,
    deltaLabel: "기준 시나리오",
    deltaKind: "neutral",
    note: `오늘 도매 대표가 ${it.today.toLocaleString("ko-KR")}원/${it.unit} 기준.`,
    confidence: 5,
    stars: stars(5),
    source: "라이브 도매시세 (실측)",
    detail:
      "가락시장 경락 기반 오늘 06:00 수집가. 일 45,000건+ 자동 수집 파이프라인.",
    marginPct: marginOf(sale, it.today),
    refOnly: false,
  });

  // ② 7일 대기 후 매입 — 단기예측 API(h=7)
  const pct2 = (d2 / c1) * 100;
  cards.push({
    id: "s2",
    tag: "시나리오 ②",
    name: "7일 대기 후 매입",
    cost: c2,
    unitPrice: it.f7,
    deltaLabel: `${d2 >= 0 ? "+" : "−"}${Math.abs(Math.round(d2)).toLocaleString(
      "ko-KR",
    )}원 (${d2 >= 0 ? "+" : "−"}${Math.abs(pct2).toFixed(1)}%)`,
    deltaKind: d2 > 0 ? "up" : "down",
    note: `7일 뒤 예측가 ${it.f7.toLocaleString("ko-KR")}원/${it.unit} · MAPE ${it.mape}%.`,
    confidence: it.conf,
    stars: stars(it.conf),
    source: "단기예측 API (models_v3, h=7)",
    detail: `159개 시계열 라이브 예측 모델. 검증률 89.2%, 이 품목 MAPE ${it.mape}%. 신뢰도 ${it.conf}/5등급.`,
    marginPct: marginOf(sale, it.f7),
    refOnly: it.conf <= 2 || apiDown,
  });

  // ③ 이벤트 D-14 선매입 — 27년 실측 계수 (예측 모델 아님)
  const ev = it.event;
  if (ev.kind === "surge") {
    const saving = Math.round((c1 * ev.coef) / 100);
    cards.push({
      id: "s3",
      tag: "시나리오 ③",
      name: ev.name || "이벤트 선매입",
      cost: c1,
      unitPrice: it.today,
      deltaLabel: `예상 절감 +${saving.toLocaleString("ko-KR")}원`,
      deltaKind: "down",
      note: `명절 시점 예상 급등(+${ev.coef}%)을 회피 — 선매입 권고.`,
      confidence: 4,
      stars: stars(4),
      source: "27년 실측 이벤트 계수",
      detail: ev.basis,
      marginPct: marginOf(sale, it.today),
      refOnly: false,
      eventKind: "surge",
    });
  } else if (ev.kind === "suppress") {
    // 배추 역방향 — 수요 폭증에도 가격 하락 → 선매입 억제
    cards.push({
      id: "s3",
      tag: "시나리오 ③",
      name: ev.name || "선매입 억제",
      cost: null,
      unitPrice: null,
      deltaLabel: "선매입 억제",
      deltaKind: "up",
      note: `수확기 공급 주도 하락(${ev.coef}%) — 대량 선매입은 손실. 판매기회 플래그만 유지.`,
      confidence: 4,
      stars: stars(4),
      source: "27년 실측 이벤트 계수",
      detail: ev.basis,
      marginPct: null,
      refOnly: false,
      eventKind: "suppress",
    });
  } else {
    cards.push({
      id: "s3",
      tag: "시나리오 ③",
      name: "이벤트 선매입",
      cost: null,
      unitPrice: null,
      deltaLabel: "해당 없음",
      deltaKind: "neutral",
      note: "매입 예정일 기준 예측 지평 밖 이벤트가 없습니다.",
      confidence: 0,
      stars: "—",
      source: "27년 실측 이벤트 계수",
      detail: ev.basis,
      marginPct: null,
      refOnly: false,
      eventKind: "none",
    });
  }

  // 최유리 판정: 7일 뒤 오르면 오늘(0), 내리면 대기(1)
  const bestIndex = d2 > 0 ? 0 : 1;
  let verdict: string;
  if (bestIndex === 0) {
    verdict = `오늘 사세요 — 7일 뒤 +${pct2.toFixed(1)}% 예상.`;
  } else {
    verdict = `기다리세요 — 7일 뒤 ${pct2.toFixed(1)}% 예상.`;
  }

  return {
    item: it.name,
    itemCode: it.code,
    quantity: n,
    unit: it.unit,
    targetDate,
    salePrice: sale,
    bestIndex,
    verdict,
    cards,
    apiDown,
    generatedAt: input.now || "",
  };
}

// ── LLM-Friendly 스키마 (PRD 08절) — /api/simulate 응답 ──
// 이중 페르소나: 사람 화면과 AI 에이전트가 동일 소비. 필드명이 의미를 설명.
export interface LlmScenario {
  scenario: string;
  scenario_name: string;
  expected_cost_krw: number | null;
  expected_saving_krw: number | null;
  unit: "KRW";
  confidence_grade: number;
  confidence_scale: "1(낮음)~5(높음)";
  source: string;
  recommendation: string;
  description: string;
  reference_only: boolean;
}

export function toLlmSchema(r: SimResult): {
  item: string;
  quantity: number;
  target_date: string;
  best_scenario: string;
  verdict: string;
  scenarios: LlmScenario[];
  api_degraded: boolean;
} {
  const scMap: Record<string, string> = {
    s1: "buy_today",
    s2: "wait_7d",
    s3: "pre_purchase_event",
  };
  const scenarios: LlmScenario[] = r.cards.map((c) => {
    let saving: number | null = null;
    if (c.id === "s2" && r.cards[0].cost != null && c.cost != null) {
      saving = r.cards[0].cost - c.cost; // 오늘 대비 대기 절감(음수면 손해)
    } else if (c.id === "s3" && c.eventKind === "surge" && c.cost != null) {
      const m = c.deltaLabel.match(/([\d,]+)/);
      saving = m ? parseInt(m[1].replace(/,/g, ""), 10) : null;
    }
    const rec =
      c.eventKind === "suppress"
        ? "선매입 억제"
        : c.eventKind === "surge"
          ? "선매입 권고"
          : c.id === "s1"
            ? "즉시 매입 기준"
            : r.bestIndex === 1 && c.id === "s2"
              ? "대기 권고"
              : "참고";
    return {
      scenario: scMap[c.id],
      scenario_name: c.name,
      expected_cost_krw: c.cost,
      expected_saving_krw: saving,
      unit: "KRW",
      confidence_grade: c.confidence,
      confidence_scale: "1(낮음)~5(높음)",
      source: c.source,
      recommendation: rec,
      description: c.note,
      reference_only: c.refOnly,
    };
  });
  return {
    item: r.item,
    quantity: r.quantity,
    target_date: r.targetDate,
    best_scenario: scMap[r.cards[r.bestIndex].id],
    verdict: r.verdict,
    scenarios,
    api_degraded: r.apiDown,
  };
}

export const ITEM_CODES = ITEMS.map((i) => ({ code: i.code, name: i.name }));
