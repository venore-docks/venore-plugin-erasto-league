export type FunnelMatchInput = { homeSlug: string | null; awaySlug: string | null };

export type FunnelLayout = {
  // Por rodada (0 = topo/final) e confronto (na ordem de entrada): posição x fracionária, 0..N-1 na
  // rodada mais funda (folhas), interpolada pra cima a partir da média dos filhos.
  centers: number[][];
  // children[rodada][confronto] = índices (na rodada seguinte, rodada+1) dos confrontos que o alimentam.
  // Vazio/ausente na rodada mais funda (não tem próxima rodada).
  children: number[][][];
};

// Camada geométrica da chave em funil (final no topo, rodadas mais cedo embaixo): descobre quem
// alimenta quem CASANDO PELO TIME REAL (slug), não pela posição no array — causa do bug antigo de
// "chave cruzada" (a rodada seguinte tinha sortOrder numa convenção diferente da rodada anterior, e o
// desenho assumia que metade de cima casava com metade de cima). Quando a identidade ainda não dá pra
// casar (fase não resolvida, lado ainda é "Vencedor Grupo A"), cai pra parear pela ordem de entrada.
//
// Efeito prático: os confrontos da rodada mais funda recebem um índice sequencial 0..N-1 reordenado
// pela ÁRVORE real, não pelo sortOrder de cadastro — se a semifinal 1 na verdade nasce das quartas 2 e
// 3 (não das quartas 1 e 2), o desenho agrupa quartas 2 e 3 lado a lado em vez de tentar desenhar uma
// linha cruzando a quartas 1/4. Isso torna a categoria inteira de bug "confronto cruzado" impossível,
// em vez de corrigir só o caso específico já visto em produção.
export function computeFunnelLayout(roundsTopToBottom: ReadonlyArray<ReadonlyArray<FunnelMatchInput>>): FunnelLayout {
  if (roundsTopToBottom.length === 0) return { centers: [], children: [] };

  const centers: number[][] = roundsTopToBottom.map((round) => new Array(round.length).fill(0));
  const children: number[][][] = roundsTopToBottom.map(() => []);
  const usedByRound: Set<number>[] = roundsTopToBottom.map(() => new Set());
  let nextLeaf = 0;

  function assign(roundIndex: number, matchIndex: number): number {
    const isLeafRound = roundIndex === roundsTopToBottom.length - 1;
    if (isLeafRound) {
      const center = nextLeaf;
      nextLeaf += 1;
      centers[roundIndex][matchIndex] = center;
      return center;
    }

    const match = roundsTopToBottom[roundIndex][matchIndex];
    const childRound = roundsTopToBottom[roundIndex + 1];
    const used = usedByRound[roundIndex + 1];
    const slugs = [match.homeSlug, match.awaySlug].filter((slug): slug is string => slug != null);

    const matchedByIdentity: number[] = [];
    if (slugs.length > 0) {
      for (let i = 0; i < childRound.length; i++) {
        if (used.has(i)) continue;
        const child = childRound[i];
        const childSlugs = [child.homeSlug, child.awaySlug].filter((slug): slug is string => slug != null);
        if (childSlugs.some((slug) => slugs.includes(slug))) matchedByIdentity.push(i);
      }
    }

    // Só completa com "próximo disponível" quando NENHUM lado deste confronto já tem time real: com
    // 1 lado já casado por identidade, o outro lado ainda não tem time nenhum (placeholder tipo
    // "Vencedor Grupo B") e não tem como saber qual confronto da rodada seguinte vai alimentá-lo —
    // adivinhar roubaria um confronto de outro irmão que pode precisar dele de verdade.
    const selected = [...matchedByIdentity];
    if (matchedByIdentity.length === 0) {
      for (let i = 0; i < childRound.length && selected.length < 2; i++) {
        if (!used.has(i)) selected.push(i);
      }
    }
    selected.sort((a, b) => a - b);
    selected.forEach((i) => used.add(i));
    children[roundIndex][matchIndex] = selected;

    const childCenters = selected.map((i) => assign(roundIndex + 1, i));
    const center = childCenters.length > 0 ? childCenters.reduce((sum, value) => sum + value, 0) / childCenters.length : matchIndex;
    centers[roundIndex][matchIndex] = center;
    return center;
  }

  for (let matchIndex = 0; matchIndex < roundsTopToBottom[0].length; matchIndex++) {
    assign(0, matchIndex);
  }

  return { centers, children };
}
