// Chaves/defaults de contexts/settings do plugin — única fonte de verdade, usada tanto pelo
// manifest.ts (registro do default via registerDefaultSetting, ver register-plugins.ts do core)
// quanto pela tela admin de configuração. Mesmo padrão de BROADCAST_SETTINGS do venore-plugin-broadcast.
export const ERASTO_LEAGUE_SETTINGS = {
  // PIN de escrita do controle (celular). Antes só existia como env ERASTO_LEAGUE_PIN — agora a
  // env continua valendo como override (útil em dev / CI), mas o valor "oficial" mora aqui e é
  // editável pela tela admin sem redeploy. Vazio = cai no env; env vazio = "1234" com aviso.
  pin: {
    key: "erasto-league.pin",
    defaultValue: "",
    label: "PIN do controle (celular)",
  },
  // Nomes que o botão "Nova partida" usa ao zerar tudo. Texto livre.
  defaultHomeName: {
    key: "erasto-league.defaultHomeName",
    defaultValue: "Casa",
    label: "Nome padrão do time da casa",
  },
  defaultAwayName: {
    key: "erasto-league.defaultAwayName",
    defaultValue: "Visitante",
    label: "Nome padrão do time visitante",
  },
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
  // Caminho da logo da liga exibida no medalhão central do placar. Servida pelo HOST a partir de
  // public/ (o plugin é um pacote npm e não empacota asset estático). Vazio ou arquivo ausente →
  // o medalhão cai no monograma. Aceita um caminho relativo à raiz do site ("/erasto_league.png")
  // ou uma URL absoluta.
  logoUrl: {
    key: "erasto-league.logoUrl",
    defaultValue: "/erasto_league.png",
    label: "Logo da liga (caminho ou URL)",
  },
} as const;

export type ErastoLeagueSettingField = keyof typeof ERASTO_LEAGUE_SETTINGS;

// Snapshot resolvido das settings, no formato que o overlay/console consomem.
export type ErastoLeagueConfig = {
  pin: string;
  defaultHomeName: string;
  defaultAwayName: string;
  periodMs: number;
  periodCount: number;
  accentColor: string;
  logoUrl: string;
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
