// Posição de cada linha de um ranking já ordenado (maior valor primeiro), com empate dividindo a
// posição ("1, 1, 3") — pra medalha 🥇 não ir só pro primeiro de dois empatados. Usado pelos
// rankings de votos (blocks/vote-results-list.tsx, TV da votação) e de jogadores (artilharia, MVPs,
// Jogador da Torcida — blocks/scorer-row.tsx).
export function rankPositions(sortedValues: number[]): number[] {
  const positions: number[] = [];
  sortedValues.forEach((value, index) => {
    positions.push(index > 0 && value === sortedValues[index - 1] ? positions[index - 1] : index + 1);
  });
  return positions;
}
