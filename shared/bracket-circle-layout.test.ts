import { describe, expect, it } from "vitest";
import { computeBracketCircleLayout, FINAL_NODE, pairOffset } from "./bracket-circle-layout";
import type { FixturePhase } from "../contracts/types";

type TestFixture = { id: string; sortOrder: number };

function round(phase: FixturePhase, count: number): { phase: FixturePhase; fixtures: TestFixture[] } {
  // sortOrder em ordem decrescente de propósito — computeBracketCircleLayout reordena por conta
  // própria (campo "Ordem" do admin, não a ordem de cadastro no array).
  return { phase, fixtures: Array.from({ length: count }, (_, i) => ({ id: `${phase}-${count - i}`, sortOrder: count - i })) };
}

describe("computeBracketCircleLayout", () => {
  it("sem final: um anel só, sem link nenhum", () => {
    const { rings, links, finalFixture } = computeBracketCircleLayout([round("quarterfinal", 4)]);
    expect(rings).toHaveLength(1);
    expect(rings[0].nodes).toHaveLength(4);
    expect(finalFixture).toBeNull();
    expect(links).toHaveLength(0);
  });

  it("reordena cada anel pelo sortOrder (1º+2º do anel de fora casam com o 1º do seguinte)", () => {
    const { rings } = computeBracketCircleLayout([round("quarterfinal", 4)]);
    expect(rings[0].nodes.map((n) => n.fixture.id)).toEqual(["quarterfinal-1", "quarterfinal-2", "quarterfinal-3", "quarterfinal-4"]);
  });

  it("liga cada rodada até a final — inclusive a mais interna (gap que escondia o chaveamento incompleto)", () => {
    const knockout = [round("quarterfinal", 4), round("semifinal", 2), round("final", 1)];
    const { rings, links, finalFixture } = computeBracketCircleLayout(knockout);

    expect(finalFixture).not.toBeNull();
    // 4 confrontos de quartas → semifinal, 2 de semifinal → final: 6 links no total.
    expect(links).toHaveLength(6);

    const semifinalIds = rings.find((r) => r.phase === "semifinal")!.nodes.map((n) => n.fixture.id);
    const linksFromSemifinal = links.filter((link) => semifinalIds.includes(link.id));
    expect(linksFromSemifinal).toHaveLength(2);
    // Os dois links da semifinal convergem pro MESMO ponto (o nó fixo da final).
    for (const link of linksFromSemifinal) {
      expect(link.x2).toBeCloseTo(FINAL_NODE.cx);
      expect(link.y2).toBeCloseTo(FINAL_NODE.cy);
    }
  });

  it("anel mais de fora tem raio maior que o mais de dentro", () => {
    const knockout = [round("quarterfinal", 4), round("semifinal", 2)];
    const { rings } = computeBracketCircleLayout(knockout);
    const [outer, inner] = rings;
    expect(outer.radius).toBeGreaterThan(inner.radius);
  });
});

describe("pairOffset", () => {
  it("desloca perpendicular ao ângulo, simétrico nos dois lados", () => {
    const { dx, dy } = pairOffset(0, 10);
    // ângulo 0 (eixo +x, "leste") → deslocamento no eixo y.
    expect(dx).toBeCloseTo(0);
    expect(Math.abs(dy)).toBeGreaterThan(0);
  });
});
