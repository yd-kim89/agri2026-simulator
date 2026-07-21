// 품목·시세·이벤트 계수·이력 데이터 (프로토타입에서 1:1 이식)
// 실측 근거: PRD 03·05절 (1996~2023 도소매 339만 행 분석)

export type EventKind = "surge" | "suppress" | "none";

export interface EventCoef {
  kind: EventKind;
  name?: string;
  coef: number; // 평균 변동률(%)
  basis: string; // 27년 실측 근거 문장
}

export interface Item {
  code: string;
  name: string;
  unit: string; // 'kg' | '상자(10kg)'
  today: number; // 오늘 도매 대표가
  f7: number; // 7일 후 예측가
  mape: number; // 이 품목 예측 오차(%)
  conf: number; // 신뢰도 5등급
  event: EventCoef;
  direct: number | null; // 농가 직거래 시나리오값 (없으면 파트너 미모집)
  partner: string | null;
}

// 핵심 4품목 + 감자 — 시뮬레이터/직거래 대상
export const ITEMS: Item[] = [
  {
    code: "cabbage",
    name: "배추",
    unit: "kg",
    today: 854,
    f7: 1150,
    mape: 18.7,
    conf: 2,
    event: {
      kind: "suppress",
      name: "김장철 선매입 억제",
      coef: -40.7,
      basis:
        '김장철 배추는 수요 폭증에도 수확기 공급 주도로 평균 −40.7% 하락 (1996~2023 실측, 무 −25.5%). "수요 늘면 미리 사둬야지"라는 직관과 반대 신호.',
    },
    direct: 726,
    partner: "경기 북부 파트너 농가 2곳 · 시뮬레이션 수요 신호 주 1회 전달",
  },
  {
    code: "greenonion",
    name: "대파",
    unit: "kg",
    today: 2350,
    f7: 2180,
    mape: 8.4,
    conf: 4,
    event: {
      kind: "surge",
      name: "설 D-14 선매입",
      coef: 19.5,
      basis:
        "설 전 대파 평균 +19.5%, 급등 발생률 86% (1996~2023 실측). 가격 트리거 품목 — D-14 선매입 권고 신호.",
    },
    direct: 1990,
    partner: "경기 북부 파트너 농가 1곳 (최농가) · 대파·양파 겸작",
  },
  {
    code: "onion",
    name: "양파",
    unit: "kg",
    today: 980,
    f7: 1020,
    mape: 5.1,
    conf: 5,
    event: {
      kind: "none",
      coef: 0,
      basis:
        "향후 30일 내 명절·김장 이벤트 없음. 유통비용률 72.4% 최상위 품목 — 직거래 경로 검토 권장.",
    },
    direct: 850,
    partner: "경기 북부 파트너 농가 1곳 (최농가)",
  },
  {
    code: "apple",
    name: "사과",
    unit: "상자(10kg)",
    today: 46000,
    f7: 48500,
    mape: 6.2,
    conf: 4,
    event: {
      kind: "surge",
      name: "추석 D-14 선매입",
      coef: 10.0,
      basis:
        "설 전 사과 평균 +10% (급등 발생률 100%), 추석 전 +12.7% (발생률 70%) — 27년 실측. 가격 트리거 품목.",
    },
    direct: 40200,
    partner: "충북 파트너 농가 1곳 · 저장 사과",
  },
  {
    code: "potato",
    name: "감자",
    unit: "kg",
    today: 1450,
    f7: 1430,
    mape: 7.7,
    conf: 3,
    event: { kind: "none", coef: 0, basis: "이벤트 없음." },
    direct: null,
    partner: null,
  },
];

export function findItem(codeOrName: string): Item | undefined {
  return ITEMS.find((i) => i.code === codeOrName || i.name === codeOrName);
}

// 시세보드 19품목 그리드 [이름, 오늘가, 등락%, 예측준비(1/0)]
export const GRID: [string, number, number, number][] = [
  ["배추", 854, -3.2, 1], ["무", 620, -1.8, 0], ["사과", 4600, 0.9, 1], ["대파", 2350, -7.1, 1],
  ["양파", 980, -2.4, 1], ["마늘", 6900, 1.2, 0], ["시금치", 3800, 12.4, 0], ["감자", 1450, -0.6, 0],
  ["당근", 1680, 0.3, 0], ["오이", 2100, -4.8, 0], ["애호박", 1900, -2.1, 0], ["상추", 4200, 8.9, 0],
  ["깻잎", 7300, 2.6, 0], ["토마토", 3400, -1.1, 0], ["느타리버섯", 4100, 0.0, 0], ["고구마", 2250, 0.4, 0],
  ["배", 5200, 3.1, 0], ["포도", 8900, -0.9, 0], ["건고추", 15800, 5.4, 0],
];

// 시세보드 액션 스트립 — 하락 TOP3 / 급등(>2%) TOP2
export function topFalls() {
  return GRID.filter((g) => g[2] < 0).sort((a, b) => a[2] - b[2]).slice(0, 3);
}
export function topRises() {
  return GRID.filter((g) => g[2] > 2).sort((a, b) => b[2] - a[2]).slice(0, 2);
}

export type Verdict = "적중" | "근접" | "빗나감" | "검증 대기중";

export interface HistRow {
  date: string;
  title: string;
  scenario: string;
  compare: string;
  verdict: Verdict;
  detail: string;
}

export const HIST: HistRow[] = [
  { date: "07-19", title: "배추 80kg", scenario: "③ 이벤트 선매입", compare: "시뮬 ₩68,300 → 실측 대조 예정", verdict: "검증 대기중", detail: "매입 예정일(08-02) 도래 후 실제 시세와 자동 대조합니다. 오류가 아닌 대기 상태입니다." },
  { date: "07-18", title: "배추 100kg", scenario: "① 오늘 즉시 매입", compare: "시뮬 ₩85,400 → 실제 ₩84,900", verdict: "적중", detail: "오차 0.6%. 7일 대기 시나리오 예측(₩115,000) 대비 29,600원 절감 — 이달 절감액에 반영." },
  { date: "07-15", title: "대파 60kg", scenario: "② 7일 대기", compare: "시뮬 ₩128,400 → 실제 ₩135,600", verdict: "근접", detail: "오차 5.6% (MAPE 8.4% 범위 내). 방향(하락)은 적중, 폭이 예측보다 작았음." },
  { date: "07-11", title: "양파 200kg", scenario: "① 오늘 즉시 매입", compare: "시뮬 ₩196,000 → 실제 ₩197,200", verdict: "적중", detail: "오차 0.6%. 신뢰도 ★★★★★ 품목 — 예측 안정 구간." },
  { date: "07-09", title: "사과 10상자", scenario: "② 7일 대기", compare: "시뮬 ₩460,000 → 실제 ₩512,000", verdict: "빗나감", detail: "오차 11.3%. 산지 우박 피해로 급등 — 예외 요인. 신뢰도 등급 재산정에 반영됨." },
];

// 이번 달 누적 절감액 (적중/근접 케이스의 절감분 집계) — S-002 상단
export const MONTH_SAVING = 163800;
