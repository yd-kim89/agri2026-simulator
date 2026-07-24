# PRD ↔ 코드베이스 동기화본 — overedge (agri2026 매입 시뮬레이터)

> **기준 PRD:** farmtempo PRD v6 (2026-07-23, 직거래 마켓플레이스 승격본)
> **대상 코드베이스:** `~/overedge` (Next.js 16 · GitHub `yd-kim89/agri2026-simulator` · Vercel `overedge-phi.vercel.app`)
> **동기화 방향:** PRD v6 전체 중 **overedge가 실제 구현한 범위만** 스코핑하여 PRD를 코드 현실에 맞춘다.
> **작성:** 2026-07-24 · QA 자동화 워크플로 Step 1 산출물

---

## 0. 스코프 판정 — 왜 overedge는 PRD v6의 부분집합인가

farmtempo는 **두 개의 배포 대상**으로 나뉜 단일 제품이다:

| 계층 | 배포 | 코드 위치 | PRD v6 범위 |
|---|---|---|---|
| **시뮬레이터 · 시세보드 데모** | Vercel `overedge-phi.vercel.app` | **`~/overedge` (본 대상)** | §05 P0, §07 S-000~S-004, §08 API, P1.5 로그인 |
| 운영 대시보드 · API · MCP | NCP 서버 `app/api.farmtempo.com` (FastAPI :8003) | `main.py` (서버) | P1.6 결제, P1.7 마켓플레이스, 운영콘솔, 실시간 KAMIS |

사용자가 검토 지정한 3개 문서(**PRD v6 §15 마켓플레이스**, **Phase 9a 위임지시서**, **표준표조정 위임지시서**)는 **전부 FastAPI 백엔드(`app.farmtempo.com`, `marketplace.db`) 대상**이다. 즉 마켓플레이스/결제/운영콘솔 기능은 **overedge에 존재하지 않으며**, 본 QA 대상이 아니다.

> **결론:** overedge의 PRD 기준선 = **PRD v6를 "시뮬레이터+데모 대시보드" 슬라이스로 스코핑한 것**. 마켓플레이스(§15/P1.7)·결제(§14/P1.6)는 *문맥*으로만 참조하고 검증 범위에서 제외한다.

---

## 1. PRD v6 → overedge 구현 매핑 (동기화 결과)

| PRD v6 항목 | 요구 | overedge 구현 | 상태 |
|---|---|---|---|
| §05 P0 — 3-시나리오 시뮬레이터 | 계산 이원화(②예측 h=7 / ③27년 이벤트 계수), 가격트리거↔수요플래그 분리, 신뢰도 5등급 | `lib/simulate.ts` 순수함수 `simulate()` | ✅ 완료 |
| §07 S-000 시세보드 | 액션 스트립(매입기회 TOP3·급등주의·명절경보) + 19품목 그리드 | `Board` (`app/page.tsx`) · `GRID` 19품목 | ✅ 완료 |
| §07 S-001 시뮬레이터 | 입력 3개 → 3-시나리오 카드, 최유리 배지, 근거 펼침 | `Sim` · 카드 3장·`bestIndex` | ✅ 완료 |
| §07 S-002 이력·검증 | 누적 절감액 + 판정 배지(적중/근접/빗나감/대기), 라이브(Supabase)+데모 | `Hist` · `/api/history` · `getMyHistory` | ✅ 완료 |
| §07 S-003 농가 직거래 | 도매 vs 직거래 2-col, "시나리오 값" 배지 상시, 견적 요청 | `Trade` · `it.direct` | ✅ 완료 |
| §07 S-004 로그인 (P1.5) | 매직링크(Supabase Auth), 60초 재발송, 에러 원문, 멀티세션 계정 귀속 | `Account` · `sendMagicLink` · `logMySimulation` | ✅ 완료 |
| §08 이중 페르소나 API | `POST /api/simulate` LLM-friendly JSON(단위·신뢰도·자연어 recommendation) | `app/api/simulate/route.ts` · `toLlmSchema()` | ✅ 완료 |
| §08 graceful degradation | 예측 API 장애 시 참고값 모드, Supabase 미연결 시 no-op | `apiDown` 토글 · `isSupabaseEnabled` | ✅ 완료 |
| 정직성 원칙(§전반) | 실측/시나리오/데모 라벨 분리, 신뢰도≤2 "참고용" 워터마크 | `refOnly`, "거래 기능 개발 중·시나리오 값", "데모" 배지 | ✅ 완료 |
| **§14 / P1.6 결제·빌링** | 토스 자동결제 | **없음 (서버 측)** | ⛔ 범위 밖 |
| **§15 / P1.7 마켓플레이스** | RFQ 역경매·입찰·낙찰·장부 | **없음 (서버 측 `marketplace.db`)** | ⛔ 범위 밖 |

---

## 2. 데이터 현실 (PRD 동기화 핵심)

overedge는 **의도된 데모**다 (AgriYD README 이슈 #3, 2026-07-21 결정). PRD §08의 "실시간 도매시세"는 overedge에서 **하드코딩 상수**로 대체된다 — 이는 버그가 아니라 데모 운영 결정이다.

- `lib/data.ts`: `ITEMS`(5품목 today/f7), `GRID`(19품목), `HIST`(5건), `MONTH_SAVING`(163,800원) 전부 소스 상수.
- 시나리오 ②(예측)·③(이벤트 계수)의 **근거(배추 −40.7%, 사과 +12.7% 등)는 27년 실측 데이터에 기반**하여 유효.
- 라이브 계층은 Supabase 이력 저장/조회(env 주입 시 활성)만 실제 네트워크 호출.

> PRD 동기화 표기: overedge PRD의 "라이브 도매시세"는 **"데모 상수 시세(27년 실측 계수 기반)"**로 읽는다. 실데이터 전환은 차기 과제(AgriYD README 참조).

---

## 3. 검증 대상 비즈니스 규칙 (테스트 케이스 근거)

PRD v6 §05·§06·§08에서 도출한 overedge 검증 규칙:

- **BR-1 (배추 역방향):** 배추(suppress)는 수요 폭증에도 −40.7% 하락 → 시나리오 ③ `cost=null`, "선매입 억제", 금액 미표시. *명절 경보로 뭉개지지 않아야 함.*
- **BR-2 (사과/대파 급등):** surge 품목은 시나리오 ③에 "예상 절감 +₩" 양수 + "선매입 권고".
- **BR-3 (양파/감자 none):** 이벤트 없음 → "해당 없음", confidence 0.
- **BR-4 (최유리 판정):** 7일 뒤 오름(f7>today)이면 bestIndex=0 "오늘 사세요", 내림이면 bestIndex=1 "기다리세요".
- **BR-5 (마진):** 판매가 입력 시 마진율 산출, 미입력 시 null(미표시).
- **BR-6 (신뢰도 워터마크):** conf≤2(배추) 또는 apiDown 시 시나리오 ② "참고용" 표기.
- **BR-7 (API 계약):** `POST /api/simulate` 정상 200 + LLM 스키마; item 누락 400; quantity≤0 400; 잘못된 JSON 400; 알 수 없는 품목 404.
- **BR-8 (graceful):** apiDown 토글 시 "참고값 모드" 배너, 시뮬레이션 계속 동작.
- **BR-9 (로그인):** Supabase 미연결 시 "로그인 비활성" 라벨(앱은 정상). 이메일 형식 오류 시 "이메일 형식을 확인해 주세요".
- **BR-10 (정직성 라벨):** 직거래 "거래 기능 개발 중 · 시나리오 값" 배지, 이력 "데모"/"라이브" 구분 배지 상시 노출.

---

## 4. 동기화 조치 요약

1. overedge `docs/`에 부재하던 PRD를 본 문서(`PRD_overedge_v6-sync.md`)로 신설 — 기준 PRD를 v3→**v6 스코핑본**으로 갱신.
2. 마켓플레이스/결제는 서버 측 기능으로 명시 분리 — overedge 검증 범위에서 제외.
3. "라이브 시세" 표현을 "데모 상수(27년 실측 계수 기반)"로 정정 — 데이터 현실 반영.
4. 위 BR-1~BR-10을 `docs/test/test-cases.md`의 검증 근거로 사용.

*동기화: Claude Code (QA 자동화) · AgriY&D / overedge PRD v6-sync (2026-07-24)*
