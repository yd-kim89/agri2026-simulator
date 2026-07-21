# CHECK — 검증 리포트 (PDCA)

측정일: 2026-07-21 · 대상: agri2026 매입 시뮬레이터 v3.0.0

## 1. 자동 검증 결과 (기계 측정)

| 항목 | 결과 | 근거 |
|-|-|-|
| 단위 테스트 | **27 passed / 27** | `vitest run` |
| 커버리지 (핵심 로직) | **Stmt 100% · Branch 95.16% · Func 100%** | v8 coverage — `lib/simulate.ts`, `lib/data.ts` |
| 타입 체크 | **통과** | `next build` (tsc) |
| 프로덕션 빌드 | **성공** | 6 라우트 생성, / 9.1kB |
| API `/api/health` | 200 OK | `{"status":"ok","supabase":"disabled (graceful)"}` |
| API `/api/simulate` (배추) | 200, LLM 스키마 정상 | best_scenario·scenarios·confidence_scale 노출 |
| API 잘못된 품목 | **404** | graceful 에러 |
| UI 4화면 렌더 | **정상** (브라우저 실검증) | S-000/S-001 스크린샷, 3-카드·워터마크·상태색 확인 |

## 2. 채점 (100점 루브릭 — plan.md 기준)

| 항목 | 배점 | 획득 | 판정 근거 |
|-|-|-|-|
| 기능 완결성 (4화면·탭·상태) | 25 | **25** | 4화면 렌더·탭 전환·빈/로딩/결과/에러 상태·apiDown 토글 모두 동작 |
| 핵심 로직 정확성 (3-시나리오·이벤트 분기·배추 역방향) | 20 | **20** | 27 테스트 통과, 배추 suppress(cost=null·억제)·사과 surge(절감 양수)·양파 none UI 실검증 |
| 테스트 커버리지 ≥90% | 15 | **15** | Stmt 100 / Branch 95.16 — 임계 초과 |
| 디자인 토큰 준수 (Apple Do/Don'ts) | 15 | **14** | 단일 Action Blue·상태색 격리·무그림자·body 17px·풀블리드 교대 확인. −1: 반응형 좁은 뷰포트에서 서브내비 가로 스크롤(치명 아님) |
| API-First (LLM-friendly JSON) | 10 | **10** | `/api/simulate` unit·confidence_grade·recommendation·description·reference_only 전부 노출, 404 처리 |
| 정직성 라벨 (실측/시나리오/참고값) | 10 | **10** | "참고용" 워터마크(배추 conf2)·"거래 기능 개발 중·시나리오 값"·"검증 대기중" 상시 노출 |
| 빌드 성공 | 5 | **5** | next build 통과 |
| **합계** | **100** | **99** | |

## 3. 정직한 한계 (감점·미검증)

- **Supabase 로깅 미검증:** env 키 부재로 `logged:false` — 코드·스키마·RLS는 완비, 키 주입 시 즉시 활성(설계대로 graceful). 계정 생성은 사용자 인증 필요 영역.
- **디자인 −1점:** 초저폭(≤360px) 서브내비 탭이 가로로 넘칠 수 있음. `flex-wrap`으로 완화했으나 완전 최적은 차기.
- **Branch 4.84% 미커버:** `lib/simulate.ts` 120·139·233 — 방어적 기본값 분기(부수효과 없음). 기능 영향 없음.

## 4. 판정

**99 / 100 ≥ 90 → ACT(버그 수정) 트리거 없음.**
경미 개선(디자인 반응형)만 iteration-log에 기록하고 SHIP 진행.
