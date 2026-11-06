import type { FixturePhase } from "../contracts/types";

export type BracketCircleFixture = { id: string; sortOrder: number };

export type BracketCircleNode<F extends BracketCircleFixture> = {
  fixture: F;
  angle: number;
  size: number;
  cx: number;
  cy: number;
};

export type BracketCircleLink = { id: string; x1: number; y1: number; x2: number; y2: number };

export type BracketCircleRing<F extends BracketCircleFixture> = {
  phase: FixturePhase;
  radius: number;
  nodes: BracketCircleNode<F>[];
};

export type BracketCircleLayout<F extends BracketCircleFixture> = {
  rings: BracketCircleRing<F>[];
  links: BracketCircleLink[];
  finalFixture: F | null;
};

// Coordenadas em % de um quadrado 0–100, centro em (50, 50) — mesma unidade de um SVG
// `viewBox="0 0 100 100"`, então tanto um <svg> quanto posicionamento CSS absoluto em % funcionam
// direto em cima do retorno desta função.
// Vão BEM maior entre anéis do que a primeira tentativa (38/22) — com só 16 unidades de folga, o
// disco de uma rodada e o da rodada vizinha quase se tocavam, e o brilho do vencedor fazia os dois
// parecerem uma coisa só ("tabela zoada", times de fases diferentes grudados). Com esses valores, a
// pior folga (2 anéis, caso mais comum: quartas+semifinal) fica em ~17 unidades de raio livre entre
// os discos de uma rodada e da outra.
const OUTER_RADIUS = 40;
const INNER_RADIUS = 16;
const SOLE_RING_RADIUS = 28;

// Nó da final: sempre fixo no centro, não faz parte de nenhum anel. Menor que antes (8, não 11) pra
// sobrar folga até o anel mais interno mesmo em campeonato com só uma rodada antes da final.
export const FINAL_NODE = { cx: 50, cy: 50, size: 7, angle: -Math.PI / 2 };

function ringRadii(count: number): number[] {
  if (count === 1) return [SOLE_RING_RADIUS];
  return Array.from({ length: count }, (_, i) => OUTER_RADIUS - (i * (OUTER_RADIUS - INNER_RADIUS)) / (count - 1));
}

function angleOf(index: number, total: number): number {
  return -Math.PI / 2 + (2 * Math.PI * (index + 0.5)) / total;
}

// Deslocamento dos dois times de um confronto em relação ao centro do seu nó — lado a lado, na
// tangente do anel (perpendicular ao raio). Usado tanto pros dois discos quanto pro traço curto que
// os une visualmente como um confronto só (blocks/bracket-circle.tsx e routes/tv/bracket-circle-tv.tsx).
export function pairOffset(angle: number, size: number): { dx: number; dy: number } {
  const offset = size / 2 + 0.5;
  return { dx: -Math.sin(angle) * offset, dy: Math.cos(angle) * offset };
}

// Chave circular 1:1 (sem rolagem lateral): rodadas iniciais nos anéis de fora, final no centro —
// geometria pura, reusada pelo bloco do site (blocks/bracket-circle.tsx, Tailwind) e pela tela de TV
// (routes/tv/bracket-circle-tv.tsx, CSS própria), pra não duplicar o cálculo de ângulo/raio/
// pareamento nos dois lugares (foi exatamente essa duplicação que escondeu o bug do placar trocado
// em runtime/bracket.ts — aqui não tem placar nenhum, só posição, mas o princípio é o mesmo). O
// pareamento entre rodadas segue a ORDEM dos confrontos em cada fase (campo "Ordem" do admin,
// fixture.sortOrder): 1º+2º confronto do anel de fora → 1º confronto do anel seguinte, 3º+4º → 2º…
export function computeBracketCircleLayout<F extends BracketCircleFixture>(
  knockout: { phase: FixturePhase; fixtures: F[] }[],
): BracketCircleLayout<F> {
  const rounds = knockout.map(({ phase, fixtures }) => ({
    phase,
    fixtures: [...fixtures].sort((a, b) => a.sortOrder - b.sortOrder),
  }));
  const ringRounds = rounds.filter((round) => round.phase !== "final");
  const finalFixture = rounds.find((round) => round.phase === "final")?.fixtures[0] ?? null;
  const radii = ringRadii(ringRounds.length);

  const rings: BracketCircleRing<F>[] = ringRounds.map((round, ringIndex) => {
    const total = round.fixtures.length;
    const radius = radii[ringIndex];
    const size = Math.min(7, Math.max(4, (2 * Math.PI * radius) / total / 2.5));
    return {
      phase: round.phase,
      radius,
      nodes: round.fixtures.map((fixture, index) => {
        const angle = angleOf(index, total);
        return { fixture, angle, size, cx: 50 + radius * Math.cos(angle), cy: 50 + radius * Math.sin(angle) };
      }),
    };
  });

  // A final não é um anel (fica fixa no centro), mas ainda recebe os dois vencedores do anel mais
  // interno — por isso entra como uma "rodada" a mais só pra esse encadeamento, sem aparecer em
  // `rings` (quem desenha a final usa FINAL_NODE direto, não essa entrada).
  const chain = finalFixture
    ? [...rings, { phase: "final" as const, radius: 0, nodes: [{ fixture: finalFixture, ...FINAL_NODE }] }]
    : rings;

  const links: BracketCircleLink[] = chain.flatMap((ring, ringIndex) =>
    ring.nodes.flatMap((node, index) => {
      const next = chain[ringIndex + 1];
      if (!next) return [];
      const target = next.nodes[Math.min(next.nodes.length - 1, Math.floor((index * next.nodes.length) / ring.nodes.length))];
      return [{ id: node.fixture.id, x1: node.cx, y1: node.cy, x2: target.cx, y2: target.cy }];
    }),
  );

  return { rings, links, finalFixture };
}
