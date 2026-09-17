// Chaves/defaults de contexts/settings do plugin — única fonte de verdade, usada tanto pelo
// manifest.ts (registro do default via registerDefaultSetting, ver register-plugins.ts do core)
// quanto pela tela admin de configuração. Mesmo padrão de BROADCAST_SETTINGS do venore-plugin-broadcast.
export const ERASTO_LEAGUE_SETTINGS = {
  // Duração de UM tempo, em minutos. Os jogos da Erasto League são de 20min no total (2 × 10) —
  // esse valor alimenta os atalhos de relógio do controle ("Fim 1º", "Fim de jogo").
  periodMinutes: {
    key: "erasto-league.periodMinutes",
    defaultValue: 10,
    label: "Duração de um tempo (minutos)",
  },
  periodCount: {
    key: "erasto-league.periodCount",
    defaultValue: 2,
    label: "Número de tempos",
  },
  // Cor de destaque do overlay (placa do placar, halo, etiqueta). Hex; <input type="color"> na
  // tela admin. Default é o verde da liga.
  accentColor: {
    key: "erasto-league.accentColor",
    defaultValue: "#22c55e",
    label: "Cor de destaque do placar",
  },
  // Id de mídia (sistema de mídia do host, @venore/plugin-sdk/media — mesmo padrão de
  // teams.crestMediaId/players.photoMediaId) da logo exibida no medalhão central do placar. Vazio
  // ou mídia removida → o medalhão cai no monograma "EL".
  logoMediaId: {
    key: "erasto-league.logoMediaId",
    defaultValue: "",
    label: "Logo da liga",
  },
  // Id do canal do YouTube (não a URL inteira) — alimenta o bloco erasto-league.broadcast, que
  // embeda .../embed/live_stream?channel=<id> (resolve sozinho pra live atual do canal, sem API
  // key). Vazio = bloco não mostra nada (transmissão não configurada).
  youtubeChannelId: {
    key: "erasto-league.youtubeChannelId",
    defaultValue: "",
    label: "Id do canal do YouTube da transmissão",
  },
} as const;

export type ErastoLeagueSettingField = keyof typeof ERASTO_LEAGUE_SETTINGS;

// Snapshot resolvido das settings, no formato que o overlay/console consomem.
export type ErastoLeagueConfig = {
  periodMs: number;
  periodCount: number;
  accentColor: string;
  // logoMediaId: bruto (pro MediaPickerField do form de config nascer preenchido, mesmo padrão de
  // TeamProfile.crestMediaId). logoUrl: já resolvido (@venore/plugin-sdk/media), o que o overlay
  // consome direto sem saber de media id.
  logoMediaId: string;
  logoUrl: string;
  youtubeChannelId: string;
};

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function sanitizeAccentColor(raw: string): string {
  const value = raw.trim();
  return HEX_COLOR.test(value) ? value : ERASTO_LEAGUE_SETTINGS.accentColor.defaultValue;
}

export function clampPeriodMinutes(raw: number): number {
  if (!Number.isFinite(raw)) return ERASTO_LEAGUE_SETTINGS.periodMinutes.defaultValue;
  return Math.min(90, Math.max(1, Math.round(raw)));
}

export function clampPeriodCount(raw: number): number {
  if (!Number.isFinite(raw)) return ERASTO_LEAGUE_SETTINGS.periodCount.defaultValue;
  return Math.min(4, Math.max(1, Math.round(raw)));
}
