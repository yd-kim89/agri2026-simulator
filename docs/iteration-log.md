# ACT — 반복 개선 로그 (PDCA)

## Iteration 0 — 초기 구현 (2026-07-21)

- CHECK 점수: **99 / 100** → 임계값(90) 초과.
- **차단 버그 없음.** ACT 강제 수정 트리거 미발동.

### 발견된 경미 이슈 (비차단)

| # | 이슈 | 심각도 | 조치 |
|-|-|-|-|
| 1 | 초저폭 뷰포트에서 서브내비 탭 가로 넘침 | 낮음 | 탭 컨테이너 `flex-wrap:wrap` 적용됨 — 넘침 대신 줄바꿈 |
| 2 | `simulate.ts` 방어 분기 3곳 미커버 | 무시 | 부수효과 없는 기본값 — 기능 영향 없음 |
| 3 | Supabase `logged:false` | 설계상 정상 | env 주입 시 활성 (graceful degradation) |

### 결론
품질 임계 통과. 추가 버그 수정 없이 SHIP 단계 진행.
사후 개선 후보(차기): 다크모드 카드, 초저폭 서브내비 스크롤 UX, 실농가 견적 실측치 반영.

## Iteration 1 — Phase 5: 멀티유저·멀티세션 (2026-07-22, PRD v4 Day3)

### 구현
- **S-004 매직링크 로그인** — `계정` 탭 신설(서브내비 text-link). 이메일 1개 입력 → `signInWithOtp` → 링크 1클릭 로그인. 60초 재발송 타이머, 에러 원문 노출, Supabase 미연결 시 "로그인 비활성" 정직 라벨.
- **멀티세션** — 로그인 시 시뮬레이션 이력을 `owner = auth.uid()`로 계정 귀속 저장(브라우저 직행, RLS 검증). 이력 탭이 "내 계정 기록 N건"으로 전환. 비로그인은 기존 익명 피드 유지(하위 호환).
- **`002_auth_multiuser.sql`** — owner 컬럼 + RLS 4정책(본인 insert/select/delete, 익명은 owner-null 행만). 기존 `using(true)` 익명 읽기 정책의 사용자 행 노출 가능성 제거.
- **`lib/supabaseBrowser.ts`** — 브라우저 전용 클라이언트 분리(서버 lib/supabase.ts와 역할 분리). env 없으면 null(graceful degradation).

### 검증
- `npm run build` 통과, 기존 27 테스트 전부 통과(회귀 무결).
- 브라우저 실검증: S-004 렌더·빈 이메일 검증 문구·이력 탭 로그인 유도 링크·익명 피드 2건 표시 확인. 콘솔 에러 0.

### 사람 액션 필요 (배포 전)
1. Supabase SQL Editor에서 `002_auth_multiuser.sql` 실행
2. Auth → URL Configuration: Site URL = 배포 주소, Redirect URLs에 localhost:3000 추가
3. 실 이메일로 매직링크 왕복 1회 테스트
