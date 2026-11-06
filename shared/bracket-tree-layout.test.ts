import { describe, expect, it } from "vitest";
import { computeBracketTreeLayout } from "./bracket-tree-layout";
import type { FixturePhase } from "../contracts/types";

type TestFixture = { id: string; sortOrder: number };

function round(phase: FixturePhase, count: number): { phase: FixturePhase; fixtures: TestFixture[] } {
  return { phase, fixtures: Array.from({ length: count }, (_, i) => ({ id: `${phase}-${i + 1}`, sortOrder: i + 1 })) };
}

describe("computeBracketTreeLayout", () => {
  it("sem rodadas: só a final sozinha no centro", () => {
    const layout = computeBracketTreeLayout([round("final", 1)]);
    expect(layout.totalCols).toBe(0);
    expect(layout.nodes).toHaveLength(0);
    expect(layout.finalNode?.fixture.id).toBe("final-1");
  });

  it("4 quartas + 2 semifinais + final: espelhado, 1-2 na esquerda e 3-4 na direita", () => {
    const layout = computeBracketTreeLayout([round("quarterfinal", 4), round("semifinal", 2), round("final", 1)]);

    expect(layout.totalCols).toBe(4); // QF(0) SF(1) FINAL(2) SF(3) QF(4)
    expect(layout.totalRows).toBe(2);

    const byId = new Map(layout.nodes.map((n) => [n.fixture.id, n]));
    expect(byId.get("quarterfinal-1")).toMatchObject({ side: "left", col: 0 });
    expect(byId.get("quarterfinal-2")).toMatchObject({ side: "left", col: 0 });
    expect(byId.get("quarterfinal-3")).toMatchObject({ side: "right", col: 4 });
    expect(byId.get("quarterfinal-4")).toMatchObject({ side: "right", col: 4 });
    expect(byId.get("semifinal-1")).toMatchObject({ side: "left", col: 1 });
    expect(byId.get("semifinal-2")).toMatchObject({ side: "right", col: 3 });

    expect(layout.finalNode).toMatchObject({ col: 2 });
    // Final fica na média vertical das duas semifinais que a alimentam — ambas convergem pro meio.
    expect(layout.finalNode!.row).toBeCloseTo((byId.get("semifinal-1")!.row + byId.get("semifinal-2")!.row) / 2);

    // 4 links quartas→semi + 2 links semi→final = 6.
    expect(layout.links).toHaveLength(6);
    const linksToFinal = layout.links.filter((link) => link.x2 === 2);
    expect(linksToFinal).toHaveLength(2);
    expect(linksToFinal[0].y2).toBeCloseTo(linksToFinal[1].y2);
  });

  it("1,2 convergem no mesmo ponto da semifinal (linha em V clássica)", () => {
    const layout = computeBracketTreeLayout([round("quarterfinal", 4), round("semifinal", 2), round("final", 1)]);
    const toSemifinal1 = layout.links.filter((link) => link.id === "quarterfinal-1" || link.id === "quarterfinal-2");
    expect(toSemifinal1).toHaveLength(2);
    expect(toSemifinal1[0].y2).toBeCloseTo(toSemifinal1[1].y2);
    expect(toSemifinal1[0].x2).toBe(toSemifinal1[1].x2);
  });

  it("só semifinal + final (sem quartas): 1 rodada de cada lado", () => {
    const layout = computeBracketTreeLayout([round("semifinal", 2), round("final", 1)]);
    expect(layout.totalCols).toBe(2);
    expect(layout.totalRows).toBe(1);
    const byId = new Map(layout.nodes.map((n) => [n.fixture.id, n]));
    expect(byId.get("semifinal-1")).toMatchObject({ side: "left", col: 0, row: 0.5 });
    expect(byId.get("semifinal-2")).toMatchObject({ side: "right", col: 2, row: 0.5 });
    expect(layout.finalNode).toMatchObject({ col: 1, row: 0.5 });
  });
});
