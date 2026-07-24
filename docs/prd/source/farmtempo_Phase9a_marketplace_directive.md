# Claude Code 위임지시서 — Phase 9a · 직거래 RFQ 마켓플레이스 (최소 루프) 구현

발행 2026-07-23 · 대상 `app.farmtempo.com` 백엔드(FastAPI `main:app` :8003) + 공개 대시보드(farmtempo.com) 탭 추가 · 근거 PRD v6 §15 / §05 P1.7 / §10 Phase 9a
범위: **시뮬레이션→RFQ 게시→입찰→비교→낙찰→거래 확인서**의 왕복 1루프 + AI 초안(RFQ·입찰 제안서)
위임 등급: 🟢 코드·테스트·AI 초안 프롬프트 골격 / 🟡 입점 심사 기준·규격/등급 표준표·AI 가격 문구·알림 채널·수수료(9a는 무과금)는 사람 확정

---

## 0. 범위 · 대전제 (딱 이것만)

PRD v6 §15.2의 1·2·3단계 중 **최소 루프만** 구현한다. 신규 라우터 + 신규 SQLite로 붙이고 기존 시뮬레이터·운영 콘솔·결제(billing.db)·`/api/ops` 무접촉.

### ⛔ 하지 말 것 (위반 = 실패)
- **자동 낙찰 금지** — 낙찰 확정은 수요자(사람)의 명시적 클릭만. AI는 추천·근거 표기까지.
- **대금 결제·정산 기능 금지** — 거래 확인서와 기록까지만. 결제 라우터(Phase 8)와 코드·DB 미연결(2027 검토).
- **농가 실명·연락처 공개 금지**(08.7) — 공개 필드는 상호·시군구·품목·출하 일정만. 연락은 플랫폼 경유(낙찰 후 거래 확인서에만 상호 간 노출).
- **경영체번호 원본 저장 금지** — 검증/심사 결과 boolean + 심사일만 저장.
- **AI 초안에 확정적 가격 단정 금지** — 적정가 밴드는 예측 API 신뢰도 등급 동반, "참고용" 라벨 강제. 신뢰도 3등급 이하 품목은 밴드 미표시(근거 없는 숫자 생성 금지).
- 기존 `main.py` 함수 수정 금지 — 라우터 include 1줄만. 트래픽·스키마 기존 것 무접촉.
- 수수료 청구·과금 로직 작성 금지 — 9a는 전면 무료(수수료율은 사업 결정 후 별도 지시서).

### 🟡 사람(사장님) 확정 — 코드 전에
- **입점 심사 기준**: `농가등록_신청심사_명세`·`품질보증_농가관리_설계안` 기준 재활용 여부·간소화 범위. 9a 심사는 **관리자 수동 승인**(운영 콘솔 아님, 별도 admin 엔드포인트 + X-Admin-Token 재사용).
- **규격·등급 표준표**: RFQ 필수 필드의 선택지(예: 규격 상/중/하 or kg·상자 단위, 등급 특/상/보통). 품목별 표는 사람 확정 — 코드에는 설정 테이블로.
- **알림 채널**: 9a 기본 = 입찰함 폴링 + (선택) 이메일. 카카오 알림톡은 발신프로필·비용이 필요하므로 차기 [🟡 결정].
- **AI 초안 문구 톤**: 제안서·RFQ 초안의 고정 문구(과장 금지·근거 표기 원칙) 샘플 1회 승인 후 위임.

## 1. 사전 준비
1. 백업(커밋). 2. 의존성은 기존 스택 그대로(FastAPI·requests). LLM 호출은 `.env`의 기존 ANTHROPIC/OPENAI 키 재사용(커밋 금지). 3. 신규 DB 파일 `marketplace.db`(ops_console.db·billing.db와 분리).

## 2. DB 스키마 (SQLite · marketplace.db)

PRD v6 §08 v6 추가 모델 준수. 상태 변경은 서버만.

```sql
CREATE TABLE farms (id TEXT PRIMARY KEY,              -- uuid4
  shop_name TEXT NOT NULL, region_sigungu TEXT NOT NULL, items_json TEXT NOT NULL,
  ship_schedule TEXT, intro TEXT,
  biz_verified INTEGER DEFAULT 0, verified_at TEXT,   -- 경영체 심사 결과 boolean만(원본 미보존)
  status TEXT NOT NULL DEFAULT 'PENDING',             -- PENDING/APPROVED/SUSPENDED
  contact_email TEXT, created_at TEXT);               -- 비공개 필드(플랫폼 경유 알림용)
CREATE TABLE buyers (id TEXT PRIMARY KEY,             -- uuid4 (Phase 5 로그인 도입 시 auth 매핑)
  org_name TEXT, org_type TEXT,                       -- MART/FOODSERVICE
  region_sigungu TEXT, contact_email TEXT, created_at TEXT);
CREATE TABLE rfqs (id INTEGER PRIMARY KEY, buyer_id TEXT REFERENCES buyers(id),
  item TEXT NOT NULL, qty_value REAL NOT NULL, qty_unit TEXT NOT NULL,
  spec TEXT NOT NULL, grade TEXT NOT NULL,            -- 🟡 표준표 값만(자유 입력 금지)
  deliver_by TEXT NOT NULL, region_sigungu TEXT,
  price_band_low INTEGER, price_band_high INTEGER, price_band_basis TEXT,  -- 예측 근거+신뢰도 등급 문자열
  ai_draft INTEGER DEFAULT 0,                         -- AI 초안 사용 여부(KPI: 채택률)
  status TEXT NOT NULL DEFAULT 'OPEN',                -- OPEN/CLOSED/AWARDED/EXPIRED
  sim_ref TEXT, created_at TEXT, closes_at TEXT);
CREATE TABLE bids (id INTEGER PRIMARY KEY, rfq_id INTEGER REFERENCES rfqs(id),
  farm_id TEXT REFERENCES farms(id),
  unit_price INTEGER NOT NULL, avail_qty REAL NOT NULL,   -- 농가 입력은 이 2필드뿐
  proposal_md TEXT, ai_draft INTEGER DEFAULT 1,           -- AI 자동 제안서(농가 수정 가능)
  status TEXT NOT NULL DEFAULT 'SUBMITTED',               -- SUBMITTED/WITHDRAWN/AWARDED/LOST
  created_at TEXT, UNIQUE(rfq_id, farm_id));              -- 농가당 1입찰(수정=갱신)
CREATE TABLE awards (id INTEGER PRIMARY KEY, rfq_id INTEGER UNIQUE REFERENCES rfqs(id),
  bid_id INTEGER REFERENCES bids(id),
  confirm_json TEXT NOT NULL,                         -- 거래 확인서 스냅샷(품목·수량·규격·등급·단가·총액·납기·양측 상호)
  awarded_at TEXT);                                   -- trade_ledger(납품 확정·회계)는 Phase 9b
```

## 3. 백엔드 라우터 marketplace_router.py (main.py엔 include 1줄만)

- `POST /api/mkt/farms` 농가 등록(상점 신청) → PENDING / `GET /api/mkt/farms?item=&region=` 승인 농가 디렉토리(공개 필드만) / `POST /api/mkt/admin/farms/{id}/approve` (X-Admin-Token, 🟡 심사는 사람)
- `POST /api/mkt/buyers` 수요자 간이 등록(서버 uuid4 — Phase 5 전 임시)
- `POST /api/mkt/rfqs` RFQ 게시(표준표 값 검증, closes_at 기본 72h) / `GET /api/mkt/rfqs?farm_id=` 농가별 조건 적합(품목×권역) OPEN 목록 = **입찰함(폴링)** / `GET /api/mkt/rfqs/{id}` 상세 — **농가 열람 시 AI 분석 요약 동봉**(적정가 밴드·최근 시세 추이·이벤트 신호·신뢰도 등급·"참고용" 라벨 — 양방향 문서 교환, PRD §15.2-3 v6.1 / 숨고 요청서 패턴)
- `POST /api/mkt/rfqs/draft` **AI RFQ 초안**: 입력(품목·수량·납기·sim_ref) → 예측 API(기존 라이브) 조회 → 밴드+근거+신뢰도 등급 → 초안 JSON. 신뢰도 3등급 이하면 `price_band: null, reason` 반환.
- `POST /api/mkt/bids` 입찰(2필드) → 서버가 AI 제안서 생성 첨부(farms 공개 정보 기반, 농가 수정 가능) / `GET /api/mkt/rfqs/{id}/bids` 비교표(buyer 본인만): 단가·총액·**당일 도매가 대비 절감률**(기존 시세 API)·인증·권역 + **추천 근거 자연어 1문장**(9a 스코어 = 가격+권역+인증 규칙 기반 — 거래 이력 없으므로. "AI 스코어" 과장 표기 금지)
- `POST /api/mkt/rfqs/{id}/award {bid_id}` → 사람 확정 → awards 생성(confirm_json 스냅샷)·rfq AWARDED·해당 bid AWARDED·나머지 LOST → 양측 조회 가능한 거래 확인서 `GET /api/mkt/awards/{id}` (본인 거래만)
- **B2AI(§15.2-3):** 위 공개 조회·게시 엔드포인트는 OpenAPI 자동 스펙에 자연어 description·단위·통화 명시(기존 48개 엔드포인트 관례). MCP 도구 등록은 기존 21개 도구 등록 패턴 재사용 — `mkt_search_rfqs`·`mkt_create_rfq_draft` 2종만 9a 범위.
- **만료 처리:** 기존 APScheduler에 잡 1개 — `closes_at<now & OPEN → EXPIRED`(입찰 0건 KPI 카운트).

## 4. 프론트 (공개 대시보드 탭 확장 — 단일 HTML 관례 유지)

- **S-009 (수요자):** 시뮬레이터 결과 카드에 "직거래 입찰 받기" 버튼 → RFQ 초안 폼(AI 초안 프리필, 수정 가능, `ai_draft` 플래그) → 게시 → 내 RFQ 목록·입찰 비교표(카드↔표 전환, S-000 패턴 재사용)·낙찰 버튼(확인 모달 — 거래 확인서 미리보기).
- **S-010 (농가):** 기존 S-003 농가 직거래 탭의 공급자 모드 확장 — 상점 신청 폼·입찰함(적합 RFQ 목록)·2필드 입찰 + AI 제안서 미리보기/수정·내 입찰 현황.
- 빈 상태 정직 표기: "아직 입찰이 없습니다 · 마감까지 N시간"(가짜 활성도 연출 금지). 상태색은 정보 신호로만(13절).

## 5. 검증 (DB 증거 필수 — 추정 보고 불가)

1. **왕복 성사:** 테스트 buyer·farm 2계정으로 RFQ 게시→입찰→비교표→낙찰. 완료: `rfqs.AWARDED`+`awards.confirm_json`+`bids` AWARDED/LOST (DB 조회).
2. **권한 격리:** 타인 RFQ의 비교표·타인 거래 확인서 조회 → 403. 미승인(PENDING) 농가 입찰 → 400.
3. **표준표 검증:** 자유 입력 grade/spec → 400. 농가당 중복 입찰 → 갱신(UNIQUE 확인, 중복 row 없음).
4. **AI 가드레일:** 신뢰도 3등급 이하 품목 RFQ 초안 → price_band null + 사유. 초안·제안서 응답에 "참고용" 라벨 문자열 포함 확인.
5. **만료:** closes_at 경과 → EXPIRED 전환(스케줄러 로그).
6. 모바일 375px 수동 체크(비교표 카드 뷰).

## 6. 롤백

파일 추가형 → main.py include 1줄 제거로 마켓플레이스 비활성. `marketplace.db` 분리라 기존 데이터 무관. 프론트 탭은 feature flag(상수 1개)로 숨김. 영향 0.

## 부록 A. 개인정보(08.7) 정합
공개=상호·시군구·품목·출하 일정. 이메일은 알림용 비공개, 로그 레드액션. 경영체번호 원본 미보존(심사 시 서류 확인 후 boolean). 거래 확인서의 상호는 낙찰 당사자 간에만. AI 초안 생성 시 LLM에 개인 식별 정보 미전송(상점 공개 필드만).

## 부록 B. 안전 요약 · 이후 로드맵
변경 = 신규 라우터 + marketplace.db + 대시보드 탭 + include 1줄(기존 무접촉) / 무과금·무결제 / 자동 낙찰 없음 / 롤백 = include 제거·영향 0.
**이후 별도 지시서:** Phase 9b 장부·회계(trade_ledger·의제매입세액공제 리포트 — 공제율·한도는 2026 세법 개정 반영 config, "참고용·세무사 확인" 라벨 강제) + **거래 문의 스레드(플랫폼 내 메시지 — 연락처 비공개 유지, 숨고 채팅 패턴) + 거래 사실 기반 평판(무분쟁·납기 준수율)** · Phase 9c 실거래 검증 · Phase 5 로그인 연동 시 buyers/farms ↔ auth 매핑 · 경영체번호 자동 검증 API는 실시간 조회 API 확보 확인 후 승격(9a는 서류+사람 심사).
**과금 원칙(숨고와 의도적 차이, PRD §15.7):** 입찰 발송 과금(크레딧 선불) 금지 — 공급 콜드스타트 보호. 과금은 낙찰 성사 수수료만, 그것도 9a 이후 사업 결정.

*발행: 김영도 · AgriY&D / farmtempo Phase 9a 직거래 RFQ 마켓플레이스 — PRD v6 §15 근거 (2026-07-23)*
