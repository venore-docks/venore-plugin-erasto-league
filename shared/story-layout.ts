// Contas puras do story 1080×1920 (runtime/story-image.tsx) — testadas em shared/story-layout.test.ts.

// Tamanho da fonte de um nome em caixa alta (Barlow Condensed ExtraBold ≈ 0,5em por caractere):
// nome curto usa o máximo, comprido encolhe até o piso (e quebra linha a partir daí).
export function storyNameFontSize(name: string, maxWidthPx: number, maxPx: number, minPx: number): number {
  const length = Math.max(1, name.trim().length);
  const fitted = Math.floor(maxWidthPx / (length * 0.5));
  return Math.max(minPx, Math.min(maxPx, fitted));
}

function parseHex(hex: string): [number, number, number] | null {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const value = parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

// "#22c55e" + 0.4 → "rgba(34,197,94,0.4)" (Satori não tem color-mix). Cor inválida → branco.
export function withAlpha(hex: string, alpha: number): string {
  const rgb = parseHex(hex) ?? [255, 255, 255];
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
}

// Texto escuro ou branco sobre a cor de destaque da liga (o admin escolhe a cor; verde claro pede
// texto escuro, azul-marinho pede branco) — luminância relativa WCAG.
export function readableTextOn(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return "#0b0f14";
  const [r, g, b] = rgb.map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.36 ? "#0b0f14" : "#ffffff";
}
