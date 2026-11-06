import type { FixturePhase } from "../contracts/types";

export type BracketTreeFixture = { id: string; sortOrder: number };

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

type SideResult<F extends BracketTreeFixture> = {
  nodes: BracketTreeNode<F>[];
  // Só os links ENTRE rodadas do mesmo lado — o último salto (rodada mais interna → final) é
  // calculado depois, já com a posição vertical da final definida pelos dois lados.
  links: BracketTreeLink[];
  outerCount: number;
  innerFeed: { fixtureId: string; col: number; row: number } | null;
};

function buildSide<F extends BracketTreeFixture>(
  rounds: { phase: FixturePhase; fixtures: F[] }[],
  side: BracketTreeSide,
  maxCol: number,
): SideResult<F> {
  const nodes: BracketTreeNode<F>[] = [];
  const links: BracketTreeLink[] = [];
  let prevRows: number[] = [];
  let prevFixtures: F[] = [];
  let prevCol = 0;
  let outerCount = 0;

  // `for` em vez de `.forEach` de propósito: o TS não acompanha reatribuição de `let` feita dentro
  // de uma closure (forEach) entre uma iteração e a próxima — um loop de verdade evita a ginástica
  // de non-null assertion em prevRows/prevFixtures só pra contornar isso.
  for (let roundIndex = 0; roundIndex < rounds.length; roundIndex++) {
    const round = rounds[roundIndex];
    const half = Math.ceil(round.fixtures.length / 2);
    const fixtures = side === "left" ? round.fixtures.slice(0, half) : round.fixtures.slice(half);
    if (roundIndex === 0) outerCount = fixtures.length;

    const col = side === "left" ? roundIndex : maxCol - roundIndex;
    const rows = fixtures.map((_, i) => (roundIndex === 0 ? i + 0.5 : (prevRows[2 * i] + prevRows[2 * i + 1]) / 2));

    fixtures.forEach((fixture, i) => nodes.push({ fixture, side, round: roundIndex, col, row: rows[i] }));

    if (roundIndex > 0) {
      prevFixtures.forEach((prevFixture, i) => {
        links.push({ id: prevFixture.id, x1: prevCol, y1: prevRows[i], x2: col, y2: rows[Math.floor(i / 2)] });
      });
    }

    prevRows = rows;
    prevFixtures = fixtures;
    prevCol = col;
  }

  const innerFeed = prevFixtures.length > 0 ? { fixtureId: prevFixtures[0].id, col: prevCol, row: prevRows[0] } : null;

  return { nodes, links, outerCount, innerFeed };
}

// Chave "espelhada" (estilo Copa do Mundo): metade dos confrontos da rodada mais externa converge
// pela esquerda, a outra metade pela direita, com a final sozinha no meio — substitui a chave
// circular (shared/bracket-circle-layout.ts, removida: times de rodadas vizinhas ficavam visualmente
// grudados e o layout quadrado desperdiçava tela numa TV 16:9, que é larga). Reusada pelo bloco do
// site (blocks/bracket-tree.tsx, Tailwind) e pela TV (routes/tv/bracket-tree-tv.tsx, CSS própria).
//
// Lado de cada confronto: a METADE do array da rodada (por sortOrder), não um cálculo recursivo —
// o pareamento normal de chave (1,2,3,4 → 1 e 2 de um lado, 3 e 4 do outro) já cai exatamente nessa
// divisão quando o admin cadastra os confrontos em ordem de chave. A posição vertical de uma rodada
// mais interna é sempre a média das duas que a alimentam (centralização clássica de bracket).
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
  const left = buildSide(rounds, "left", maxCol);
  const right = buildSide(rounds, "right", maxCol);
  const totalRows = Math.max(left.outerCount, right.outerCount, 1);

  // Cada lado foi construído de 0 até seu próprio outerCount — centraliza o lado menor dentro de
  // totalRows (quase sempre os dois são iguais, mas não trava se não forem).
  function recenter(side: SideResult<F>): SideResult<F> {
    const offset = (totalRows - side.outerCount) / 2;
    if (offset === 0) return side;
    return {
      ...side,
      nodes: side.nodes.map((node) => ({ ...node, row: node.row + offset })),
      links: side.links.map((link) => ({ ...link, y1: link.y1 + offset, y2: link.y2 + offset })),
      innerFeed: side.innerFeed ? { ...side.innerFeed, row: side.innerFeed.row + offset } : null,
    };
  }

  const leftCentered = recenter(left);
  const rightCentered = recenter(right);

  const finalRow =
    leftCentered.innerFeed && rightCentered.innerFeed
      ? (leftCentered.innerFeed.row + rightCentered.innerFeed.row) / 2
      : (leftCentered.innerFeed?.row ?? rightCentered.innerFeed?.row ?? totalRows / 2);

  const finalLinks: BracketTreeLink[] = finalFixture
    ? [leftCentered.innerFeed, rightCentered.innerFeed]
        .filter((feed): feed is NonNullable<typeof feed> => feed !== null)
        .map((feed) => ({ id: feed.fixtureId, x1: feed.col, y1: feed.row, x2: roundCount, y2: finalRow }))
    : [];

  const columnPhases = [
    ...rounds.map((round, roundIndex) => ({ col: roundIndex, phase: round.phase })),
    ...rounds.map((round, roundIndex) => ({ col: maxCol - roundIndex, phase: round.phase })),
  ];

  return {
    totalCols: maxCol,
    totalRows,
    nodes: [...leftCentered.nodes, ...rightCentered.nodes],
    finalNode: finalFixture ? { fixture: finalFixture, col: roundCount, row: finalRow } : null,
    links: [...leftCentered.links, ...rightCentered.links, ...finalLinks],
    columnPhases,
  };
}
