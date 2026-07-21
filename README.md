# agri2026 매입 시뮬레이터

> 발주 전에 미리 돌려보는 **3-시나리오 농산물 매입 의사결정 도구** — AgriY&D
> "농산물을 언제·누구에게 사야 유리한지, 감이 아니라 숫자로." 사람과 AI가 동시에 호출한다.

PRD v3(`docs/` 참조) P0 기능을 Next.js로 구현. Apple 디자인 언어 채용, LLM-friendly API, 정직성 라벨 내장.

## 화면 (S-000 ~ S-003)

- **시세보드** — 액션 스트립(매입 기회 TOP3 / 급등 주의 / 명절 경보) + 19품목 그리드
- **시뮬레이터** ★ — 품목·수량·예정일 입력 → 3-시나리오 카드(오늘/7일 대기/이벤트 선매입)
- **이력·검증** — 이번 달 누적 절감액 + 적중/근접/빗나감 판정
- **농가 직거래** — 도매가 vs 파트너 농가 직거래가 나란히 비교

## 핵심 설계

- **계산 이원화:** 시나리오 ②=단기예측 API(h=7) / ③=27년 실측 이벤트 계수 — 근거 출처 불혼합
- **가격 트리거 ↔ 수요 플래그 분리:** 사과·대파=선매입 권고 / 배추=선매입 **억제**(수요 폭증에도 −40.7% 하락)
- **정직성:** 신뢰도 5등급 + "참고용" 워터마크, 직거래 "시나리오 값" 배지 상시 노출
- **이중 페르소나:** `POST /api/simulate` → 사람 화면과 동일한 LLM-friendly JSON

## 로컬 실행

```bash
npm install
npm run dev          # http://localhost:3000
npm run test:cov     # 27 테스트 · 커버리지
npm run build
```

## API

```bash
curl -X POST localhost:3000/api/simulate \
  -H "Content-Type: application/json" \
  -d '{"item":"사과","quantity":20,"target_date":"2026-09-11","sale_price":52000}'
```

응답: `item / best_scenario / verdict / scenarios[]`(각 `expected_cost_krw`, `confidence_grade`, `recommendation`, `reference_only` …)

## Supabase (선택)

env 없으면 앱은 정상 동작(이력 저장만 비활성 — graceful degradation).
연결하려면:

1. Supabase 프로젝트 생성 → `supabase/migrations/001_init.sql`을 SQL Editor에서 실행
2. `.env.local`에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 설정 (`.env.example` 참조)

## 배포 (Vercel)

GitHub 저장소를 Vercel에 임포트하면 자동 빌드. 환경변수는 Supabase 키만(선택).

## 문서 (PDCA)

`docs/plan.md` → `docs/design.md` → `docs/check-report.md` → `docs/iteration-log.md`

---
*AgriY&D · 특허 출원 10-2026-0098735 · 팀: 김영도(사람) + Claude Code(AI)*
