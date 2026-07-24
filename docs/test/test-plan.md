# TEST PLAN — agri2026 매입 시뮬레이터 (overedge)

> **기준 PRD:** [PRD v6-sync](../prd/PRD_overedge_v6-sync.md) (farmtempo PRD v6를 overedge 구현 범위로 스코핑)
> **대상:** `~/overedge` · Next.js 16 · `http://localhost:3000` · Vercel `overedge-phi.vercel.app`
> **작성:** 2026-07-24 · QA 자동화(Playwright E2E + Vitest 단위)

## 1. 대상 서비스 개요

발주 전에 미리 돌려보는 **3-시나리오 농산물 매입 의사결정 시뮬레이터**. 화면 5개(S-000 시세보드 / S-001 시뮬레이터 / S-002 이력·검증 / S-003 농가 직거래 / S-004 로그인) + 이중 페르소나 API(`POST /api/simulate`).

**데모 운영 전제:** 시세는 27년 실측 계수 기반 하드코딩 상수(AgriYD README 결정, 버그 아님). 라이브 계층은 Supabase 이력 저장/조회.

## 2. 사용자 역할

| 역할 | 권한 | 검증 포인트 |
|---|---|---|
| 익명 방문자 | 시뮬레이터·시세보드·직거래 전체 사용, 익명 이력 피드 | 로그인 없이 핵심 업무 완료 |
| 로그인 사용자(매직링크) | + 계정 귀속 이력(RLS 본인 행만) | 폼 렌더·형식검증(실제 발송 제외) |
| AI 에이전트(B2AI) | `POST /api/simulate` LLM-friendly JSON 소비 | API 계약·스키마·에러코드 |

## 3. 테스트 범위

### In-scope
- S-000~S-004 화면 렌더·상태·탭 전환
- 3-시나리오 핵심 로직(배추 역방향·급등·none·최유리 판정·마진)
- API 계약(정상 200 / 400 / 404) 및 LLM 스키마
- graceful degradation(참고값 모드), 정직성 라벨
- 예외: 빈/잘못된 입력, 새로고침, 데이터 없음, 모바일·데스크톱

### Out-of-scope (근거)
- **실제 이메일 발송**(매직링크 왕복) — 테스트 제외 항목. 클라이언트 형식검증까지만.
- **결제/빌링(§14), 마켓플레이스 RFQ(§15)** — overedge 아닌 FastAPI 백엔드 기능(PRD v6-sync §0).
- **Supabase 로그인 비활성 상태(BR-9 disabled 분기)** — 로컬 env 연결 상태라 재현 불가(별도 무-env 환경 필요, 코드상 graceful 확인됨).

## 4. 테스트 유형 매핑 (지시서 요구 12종)

| 유형 | 커버 케이스 |
|---|---|
| 핵심 사용자 업무 흐름 | P0-2, P0-3 |
| 정상적인 사용 | P0-1, P0-4, P0-5 |
| 잘못된 입력 | P0-4, P1-1 |
| 빈 값·경계값 | P0-4, P1-1 |
| 권한 없는 접근 | (역할 단순 — 익명/로그인) P0-5, P1-7 |
| 중복 등록·중복 클릭 | P1-6(견적 재클릭), 로그인 재발송 타이머(코드 확인) |
| 새로고침·뒤로 가기 | P1-2 |
| 작업 중간 이탈 | P1-3(탭 순회) |
| 세션 만료 | (Supabase 세션 — env 의존, 범위 밖 표기) |
| 모바일·데스크톱 | 전 케이스 × 2 프로젝트(desktop 1280 / mobile Pixel5) |
| 데이터 없는 경우 | P1-6(감자 파트너 미모집), P1-8(none 이벤트) |
| 데이터 많은 경우 | P0-1(19품목 그리드), P1-7(이력 목록) |
| 서버/네트워크 오류 | P1-4(참고값 모드 graceful) |

## 5. 우선순위 정의

- **P0**(배포 게이트): 로그인 렌더·인증검증, 핵심 시뮬레이션 완료, 핵심 로직 정확성, API 계약, 데이터 표시. 하나라도 실패 시 NOT READY.
- **P1**: 예외·경계·탐색. 실패는 CONDITIONALLY READY 후보.

## 6. 환경·도구

| 항목 | 값 |
|---|---|
| E2E | Playwright `@playwright/test` (Chromium) — desktop-chromium + mobile-chromium |
| 단위 | Vitest + v8 coverage (기존 27 테스트) |
| 서버 | `npm run dev` (playwright webServer 자동 기동) |
| 증거 | 실패 시 screenshot·video·trace 자동 저장(`docs/test/test-results`), HTML 리포트(`docs/test/playwright-report`) |
| 프레임워크 | SuperClaude 4.1.6(core+commands+agents+modes) · Playwright MCP 등록 |

## 7. 완료 기준

- P0 5/5 통과 · 콘솔 에러 0 · 단위 27/27 회귀 무결 · `next build` 성공.
- 실패 시: 원인 분류(앱/테스트/PRD/데이터/환경/권한/외부) → 앱 결함만 소스 수정 → 재검증, 에러 0까지.

## 8. 진행 순서

1. PRD 분석 → test-plan·test-cases 작성
2. P0 Playwright 작성·실행
3. P1 예외·탐색 추가
4. 전체 실행(desktop+mobile) → test-report 작성
5. 에러 0 확인 → 버전 저장·배포
