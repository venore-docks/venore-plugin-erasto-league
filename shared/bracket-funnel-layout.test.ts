import { describe, expect, it } from "vitest";
import { computeFunnelLayout } from "./bracket-funnel-layout";

describe("computeFunnelLayout", () => {
  it("retorna vazio sem rodadas", () => {
    expect(computeFunnelLayout([])).toEqual({ centers: [], children: [] });
  });

  it("uma única rodada (só a final) vira uma folha, sem filhos", () => {
    const result = computeFunnelLayout([[{ homeSlug: "a", awaySlug: "b" }]]);
    expect(result.centers).toEqual([[0]]);
    expect(result.children[0]).toEqual([]);
  });

  it("duas rodadas sem times definidos ainda cai pra ordem de entrada", () => {
    const result = computeFunnelLayout([
      [{ homeSlug: null, awaySlug: null }],
      [
        { homeSlug: null, awaySlug: null },
        { homeSlug: null, awaySlug: null },
      ],
    ]);
    expect(result.centers).toEqual([[0.5], [0, 1]]);
    expect(result.children[0][0]).toEqual([0, 1]);
  });

  it("quatro confrontos na base, semifinal casada pelo time real (ordem natural)", () => {
    const result = computeFunnelLayout([
      [{ homeSlug: null, awaySlug: null }],
      [
        { homeSlug: "smurfs", awaySlug: "flamingos" },
        { homeSlug: "baile", awaySlug: "katchau" },
      ],
      [
        { homeSlug: "smurfs", awaySlug: "gotham" },
        { homeSlug: "varzea", awaySlug: "baile" },
        { homeSlug: "katchau", awaySlug: "chamas" },
        { homeSlug: "flamingos", awaySlug: "bananaticos" },
      ],
    ]);
    // SF1 (smurfs/flamingos) casa com QF1(smurfs) e QF4(flamingos); SF2 (baile/katchau) casa com
    // QF2(baile) e QF3(katchau) — mesmo quando a ordem de entrada da semifinal não segue a convenção
    // "metade de cima primeiro", a árvore real reordena a base pra nenhuma linha cruzar.
    expect(result.children[1][0]).toEqual([0, 3]); // SF1 -> QF1, QF4
    expect(result.children[1][1]).toEqual([1, 2]); // SF2 -> QF2, QF3
    expect(result.centers[2]).toEqual([0, 2, 3, 1]); // QF1=0, QF2=2, QF3=3, QF4=1 (reordenadas)
    expect(result.centers[1]).toEqual([0.5, 2.5]); // SF1 entre QF1/QF4(0,1), SF2 entre QF2/QF3(2,3)
    expect(result.centers[0]).toEqual([1.5]);
  });

  it("reproduz o bug real: semifinal nasce das quartas do meio (2 e 3), não das adjacentes (1 e 2)", () => {
    // Cenário real visto em produção: Baile de Munique (quartas 2) e Katchau (quartas 3) se enfrentam
    // na semifinal, e Smurfs (quartas 1) encara Flamingos (quartas 4) na outra — os pares "verdadeiros"
    // não são as quartas adjacentes (1+2, 3+4), e o desenho antigo (baseado em posição) cruzava as
    // linhas por assumir isso.
    const result = computeFunnelLayout([
      [{ homeSlug: null, awaySlug: null }],
      [
        { homeSlug: "baile", awaySlug: "katchau" },
        { homeSlug: "smurfs", awaySlug: "flamingos" },
      ],
      [
        { homeSlug: "smurfs", awaySlug: "gotham" },
        { homeSlug: "varzea", awaySlug: "baile" },
        { homeSlug: "katchau", awaySlug: "chamas" },
        { homeSlug: "flamingos", awaySlug: "bananaticos" },
      ],
    ]);
    expect(result.children[1][0]).toEqual([1, 2]); // SF1 (baile/katchau) -> QF2, QF3
    expect(result.children[1][1]).toEqual([0, 3]); // SF2 (smurfs/flamingos) -> QF1, QF4
    // sem a reordenação pela árvore real, as duas semifinais cairiam no mesmo centro (1.5) e os cards
    // ficariam sobrepostos — a base é reordenada (QF2, QF3 primeiro) pra cada semifinal ficar num
    // centro distinto.
    expect(result.centers[1][0]).not.toBeCloseTo(result.centers[1][1]);
    expect(result.centers[1]).toEqual([0.5, 2.5]);
    expect(result.centers[2]).toEqual([2, 0, 1, 3]); // QF1=2, QF2=0, QF3=1, QF4=3
  });

  it("final com só um lado definido não deixa a outra semifinal órfã (bug real: cards sobrepostos)", () => {
    // Visto em produção: final mostrava "A definir x Katchau FC" (só um finalista decidido) e as duas
    // semifinais renderizavam exatamente no mesmo lugar, com o texto de uma por cima da outra. Causa:
    // a final só achava 1 filho por identidade (a semifinal do Katchau) e não completava o outro lado,
    // então a OUTRA semifinal (e toda a subárvore dela) nunca era visitada e ficava com centro padrão 0
    // — igual ao centro real da semifinal do Katchau.
    const result = computeFunnelLayout([
      [{ homeSlug: null, awaySlug: "katchau" }],
      [
        { homeSlug: "flamingos", awaySlug: "baile" },
        { homeSlug: "smurfs", awaySlug: "katchau" },
      ],
      [
        { homeSlug: "flamingos", awaySlug: "bananaticos" },
        { homeSlug: "katchau", awaySlug: "chamas" },
      ],
    ]);
    expect(result.children[0][0]).toEqual([0, 1]); // final enxerga as duas semifinais, não só a do Katchau
    expect(result.centers[1][0]).not.toBe(result.centers[1][1]); // as duas semifinais NÃO podem cair no mesmo centro
    expect(result.centers[1]).toEqual([0, 1]);
    expect(result.centers[2]).toEqual([0, 1]);
  });

  it("casa pelo lado conhecido quando só um dos times do confronto já está definido", () => {
    const result = computeFunnelLayout([
      [{ homeSlug: null, awaySlug: null }],
      [
        { homeSlug: "katchau", awaySlug: null },
        { homeSlug: null, awaySlug: null },
      ],
      [
        { homeSlug: "katchau", awaySlug: "chamas" },
        { homeSlug: "varzea", awaySlug: "baile" },
      ],
    ]);
    expect(result.children[1][0]).toEqual([0]); // SF1 (katchau) -> QF1 (contém katchau)
    expect(result.children[1][1]).toEqual([1]); // SF2 (ainda indefinida) -> sobra QF2
    expect(result.centers[1]).toEqual([0, 1]);
  });
});
