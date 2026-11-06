import type { FixturePhase } from "../contracts/types";

export type BracketTreeFixture = {
  id: string;
  sortOrder: number;
  // Identidade de quem joga (slug do time) — usada pra achar quais confrontos da rodada anterior
  // alimentam este de verdade (pelo TIME vencedor), não pela posição no array.
  homeSlug: string | null;
  awaySlug: string | null;
  homeScore: number | null;
  awayScore: number | null;
  played: boolean;
};

// "final" só é usado pelo nó sintético que blocks/bracket-tree.tsx e routes/tv/bracket-tree-tv.tsx
// montam pra desenhar a final junto dos outros nós (computeBracketTreeLayout nunca produz esse
// valor sozinho — a final mora em `finalNode`, fora de `nodes`).
export type BracketTreeSide = "left" | "right" | "final";

export type BracketTreeNode<F extends BracketTreeFixture> = {
  fixture: F;
  side: BracketTreeSide;
  // 0 = rodada mais externa desse lado (primeira), crescendo rumo ao centro.
  round: number;
  // Coluna absoluta no grid (0..totalCols — a final mora sozinha na coluna do meio).
  col: number;
  // Linha vertical contínua (não inteira — rodadas internas ficam no meio das duas que alimentam).
  row: number;
};

export type BracketTreeLink = { id: string; x1: number; y1: number; x2: number; y2: number };

export type BracketTreeLayout<F extends BracketTreeFixture> = {
  // Colunas 0..totalCols — a final mora sozinha na coluna do meio (totalCols / 2).
  totalCols: number;
  // Linhas 0..totalRows (o maior dos dois lados — o lado menor fica centralizado dentro disso).
  totalRows: number;
  nodes: BracketTreeNode<F>[];
  finalNode: { fixture: F; col: number; row: number } | null;
  links: BracketTreeLink[];
  // Uma entrada por COLUNA (os dois lados da mesma rodada têm a mesma fase) pro cabeçalho de cada
  // coluna (blocks/bracket-tree.tsx, routes/tv/bracket-tree-tv.tsx).
  columnPhases: { col: number; phase: FixturePhase }[];
};

// Slug de quem venceu este confronto — null enquanto não dá pra saber (não jogado, empate — não
// devia existir numa eliminatória, mas súmula malcadastrada acontece — ou algum lado ainda é só um
// rótulo "Vencedor Grupo A" sem time de verdade).
function winnerSlug<F extends BracketTreeFixture>(fixture: F): string | null {
  if (!fixture.played || fixture.homeScore == null || fixture.awayScore == null || fixture.homeScore === fixture.awayScore) return null;
  return fixture.homeScore > fixture.awayScore ? fixture.homeSlug : fixture.awaySlug;
}

// Confrontos da rodada ANTERIOR cujo vencedor é um dos dois lados de `child` — os pais de verdade
// dele, por TIME, não por posição no array. 0, 1 ou 2 resultados — menos de 2 quando a rodada
// anterior ainda não decidiu quem avança pra cá.
function findParents<F extends BracketTreeFixture>(child: F, previousRound: F[]): F[] {
  return previousRound.filter((parent) => {
    const winner = winnerSlug(parent);
    return winner !== null && (child.homeSlug === winner || child.awaySlug === winner);
  });
}

// Lado (esquerda/direita) de cada confronto, exceto a final — bug real que isso corrige: repartir
// CADA rodada em metades por sortOrder só dá a chave certa quando o sortOrder da rodada segue a
// MESMA convenção "metade esquerda, metade direita" da rodada mais externa. Se o admin cadastrou a
// semifinal em outra ordem (ex.: pela ordem que os jogos vão acontecer, não pelo lado da chave), um
// confronto podia sair com um vencedor de cada lado — visualmente "cruzado" com a rodada anterior.
//
// Em vez disso: a penúltima rodada (a que alimenta a final) tem exatamente 2 confrontos — um
// esquerda, um direita, por sortOrder (único nível sem "filho" de quem herdar o lado, então é
// convenção mesmo, não tem outra fonte de verdade). Daí pra fora (rumo à rodada mais externa), cada
// confronto herda o lado do FILHO que ele alimenta de verdade (por time vencedor, findParents) — só
// cai pra sortOrder/posição quando ainda não dá pra saber (rodada seguinte ainda não decidida).
function assignSides<F extends BracketTreeFixture>(rounds: { fixtures: F[] }[]): Map<string, "left" | "right"> {
  const roundCount = rounds.length;
  const sideById = new Map<string, "left" | "right">();
  const preFinal = rounds[roundCount - 1].fixtures;
  preFinal.forEach((fixture, i) => sideById.set(fixture.id, i % 2 === 0 ? "left" : "right"));

  for (let r = roundCount - 1; r >= 1; r--) {
    const previousRound = rounds[r - 1].fixtures;
    for (const child of rounds[r].fixtures) {
      const side = sideById.get(child.id);
      if (!side) continue;
      for (const parent of findParents(child, previousRound)) sideById.set(parent.id, side);
    }
    // Sobrou alguém sem lado (a rodada anterior ainda não decidiu quem avança pra cá) — completa em
    // ordem de sortOrder, equilibrando os dois lados (metade pra cada, convenção de topo de sempre).
    const half = Math.ceil(previousRound.length / 2);
    let leftCount = previousRound.filter((fixture) => sideById.get(fixture.id) === "left").length;
    for (const fixture of previousRound) {
      if (sideById.has(fixture.id)) continue;
      if (leftCount < half) {
        sideById.set(fixture.id, "left");
        leftCount++;
      } else {
        sideById.set(fixture.id, "right");
      }
    }
  }
  return sideById;
}

type SideRow<F extends BracketTreeFixture> = { fixture: F; row: number; parentIds: string[] };

// Linha vertical de cada confronto DESTE lado, rodada por rodada — rodada mais externa igualmente
// espaçada; rodada mais interna sempre na média vertical de quem a alimenta de verdade (por time,
// findParents) — só cai pro "que sobrar" (próximos ainda não reivindicados, na ordem) quando a
// rodada anterior ainda não decidiu quem avança.
function buildSideRows<F extends BracketTreeFixture>(fixturesByRound: F[][], allRoundFixtures: F[][]): SideRow<F>[][] {
  const rowsByRound: SideRow<F>[][] = [];
  fixturesByRound.forEach((fixtures, r) => {
    if (r === 0) {
      rowsByRound.push(fixtures.map((fixture, i) => ({ fixture, row: i + 0.5, parentIds: [] })));
      return;
    }
    const previousRows = rowsByRound[r - 1];
    const previousRowById = new Map(previousRows.map((node) => [node.fixture.id, node]));
    const claimed = new Set<string>();
    const rows = fixtures.map((fixture) => {
      let parents = findParents(fixture, allRoundFixtures[r - 1]).filter((parent) => previousRowById.has(parent.id) && !claimed.has(parent.id));
      if (parents.length === 0) {
        parents = previousRows
          .filter((node) => !claimed.has(node.fixture.id))
          .slice(0, 2)
          .map((node) => node.fixture);
      }
      parents.forEach((parent) => claimed.add(parent.id));
      const parentRows = parents.map((parent) => previousRowById.get(parent.id)!.row);
      const row = parentRows.length > 0 ? parentRows.reduce((sum, value) => sum + value, 0) / parentRows.length : 0.5;
      return { fixture, row, parentIds: parents.map((parent) => parent.id) };
    });
    rowsByRound.push(rows);
  });
  return rowsByRound;
}

function buildSideLinks<F extends BracketTreeFixture>(rowsByRound: SideRow<F>[][], side: "left" | "right", maxCol: number): BracketTreeLink[] {
  const links: BracketTreeLink[] = [];
  for (let r = 1; r < rowsByRound.length; r++) {
    const col = side === "left" ? r : maxCol - r;
    const prevCol = side === "left" ? r - 1 : maxCol - (r - 1);
    const previousById = new Map(rowsByRound[r - 1].map((node) => [node.fixture.id, node.row]));
    for (const node of rowsByRound[r]) {
      for (const parentId of node.parentIds) {
        const parentRow = previousById.get(parentId);
        if (parentRow !== undefined) links.push({ id: parentId, x1: prevCol, y1: parentRow, x2: col, y2: node.row });
      }
    }
  }
  return links;
}

// Chave "espelhada" (estilo Copa do Mundo): metade dos confrontos converge pela esquerda, a outra
// metade pela direita, com a final sozinha no meio — substitui a chave circular (removida: times de
// rodadas vizinhas ficavam visualmente grudados, e o layout quadrado desperdiçava tela numa TV 16:9,
// que é larga). Reusada pelo bloco do site (blocks/bracket-tree.tsx, Tailwind) e pela TV
// (routes/tv/bracket-tree-tv.tsx, CSS própria).
export function computeBracketTreeLayout<F extends BracketTreeFixture>(
  knockout: { phase: FixturePhase; fixtures: F[] }[],
): BracketTreeLayout<F> {
  const rounds = knockout
    .filter((round) => round.phase !== "final")
    .map((round) => ({ phase: round.phase, fixtures: [...round.fixtures].sort((a, b) => a.sortOrder - b.sortOrder) }));
  const finalFixture = knockout.find((round) => round.phase === "final")?.fixtures[0] ?? null;
  const roundCount = rounds.length; // rodadas de cada lado, sem contar a final.

  if (roundCount === 0) {
    return {
      totalCols: 0,
      totalRows: 1,
      nodes: [],
      finalNode: finalFixture ? { fixture: finalFixture, col: 0, row: 0.5 } : null,
      links: [],
      columnPhases: [],
    };
  }

  const maxCol = roundCount * 2; // a final mora na coluna roundCount, bem no meio.
  const sideById = assignSides(rounds);
  const allRoundFixtures = rounds.map((round) => round.fixtures);

  const leftFixturesByRound = allRoundFixtures.map((fixtures) => fixtures.filter((fixture) => sideById.get(fixture.id) === "left"));
  const rightFixturesByRound = allRoundFixtures.map((fixtures) => fixtures.filter((fixture) => sideById.get(fixture.id) === "right"));

  const leftRows = buildSideRows(leftFixturesByRound, allRoundFixtures);
  const rightRows = buildSideRows(rightFixturesByRound, allRoundFixtures);

  const outerCount = (rows: SideRow<F>[][]) => rows[0]?.length ?? 0;
  const totalRows = Math.max(outerCount(leftRows), outerCount(rightRows), 1);

  // Cada lado foi construído de 0 até seu próprio outerCount — centraliza o lado menor dentro de
  // totalRows (quase sempre os dois são iguais, mas não trava se não forem).
  function recenter(rows: SideRow<F>[][]): SideRow<F>[][] {
    const offset = (totalRows - outerCount(rows)) / 2;
    if (offset === 0) return rows;
    return rows.map((round) => round.map((node) => ({ ...node, row: node.row + offset })));
  }

  const leftCentered = recenter(leftRows);
  const rightCentered = recenter(rightRows);

  const nodes: BracketTreeNode<F>[] = [];
  function emitSide(side: "left" | "right", rows: SideRow<F>[][]) {
    rows.forEach((round, r) => {
      const col = side === "left" ? r : maxCol - r;
      for (const node of round) nodes.push({ fixture: node.fixture, side, round: r, col, row: node.row });
    });
  }
  emitSide("left", leftCentered);
  emitSide("right", rightCentered);

  const links = [...buildSideLinks(leftCentered, "left", maxCol), ...buildSideLinks(rightCentered, "right", maxCol)];

  const leftInner = leftCentered[roundCount - 1]?.[0] ?? null;
  const rightInner = rightCentered[roundCount - 1]?.[0] ?? null;
  const finalRow = leftInner && rightInner ? (leftInner.row + rightInner.row) / 2 : (leftInner?.row ?? rightInner?.row ?? totalRows / 2);

  if (finalFixture) {
    if (leftInner) links.push({ id: leftInner.fixture.id, x1: roundCount - 1, y1: leftInner.row, x2: roundCount, y2: finalRow });
    if (rightInner) links.push({ id: rightInner.fixture.id, x1: maxCol - (roundCount - 1), y1: rightInner.row, x2: roundCount, y2: finalRow });
  }

  const columnPhases = [
    ...rounds.map((round, roundIndex) => ({ col: roundIndex, phase: round.phase })),
    ...rounds.map((round, roundIndex) => ({ col: maxCol - roundIndex, phase: round.phase })),
  ];

  return {
    totalCols: maxCol,
    totalRows,
    nodes,
    finalNode: finalFixture ? { fixture: finalFixture, col: roundCount, row: finalRow } : null,
    links,
    columnPhases,
  };
}
