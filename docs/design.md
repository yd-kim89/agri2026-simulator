# DESIGN — 설계 (PDCA)

## 1. 모듈 구조 (단일 진실원천)

```
lib/
  tokens.ts     Apple 디자인 토큰 상수 + stars()
  data.ts       품목·시세·이벤트 계수·이력 (프로토타입 1:1 이식)
  simulate.ts   ★ 3-시나리오 순수 계산 + LLM 스키마 변환 (UI·API 공유)
  supabase.ts   이력 저장 (env 없으면 no-op)
app/
  layout.tsx    폰트 preconnect, 메타
  page.tsx      4화면 클라이언트 컴포넌트 (탭 전환)
  api/simulate  POST → LLM-friendly JSON (이중 페르소나)
  api/health    상태 체크
```

핵심: `simulate()`는 **부수효과 없는 순수 함수**. UI가 부르든 API route가 부르든 동일 결과 → 테스트 커버리지 확보의 축.

## 2. 계산 로직 이원화 (PRD 05절)

| 시나리오 | 근거 | 출처 표기 |
|-|-|-|
| ① 오늘 즉시 | 라이브 도매시세 (실측) | "라이브 도매시세 (실측)" |
| ② 7일 대기 | 단기예측 API h=7 | "단기예측 API (models_v3, h=7)" |
| ③ 이벤트 선매입 | 27년 실측 이벤트 계수 | "27년 실측 이벤트 계수" |

**가격 트리거 ↔ 수요 플래그 분리 (핵심 방어 로직):**
- `surge`(사과·대파): 선매입 **권고**, 예상 절감액 = 오늘가 × 계수%
- `suppress`(배추): 선매입 **억제** — 수요 폭증에도 −40.7% 하락. `cost=null`로 금액 미표시, 판매기회 플래그만
- `none`(양파·감자): 해당 없음

배추 역방향 케이스가 단일 "명절 경보"로 뭉개지지 않는지 = 필수 테스트 대상.

## 3. LLM-Friendly 스키마 (PRD 08절)

`toLlmSchema()` — 필드명이 의미 설명, 단위·통화 명시(`unit:"KRW"`), `confidence_grade` 기계 판독, `reference_only` 과신 차단, `recommendation` 자연어. AI 에이전트가 문서 없이 파싱 가능.

## 4. 디자인 토큰 적용 (PRD 13절 Do/Don't)

- 인터랙션 색 = Action Blue `#0066cc` 단일. 링크·CTA·포커스·최유리 배지.
- 상태색(초록 `#157f3c`/빨강 `#c93030`/회색)은 **정보 신호 전용** — 등락%·판정 배지·차액. 인터랙션 아님.
- 카드·버튼·텍스트 그림자 금지. 최유리 강조 = 2px 파란 테두리 + 배지.
- body 17px, 두께 사다리 300/400/600/700 (500 부재).
- 풀블리드 타일 교대(white ↔ parchment ↔ dark)가 divider.
- 정직성 라벨 상시 노출: "참고용"(신뢰도≤2), "거래 기능 개발 중 · 시나리오 값"(직거래), "검증 대기중".

## 5. Supabase 스키마

`simulation_log`(매입 의향 데이터) + `verification`(사후 대조). RLS 익명 insert 허용, 개인정보 미수집. → `supabase/migrations/001_init.sql`

## 6. 검증 매핑 (Check가 확인할 항목)

- 배추 suppress → cost null, deltaKind up, "선매입 억제"
- 사과 surge → 절감액 양수, "선매입 권고"
- 양파 none → "해당 없음"
- 대기 시 오름(사과 f7>today) → bestIndex 0 "오늘 사세요"
- 대기 시 내림(대파 f7<today) → bestIndex 1 "기다리세요"
- 판매가 입력 → 마진율 산출 / 미입력 → null
- 잘못된 품목 → throw / API 404
- 수량 0·음수 → 1로 방어 / API 400
