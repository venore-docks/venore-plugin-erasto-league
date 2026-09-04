// O placar aceita meio ponto (+0,5). Tudo é "snapado" pra múltiplo de 0,5 pra não acumular
// erro de float, e formatado com vírgula (pt-BR) só quando tem fração.

export function snapHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

export function clampScore(value: number): number {
  return Math.max(0, snapHalf(value));
}

export function formatScore(value: number): string {
  const snapped = snapHalf(value);
  return Number.isInteger(snapped) ? String(snapped) : snapped.toFixed(1).replace(".", ",");
}
