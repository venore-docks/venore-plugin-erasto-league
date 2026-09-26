import type { Fixture } from "../contracts/types";
import { FIXTURE_PHASE_LABEL } from "./fixture-phase";

// Rótulos de uma partida a partir do confronto vinculado (tabela de jogos) — compartilhados entre a
// capa do jogo (runtime/match-cover.ts), a metadata de compartilhamento e a galeria de jogos
// (blocks/matches-gallery-block.tsx), pra "Semifinal"/"25/09" sair igual em todo lugar.

type FixtureStage = Pick<Fixture, "phase" | "groupName" | "roundLabel">;

// "Semifinal", "Grupo A · 2ª Rodada"... null = partida sem confronto vinculado.
export function describeFixtureStage(fixture: FixtureStage | null | undefined): string | null {
  if (!fixture) return null;
  if (fixture.phase !== "group") return FIXTURE_PHASE_LABEL[fixture.phase];
  const group = fixture.groupName ? `Grupo ${fixture.groupName}` : null;
  return [group, fixture.roundLabel].filter(Boolean).join(" · ") || FIXTURE_PHASE_LABEL.group;
}

// "25/09" — data do confronto (texto puro, sem fuso) ou, sem confronto, do apito inicial em
// Brasília.
export function describeMatchDate(startedAt: number, fixture: Pick<Fixture, "scheduledDate"> | null | undefined): string {
  if (fixture?.scheduledDate) {
    const [, month, day] = fixture.scheduledDate.split("-");
    if (month && day) return `${day}/${month}`;
  }
  return new Date(startedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
}
