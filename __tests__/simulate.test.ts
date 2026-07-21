import { describe, it, expect } from "vitest";
import { simulate, toLlmSchema } from "../lib/simulate";
import { ITEMS, findItem, topFalls, topRises } from "../lib/data";

describe("simulate — 기본 구조", () => {
  it("항상 3개 시나리오 카드를 반환한다", () => {
    const r = simulate({ item: "배추", quantity: 100 });
    expect(r.cards).toHaveLength(3);
    expect(r.cards.map((c) => c.id)).toEqual(["s1", "s2", "s3"]);
  });

  it("① 오늘 즉시는 라이브 실측, 신뢰도 5", () => {
    const r = simulate({ item: "양파", quantity: 10 });
    expect(r.cards[0].source).toContain("실측");
    expect(r.cards[0].confidence).toBe(5);
    expect(r.cards[0].cost).toBe(10 * 980);
  });

  it("② 7일 대기는 단기예측 API(h=7) 출처", () => {
    const r = simulate({ item: "양파", quantity: 10 });
    expect(r.cards[1].source).toContain("h=7");
  });
});

describe("simulate — 이벤트 계수 분기 (가격 트리거 ↔ 수요 플래그 분리)", () => {
  it("배추(suppress) 역방향: cost=null·선매입 억제·deltaKind up", () => {
    const r = simulate({ item: "배추", quantity: 100 });
    const s3 = r.cards[2];
    expect(s3.eventKind).toBe("suppress");
    expect(s3.cost).toBeNull();
    expect(s3.deltaLabel).toBe("선매입 억제");
    expect(s3.deltaKind).toBe("up");
    expect(s3.detail).toContain("−40.7%");
  });

  it("사과(surge): 선매입 권고·절감액 양수", () => {
    const r = simulate({ item: "사과", quantity: 20 });
    const s3 = r.cards[2];
    expect(s3.eventKind).toBe("surge");
    expect(s3.cost).not.toBeNull();
    expect(s3.deltaLabel).toContain("예상 절감 +");
    // 절감액 = 오늘가 × 10%
    const expectedSaving = Math.round(20 * 46000 * 0.1);
    expect(s3.deltaLabel).toContain(expectedSaving.toLocaleString("ko-KR"));
  });

  it("대파(surge): 선매입 권고", () => {
    const r = simulate({ item: "대파", quantity: 60 });
    expect(r.cards[2].eventKind).toBe("surge");
  });

  it("양파(none): 해당 없음·신뢰도 0", () => {
    const r = simulate({ item: "양파", quantity: 10 });
    const s3 = r.cards[2];
    expect(s3.eventKind).toBe("none");
    expect(s3.deltaLabel).toBe("해당 없음");
    expect(s3.confidence).toBe(0);
    expect(s3.stars).toBe("—");
  });

  it("배추의 단일 명절 경보 뭉개짐 방어: surge와 다른 메시지", () => {
    const cabbage = simulate({ item: "배추", quantity: 100 }).cards[2];
    const apple = simulate({ item: "사과", quantity: 20 }).cards[2];
    expect(cabbage.deltaLabel).not.toBe(apple.deltaLabel);
    expect(cabbage.deltaKind).not.toBe(apple.deltaKind);
  });
});

describe("simulate — 최유리 판정 (verdict)", () => {
  it("7일 뒤 오르면(사과) 오늘 매입이 최유리", () => {
    const r = simulate({ item: "사과", quantity: 20 });
    expect(r.bestIndex).toBe(0);
    expect(r.verdict).toContain("오늘 사세요");
  });

  it("7일 뒤 내리면(대파) 대기가 최유리", () => {
    const r = simulate({ item: "대파", quantity: 60 });
    expect(r.bestIndex).toBe(1);
    expect(r.verdict).toContain("기다리세요");
  });
});

describe("simulate — 신뢰도/참고용 워터마크", () => {
  it("배추(conf 2)는 ② 참고용 강제", () => {
    const r = simulate({ item: "배추", quantity: 100 });
    expect(r.cards[1].refOnly).toBe(true);
  });

  it("양파(conf 5)는 ② 참고용 아님", () => {
    const r = simulate({ item: "양파", quantity: 10 });
    expect(r.cards[1].refOnly).toBe(false);
  });

  it("API 장애 시 ②는 참고용으로 강등 (graceful degradation)", () => {
    const r = simulate({ item: "양파", quantity: 10, apiDown: true });
    expect(r.cards[1].refOnly).toBe(true);
    expect(r.apiDown).toBe(true);
  });
});

describe("simulate — 마진율 (판매 예정가)", () => {
  it("판매가 입력 시 마진율 산출", () => {
    const r = simulate({ item: "배추", quantity: 100, salePrice: 1200 });
    // 오늘가 854 → 마진 (1200-854)/1200 ≈ 29%
    expect(r.cards[0].marginPct).toBe(29);
  });

  it("판매가 미입력 시 마진 null", () => {
    const r = simulate({ item: "배추", quantity: 100 });
    expect(r.cards[0].marginPct).toBeNull();
  });

  it("판매가 0/음수는 null 처리", () => {
    expect(simulate({ item: "배추", quantity: 100, salePrice: 0 }).cards[0].marginPct).toBeNull();
    expect(simulate({ item: "배추", quantity: 100, salePrice: -5 }).cards[0].marginPct).toBeNull();
  });
});

describe("simulate — 입력 방어", () => {
  it("수량 0/음수/NaN은 1로 방어", () => {
    expect(simulate({ item: "배추", quantity: 0 }).quantity).toBe(1);
    expect(simulate({ item: "배추", quantity: -10 }).quantity).toBe(1);
    expect(simulate({ item: "배추", quantity: NaN }).quantity).toBe(1);
  });

  it("code 또는 이름 모두로 조회 가능", () => {
    expect(simulate({ item: "cabbage", quantity: 1 }).item).toBe("배추");
    expect(simulate({ item: "배추", quantity: 1 }).item).toBe("배추");
  });

  it("알 수 없는 품목은 throw", () => {
    expect(() => simulate({ item: "존재안함", quantity: 1 })).toThrow();
  });
});

describe("toLlmSchema — LLM-Friendly 응답 (PRD 08절)", () => {
  it("필수 필드·단위·신뢰도 스케일 노출", () => {
    const r = simulate({ item: "사과", quantity: 20, targetDate: "2026-09-11" });
    const llm = toLlmSchema(r);
    expect(llm.item).toBe("사과");
    expect(llm.scenarios).toHaveLength(3);
    for (const s of llm.scenarios) {
      expect(s.unit).toBe("KRW");
      expect(s.confidence_scale).toBe("1(낮음)~5(높음)");
      expect(typeof s.recommendation).toBe("string");
      expect(typeof s.description).toBe("string");
    }
  });

  it("사과 이벤트 시나리오 recommendation = 선매입 권고", () => {
    const llm = toLlmSchema(simulate({ item: "사과", quantity: 20 }));
    expect(llm.scenarios[2].recommendation).toBe("선매입 권고");
    expect(llm.scenarios[2].expected_saving_krw).toBeGreaterThan(0);
  });

  it("배추 이벤트 recommendation = 선매입 억제", () => {
    const llm = toLlmSchema(simulate({ item: "배추", quantity: 100 }));
    expect(llm.scenarios[2].recommendation).toBe("선매입 억제");
  });

  it("best_scenario가 카드와 일치", () => {
    const r = simulate({ item: "대파", quantity: 60 });
    const llm = toLlmSchema(r);
    expect(llm.best_scenario).toBe("wait_7d");
  });
});

describe("data — 시세보드 액션 스트립", () => {
  it("하락 TOP3는 등락률 오름차순 3개", () => {
    const f = topFalls();
    expect(f.length).toBeLessThanOrEqual(3);
    for (const g of f) expect(g[2]).toBeLessThan(0);
    if (f.length > 1) expect(f[0][2]).toBeLessThanOrEqual(f[1][2]);
  });

  it("급등은 +2% 초과만", () => {
    for (const g of topRises()) expect(g[2]).toBeGreaterThan(2);
  });

  it("findItem: code·이름 모두 지원, 없으면 undefined", () => {
    expect(findItem("onion")?.name).toBe("양파");
    expect(findItem("양파")?.code).toBe("onion");
    expect(findItem("없음")).toBeUndefined();
  });

  it("모든 품목은 필수 필드를 가진다", () => {
    for (const it of ITEMS) {
      expect(it.today).toBeGreaterThan(0);
      expect(["surge", "suppress", "none"]).toContain(it.event.kind);
    }
  });
});
