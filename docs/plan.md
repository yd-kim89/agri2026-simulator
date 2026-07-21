# PLAN — agri2026 매입 시뮬레이터 (PDCA)

> bkit PDCA 사이클: **Plan → Design → Do → Check → Act**
> 근거: `prd.md`(PRD v3 + Apple 디자인 통합본), `agri2026 Simulator.dc.html`(화면 프로토타입)

## 1. 목표 (What)

PRD 05절 P0 — **3-시나리오 매입 시뮬레이터**를 실제 동작하는 웹앱으로 구현하고,
GitHub push + Supabase(이력 저장) + Vercel 배포까지 완료한다.

화면은 프로토타입 4개를 Apple 디자인 토큰(PRD 13절)으로 재현:
- **S-000** 시세 대시보드 (액션 스트립 + 19품목 그리드)
- **S-001** 시뮬레이터 (입력 3개 → 3-시나리오 카드) ← 핵심
- **S-002** 이력·사후 검증 (누적 절감액 + 판정 배지)
- **S-003** 농가 직거래 비교 (도매 vs 직거래 2-col)

## 2. 아키텍처 결정 (Recommended, 무질문 확정)

| 결정 | 선택 | 근거 |
|-|-|-|
| 프레임워크 | **Next.js 15 (App Router) + TypeScript** | PRD 08절 API-First·LLM-friendly·MCP 노출 요구 충족, Vercel 네이티브 |
| 핵심 로직 | 순수 함수 `lib/simulate.ts` | UI·API route가 공유 → 단일 진실원천, 테스트 용이(커버리지 90%) |
| API | `/api/simulate` (LLM-friendly JSON) | PRD 08절 스키마 그대로, 이중 페르소나(사람+AI) |
| 테스트 | **Vitest** + v8 coverage | 배추 역방향 케이스 필수 테스트(PRD 08절) |
| DB | **Supabase** (`simulation_log`) | env 없으면 graceful no-op → 무상태 동작(PRD graceful degradation) |
| 스타일 | 인라인 + 토큰 상수 | 외부 CDN 무의존 원칙(PRD 08절), 프로토타입 방식 계승 |
| 배포 | GitHub(gh 인증됨) → Vercel(npx) | — |

## 3. 정직성 원칙 (PRD 전반 — 반드시 준수)

- 실측 수치 ↔ 시나리오/데모 값을 **항상 라벨로 분리**
- 신뢰도 최저 등급(≤2)은 "참고용" 워터마크 강제
- 직거래가는 "거래 기능 개발 중 · 시나리오 값" 배지 상시 노출
- 상태색(초록/빨강/회색)=정보 신호 / Action Blue=인터랙션 — 두 문법 절대 불혼합

## 4. 채점 루브릭 (Check 단계, 100점 — 90점 미만 시 Act)

| 항목 | 배점 |
|-|-|
| 기능 완결성 (4화면 동작·탭 전환·상태) | 25 |
| 핵심 로직 정확성 (3-시나리오·이벤트 분기·배추 역방향) | 20 |
| 테스트 커버리지 ≥ 90% (핵심 로직) | 15 |
| 디자인 토큰 준수 (Apple Do/Don'ts) | 15 |
| API-First (/api/simulate LLM-friendly JSON) | 10 |
| 정직성 라벨 (실측/시나리오/참고값 분리) | 10 |
| 빌드 성공 (next build) | 5 |
| **합계** | **100** |

## 5. Non-Goals (PRD 05절 P2 준수)

- 4단계 최적화(자동 발주량 산출), 실주문 실행, 완결형 거래(정산·물류), POS·결제 — 범위 밖
- Supabase 프로젝트 자체 생성은 계정 인증 필요 → 스키마·연동 코드만 제공하고 키 주입 지점 명시

## 6. 리스크·완화

| 리스크 | 완화 |
|-|-|
| Supabase 키 부재 | `lib/supabase.ts`가 env 없으면 no-op, 앱은 정상 동작 |
| Vercel 로그인 필요 | GitHub push 우선 완료, Vercel은 npx 시도 후 막히면 연동 가이드 제공 |
| 프로토타입이 x-dc 전용 | 순수 React로 재구현(로직·데이터·토큰 1:1 이식) |
