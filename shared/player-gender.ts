import type { PlayerGender } from "../contracts/types";

export const PLAYER_GENDER_LABEL: Record<PlayerGender, string> = {
  male: "Masculino",
  female: "Feminino",
};

// Cor de identificação por gênero nos cards de jogador (bloco erasto-league.players, elenco do
// perfil do time) — usa o par categórico OFICIAL que já existe em todo tema instalado
// (--chart-6/--chart-7, ver venore-docks/src/app/globals.css), não uma cor inventada: assim não é
// preciso editar theme.css em cada tema pra isso funcionar, e already troca sozinho com o tema ativo.
export const PLAYER_GENDER_ACCENT: Record<PlayerGender, string> = {
  male: "var(--chart-6)",
  female: "var(--chart-7)",
};

export function playerGenderAccent(gender: PlayerGender | null): string | null {
  return gender ? PLAYER_GENDER_ACCENT[gender] : null;
}
