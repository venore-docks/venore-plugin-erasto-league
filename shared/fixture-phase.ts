import type { FixturePhase } from "../contracts/types";

export const FIXTURE_PHASE_LABEL: Record<FixturePhase, string> = {
  group: "Fase de grupos",
  quarterfinal: "Quartas de final",
  semifinal: "Semifinal",
  final: "Final",
};

// Ordem de exibição (fase de grupos primeiro, final por último) — usado tanto pela tela de admin
// de fixtures quanto pelo bloco de chaveamento (erasto-league.bracket).
export const FIXTURE_PHASE_ORDER: FixturePhase[] = ["group", "quarterfinal", "semifinal", "final"];
