export type FunnelMatchInput = { homeSlug: string | null; awaySlug: string | null };

export type FunnelLayout = {
  // Por rodada (0 = topo/final) e confronto (na ordem de entrada): posição x fracionária, 0..N-1 na
  // rodada mais funda (folhas), interpolada pra cima a partir da média dos filhos.
  centers: number[][];
  // children[rodada][confronto] = índices (na rodada seguinte, rodada+1) dos confrontos que o alimentam.
  // Vazio/ausente na rodada mais funda (não tem próxima rodada).
  children: number[][][];
};

function nonNull(slug: string | null): slug is string {
  return slug != null;
}

// Pra cada confronto da rodada, acha os confrontos da rodada seguinte que casam por TIME REAL (slug
// em comum) — independente dos outros confrontos da mesma rodada (identidade nunca é ambígua: um time
// só pode ser filho de verdade de um único confronto).
function matchByIdentity(round: readonly FunnelMatchInput[], childRound: readonly FunnelMatchInput[]): number[][] {
  return round.map((match) => {
    const slugs = [match.homeSlug, match.awaySlug].filter(nonNull);
    if (slugs.length === 0) return [];
    const found: number[] = [];
    for (let childIndex = 0; childIndex < childRound.length; childIndex++) {
      const child = childRound[childIndex];
      const childSlugs = [child.homeSlug, child.awaySlug].filter(nonNull);
      if (childSlugs.some((slug) => slugs.includes(slug))) found.push(childIndex);
    }
    return found;
  });
}

// Completa, pra cada confronto que ainda precisa de filho (achou menos de 2 por identidade), com os
// confrontos da rodada seguinte que sobraram (ninguém casou por identidade ainda) — em RODÍZIO (quem
// tem menos filhos até agora recebe primeiro), não "quem processa primeiro leva tudo": sem isso, um
// confronto com 1 lado já conhecido (ex.: a final antes de decidida, só um finalista definido) rouba o
// único confronto que sobra de um irmão que ainda não tem NENHUM filho, deixando esse irmão (e toda a
// subárvore dele) sem posição — bug real visto em produção: duas semifinais caindo no mesmo centro e
// os cards ficando sobrepostos.
function fillRemaining(identityMatches: number[][], childRoundLength: number): number[][] {
  const selected = identityMatches.map((found) => [...found]);
  const claimed = new Set(identityMatches.flat());
  const pool = Array.from({ length: childRoundLength }, (_, index) => index).filter((index) => !claimed.has(index));

  for (const childIndex of pool) {
    let bestMatchIndex = -1;
    let bestCount = Infinity;
    for (let matchIndex = 0; matchIndex < selected.length; matchIndex++) {
      const count = selected[matchIndex].length;
      if (count < 2 && count < bestCount) {
        bestCount = count;
        bestMatchIndex = matchIndex;
      }
    }
    if (bestMatchIndex === -1) break; // ninguém mais precisa de filho
    selected[bestMatchIndex].push(childIndex);
  }

  return selected.map((found) => [...found].sort((a, b) => a - b));
}

// Camada geométrica da chave em funil (final no topo, rodadas mais cedo embaixo): descobre quem
// alimenta quem CASANDO PELO TIME REAL (slug), não pela posição no array — causa do bug antigo de
// "chave cruzada" (a rodada seguinte tinha sortOrder numa convenção diferente da rodada anterior, e o
// desenho assumia que metade de cima casava com metade de cima).
//
// Dois passos: 1) children() decide, rodada por rodada (topo pra base), quem alimenta quem — identidade
// primeiro, rodízio justo pro resto. 2) uma travessia a partir do topo usa esse mapa pra numerar as
// folhas (rodada mais funda) na ORDEM REAL DA ÁRVORE, não na ordem de cadastro — se a semifinal 1 na
// verdade nasce das quartas 2 e 3 (não das quartas 1 e 2), a base é REORDENADA (não só reposicionada)
// pra que as quartas 2 e 3 fiquem adjacentes — torna a categoria inteira de bug "confronto cruzado"
// (ou "confrontos sobrepostos") impossível, não só o caso específico já visto.
export function computeFunnelLayout(roundsTopToBottom: ReadonlyArray<ReadonlyArray<FunnelMatchInput>>): FunnelLayout {
  if (roundsTopToBottom.length === 0) return { centers: [], children: [] };

  const children: number[][][] = roundsTopToBottom.map(() => []);
  for (let roundIndex = 0; roundIndex < roundsTopToBottom.length - 1; roundIndex++) {
    const round = roundsTopToBottom[roundIndex];
    const childRound = roundsTopToBottom[roundIndex + 1];
    const identityMatches = matchByIdentity(round, childRound);
    children[roundIndex] = fillRemaining(identityMatches, childRound.length);
  }

  const centers: number[][] = roundsTopToBottom.map((round) => new Array(round.length).fill(0));
  let nextLeaf = 0;

  function assign(roundIndex: number, matchIndex: number): number {
    const isLeafRound = roundIndex === roundsTopToBottom.length - 1;
    if (isLeafRound) {
      const center = nextLeaf;
      nextLeaf += 1;
      centers[roundIndex][matchIndex] = center;
      return center;
    }

    const kids = children[roundIndex][matchIndex];
    const childCenters = kids.map((childIndex) => assign(roundIndex + 1, childIndex));
    const center = childCenters.length > 0 ? childCenters.reduce((sum, value) => sum + value, 0) / childCenters.length : matchIndex;
    centers[roundIndex][matchIndex] = center;
    return center;
  }

  for (let matchIndex = 0; matchIndex < roundsTopToBottom[0].length; matchIndex++) {
    assign(0, matchIndex);
  }

  return { centers, children };
}
