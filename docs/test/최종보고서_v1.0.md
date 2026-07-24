# TEST REPORT (최종보고서) — agri2026 매입 시뮬레이터 (overedge) · v1.0

> **버전:** v1.0 · **측정일:** 2026-07-24 · **대상:** `~/overedge` (Next.js 16, `overedge-phi.vercel.app`)
> **기준 PRD:** [PRD v6-sync](../prd/PRD_overedge_v6-sync.md) · **계획:** [test-plan](test-plan.md) · **케이스:** [test-cases](test-cases.md)
> **판정:** ✅ **READY** — 모든 P0 통과, 앱 소스 결함 0

---

## 1~4. 테스트 수 집계

| 구분 | 전체 | 통과 | 실패 | 차단(skip) |
|---|---|---|---|---|
| **E2E (Playwright)** | 28 | **28** | 0 | 0 |
| ↳ desktop-chromium (1280×800) | 14 | 14 | 0 | 0 |
| ↳ mobile-chromium (Pixel 5) | 14 | 14 | 0 | 0 |
| **단위 (Vitest)** | 27 | **27** | 0 | 0 |
| **합계** | **55** | **55** | **0** | **0** |

- E2E 실행 시간: 15.5s · 콘솔 에러/페이지 예외: **0건**
- `next build`: 성공 (7 라우트) · `vitest run`: 27/27

## 5. P0 테스트 결과 (배포 게이트)

| ID | 기능 | 결과 |
|---|---|---|
| P0-1 | 시세보드 로드(액션 스트립+19품목) | ✅ PASS |
| P0-2 | 시뮬레이터 핵심 완료 + 배추 역방향 억제 | ✅ PASS |
| P0-3 | 급등(surge) 로직 — 사과 선매입 절감액 | ✅ PASS |
| P0-4 | API 계약(200/400/404) + LLM 스키마 | ✅ PASS |
| P0-5 | 인증 화면 + 이메일 형식검증(발송 없음) | ✅ PASS |

**P0 5/5 통과.**

## 6. 발견된 오류 목록

**애플리케이션 소스코드 오류: 0건.**

검증 과정에서 실패한 항목은 모두 **테스트 코드(Playwright 셀렉터) 오류**였으며, 앱 결함이 아니다. assertion 약화·skip·삭제 없이 셀렉터를 정확화해 해결했다:

| # | 초기 실패 | 원인 분류 | 조치 (앱 소스 무수정) |
|---|---|---|---|
| T-1 | `getByText("시나리오 ②/③")` strict 위반 | **테스트 코드 오류** | 하단 안내문과 부분일치 → `{ exact: true }` |
| T-2 | `getByText("선매입 억제")` 2개 매칭 | **테스트 코드 오류** | 카드명("김장철 선매입 억제")과 충돌 → `{ exact: true }` |
| T-3 | `/예상 절감 \+₩/` 미매칭 | **테스트 코드 오류** | 실제 라벨은 "…+460,000원" → 정규식 수정 |
| T-4 | 마진 입력칸 `nth(1)` = 날짜칸 | **테스트 코드 오류** | date input도 textbox → 판매가는 `nth(2)` |
| T-5 | `getByRole("heading","농가 직거래")` 미발견 | **테스트 코드 오류** | 해당 제목은 div → "도매 즉시매입" 텍스트로 대체 |

## 7. 오류별 재현 절차

앱 결함 0건이므로 재현할 소스 오류 없음. (테스트 코드 오류 T-1~T-5는 커밋 전 수정 완료, 현재 재현되지 않음.)

## 8. 예상 결과 vs 실제 결과

전 케이스 예상=실제 일치. 핵심 로직 확인 예:
- 배추(suppress): 시나리오 ③ `cost=null`("—") + "선매입 억제" — 명절 경보로 뭉개지지 않음 ✅
- 사과(surge): "예상 절감 +460,000원" + "선매입 권고" ✅
- 양파(none): "해당 없음" ✅
- 최유리 판정: 배추 f7(1150)>today(854) → "오늘 사세요" ✅
- API 배추: `best_scenario:"buy_today"`, `scenarios[3]`, `unit:"KRW"` ✅

## 9. 화면 캡처·trace 위치

- 실패 시 자동 저장 경로: `docs/test/test-results/<케이스>/` (screenshot·video·trace.zip)
- 현재 전 통과 → 아티팩트 없음(`only-on-failure`/`retain-on-failure`).
- HTML 리포트: `docs/test/playwright-report/index.html` (`npx playwright show-report docs/test/playwright-report`)
- 재현: `npm run test:e2e` (헤드리스) · `npm run test:e2e:headed`(브라우저 표시) · `npm run test:e2e:ui`

## 10. 오류 원인 분류 요약

| 분류 | 건수 |
|---|---|
| 애플리케이션 소스코드 오류 | **0** |
| Playwright 테스트 코드 오류 | 5 (전부 수정 완료) |
| PRD 모호/상충 | 0 |
| 테스트 데이터 오류 | 0 |
| 테스트 환경 오류 | 0 |
| 권한/보안 오류 | 0 |
| 외부 서비스 오류 | 0 |

## 11. 수정이 필요한 소스코드 위치 후보

**없음.** 앱 소스(`app/`, `lib/`)는 무수정. PRD v6-sync 기준 구현이 정확.

> 참고(범위 밖·차기 과제, 결함 아님): BR-9의 "로그인 비활성" 분기는 로컬 Supabase 연결 상태라 E2E 미커버 — 무-env 환경에서 별도 검증 필요(코드상 graceful degradation 확인됨). 실제 매직링크 왕복은 테스트 제외 항목.

## 12. 배포 가능 여부

### ✅ READY

- 모든 P0(로그인 렌더·인증검증·핵심 시뮬레이션·핵심 로직·API·데이터 표시) 통과.
- 앱 소스 결함 0, 콘솔 에러 0, 단위 27/27 회귀 무결, `next build` 성공.
- 데스크톱·모바일 양 프로젝트 전 통과.

**결론: 배포 진행 가능.**

---

*작성: Claude Code (SuperClaude / quality-engineer 워크플로) · AgriY&D / overedge QA v1.0 (2026-07-24)*
