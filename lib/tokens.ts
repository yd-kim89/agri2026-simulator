// Apple 디자인 토큰 (PRD 13절) — 외부 CDN 무의존, 인라인 스타일용 상수
// 원칙: 인터랙션 색 = Action Blue 단일 / 상태색 = 정보 신호로만 / 두 문법 불혼합

export const T = {
  // 색 — 단일 액센트
  primary: "#0066cc", // Action Blue — 모든 인터랙션
  primaryFocus: "#0071e3", // 포커스 링
  primaryOnDark: "#2997ff", // 어두운 타일 위 링크
  ink: "#1d1d1f", // 헤드라인·본문 (순검정 아님)
  inkMuted: "#6e6e73", // 보조 텍스트
  inkFaint: "rgba(29,29,31,0.48)", // 캡션·비활성
  bodyMuted: "#cccccc", // 어두운 타일 보조 카피
  canvas: "#ffffff",
  parchment: "#f5f5f7", // 시그니처 오프화이트
  tileDark1: "#272729",
  tileDark2: "#2a2a2c",
  tileDark3: "#252527",
  black: "#000000", // 글로벌 내비
  hairline: "#e0e0e0",
  dividerSoft: "#f0f0f0",

  // 상태색 (정보 신호 전용 — 인터랙션 아님)
  signalUp: "#c93030", // 급등/빗나감
  signalDown: "#157f3c", // 하락·매입기회/적중
  signalUpBg: "#faeceb",
  signalDownBg: "#e7f3ec",

  // 라운드
  rSm: "8px",
  rMd: "11px",
  rLg: "18px",
  rPill: "9999px",

  // 폰트 스택 (SF Pro → Inter 폴백, 외부 CDN은 layout에서 preconnect)
  font: "'SF Pro Display','SF Pro Text',-apple-system,BlinkMacSystemFont,'Inter','Malgun Gothic',sans-serif",
} as const;

// 신뢰도 5등급 → 별
export function stars(grade: number): string {
  if (grade <= 0) return "—";
  const g = Math.max(0, Math.min(5, grade));
  return "★★★★★".slice(0, g) + "☆☆☆☆☆".slice(0, 5 - g);
}
