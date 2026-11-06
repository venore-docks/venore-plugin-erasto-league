import { describe, expect, it } from "vitest";
import { computeBracketTreeLayout } from "./bracket-tree-layout";
import type { FixturePhase } from "../contracts/types";

type TestFixture = {
  id: string;
  sortOrder: number;
  homeSlug: string | null;
  awaySlug: string | null;
  homeScore: number | null;
  awayScore: number | null;
  played: boolean;
};

function fx(id: string, sortOrder: number, overrides: Partial<TestFixture> = {}): TestFixture {
  return {
    id,
    sortOrder,
    homeSlug: `${id}-home`,
    awaySlug: `${id}-away`,
    homeScore: null,
    awayScore: null,
    played: false,
    ...overrides,
  };
}

function round(phase: FixturePhase, fixtures: TestFixture[]): { phase: FixturePhase; fixtures: TestFixture[] } {
  return { phase, fixtures };
}

// Fixtures "genéricas" (sem placar) só pra testar estrutura — usadas pelos testes que já existiam.
function unplayedRound(phase: FixturePhase, count: number): { phase: FixturePhase; fixtures: TestFixture[] } {
  return round(
    phase,
    Array.from({ length: count }, (_, i) => fx(`${phase}-${i + 1}`, i + 1)),
  );
}

describe("computeBracketTreeLayout", () => {
  it("sem rodadas: só a final sozinha no centro", () => {
    const layout = computeBracketTreeLayout([round("final", [fx("final-1", 1)])]);
    expect(layout.totalCols).toBe(0);
    expect(layout.nodes).toHaveLength(0);
    expect(layout.finalNode?.fixture.id).toBe("final-1");
  });

  it("4 quartas + 2 semifinais + final: espelhado, 1-2 na esquerda e 3-4 na direita (sem resultado ainda cai pra posição)", () => {
    const layout = computeBracketTreeLayout([unplayedRound("quarterfinal", 4), unplayedRound("semifinal", 2), unplayedRound("final", 1)]);

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
    const layout = computeBracketTreeLayout([unplayedRound("quarterfinal", 4), unplayedRound("semifinal", 2), unplayedRound("final", 1)]);
    const toSemifinal1 = layout.links.filter((link) => link.id === "quarterfinal-1" || link.id === "quarterfinal-2");
    expect(toSemifinal1).toHaveLength(2);
    expect(toSemifinal1[0].y2).toBeCloseTo(toSemifinal1[1].y2);
    expect(toSemifinal1[0].x2).toBe(toSemifinal1[1].x2);
  });

  it("só semifinal + final (sem quartas): 1 rodada de cada lado", () => {
    const layout = computeBracketTreeLayout([unplayedRound("semifinal", 2), unplayedRound("final", 1)]);
    expect(layout.totalCols).toBe(2);
    expect(layout.totalRows).toBe(1);
    const byId = new Map(layout.nodes.map((n) => [n.fixture.id, n]));
    expect(byId.get("semifinal-1")).toMatchObject({ side: "left", col: 0, row: 0.5 });
    expect(byId.get("semifinal-2")).toMatchObject({ side: "right", col: 2, row: 0.5 });
    expect(layout.finalNode).toMatchObject({ col: 1, row: 0.5 });
  });

  // Bug real: a semifinal foi cadastrada numa ordem (sortOrder) que não bate com a convenção
  // "metade esquerda, metade direita" das quartas — SF1 (sortOrder 1) é o confronto entre o
  // vencedor da 2ª quarta e o vencedor da 3ª, SF2 entre o vencedor da 1ª e o da 4ª. Repartir cada
  // rodada em metades por posição (jeito antigo) desenhava as quartas erradas do lado da semifinal
  // que na verdade não alimenta — times de lados diferentes apareciam "casados" na mesma semifinal
  // visualmente só porque calhou de sortOrder.
  it("casa pelo TIME vencedor, não pela posição — corrige quartas 'cruzadas' com a semifinal", () => {
    const quarterfinals = round("quarterfinal", [
      fx("qf1", 1, { homeSlug: "smurfs", awaySlug: "gotham", homeScore: 3, awayScore: 0, played: true }),
      fx("qf2", 2, { homeSlug: "varzea", awaySlug: "baile", homeScore: 1, awayScore: 3, played: true }),
      fx("qf3", 3, { homeSlug: "katchau", awaySlug: "chamas", homeScore: 3, awayScore: 2, played: true }),
      fx("qf4", 4, { homeSlug: "flamingos", awaySlug: "bananaticos", homeScore: 2.5, awayScore: 2, played: true }),
    ]);
    // sortOrder da semifinal não segue "sf1 = qf1+qf2, sf2 = qf3+qf4" — sf1 na verdade é
    // baile(qf2, esquerda) vs katchau(qf3, direita), sf2 é smurfs(qf1, esquerda) vs flamingos(qf4, direita).
    const semifinals = round("semifinal", [
      fx("sf1", 1, { homeSlug: "baile", awaySlug: "katchau", homeScore: 5.5, awayScore: 8, played: true }),
      fx("sf2", 2, { homeSlug: "smurfs", awaySlug: "flamingos", played: false }),
    ]);
    const final = round("final", [fx("final", 1, { awaySlug: "katchau" })]);

    const layout = computeBracketTreeLayout([quarterfinals, semifinals, final]);
    const byId = new Map(layout.nodes.map((n) => [n.fixture.id, n]));

    // sf1 (baile x katchau) fica no mesmo lado de qf2 (baile) e qf3 (katchau) — não no lado de qf1/qf2
    // só porque "sortOrder 1" por coincidência bateria com isso no jeito antigo.
    const sf1Side = byId.get("sf1")!.side;
    const sf2Side = byId.get("sf2")!.side;
    expect(sf1Side).not.toBe(sf2Side);
    expect(byId.get("qf2")!.side).toBe(sf1Side);
    expect(byId.get("qf3")!.side).toBe(sf1Side);
    expect(byId.get("qf1")!.side).toBe(sf2Side);
    expect(byId.get("qf4")!.side).toBe(sf2Side);

    // As linhas de qf2 e qf3 convergem pro MESMO ponto (sf1) — a "casa de verdade" da chave.
    const linksToSf1 = layout.links.filter((link) => link.id === "qf2" || link.id === "qf3");
    expect(linksToSf1).toHaveLength(2);
    expect(linksToSf1[0].x2).toBe(linksToSf1[1].x2);
    expect(linksToSf1[0].y2).toBeCloseTo(linksToSf1[1].y2);
  });

  it("sem resultado nenhum ainda, cai pra posição (não tem como saber quem casa com quem)", () => {
    const quarterfinals = round("quarterfinal", [fx("qf1", 1), fx("qf2", 2), fx("qf3", 3), fx("qf4", 4)]);
    const semifinals = round("semifinal", [fx("sf1", 1), fx("sf2", 2)]);
    const layout = computeBracketTreeLayout([quarterfinals, semifinals, round("final", [fx("final", 1)])]);
    const byId = new Map(layout.nodes.map((n) => [n.fixture.id, n]));
    expect(byId.get("qf1")!.side).toBe(byId.get("qf2")!.side);
    expect(byId.get("qf3")!.side).toBe(byId.get("qf4")!.side);
    expect(byId.get("qf1")!.side).not.toBe(byId.get("qf3")!.side);
  });
});
