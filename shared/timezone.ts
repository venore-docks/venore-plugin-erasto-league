// Datas/horários de jogo são sempre horário de Brasília (America/Sao_Paulo, UTC-3 fixo desde o
// fim do horário de verão no Brasil em 2019 — sem DST pra complicar). Construir a data com
// `new Date(year, month, day, hours, minutes)` (ou um <input type="datetime-local"> lido direto)
// usa o fuso do AMBIENTE que executa o JS, não o do evento: no CSV import e nas Server Actions
// isso é o servidor (UTC, Vercel), não América/São Paulo — um jogo marcado "10:30" virava
// 10:30 UTC = 07:30 em Brasília, sempre 3h adiantado do que foi digitado. As duas funções abaixo
// convertem explicitamente por esse offset fixo, então o resultado é o mesmo não importa em que
// fuso o código realmente roda.
const SAO_PAULO_UTC_OFFSET_HOURS = 3;

// Componentes de data/hora em horário de Brasília -> epoch ms (UTC internamente).
export function saoPauloPartsToEpoch(year: number, month: number, day: number, hours = 0, minutes = 0): number {
  return Date.UTC(year, month - 1, day, hours + SAO_PAULO_UTC_OFFSET_HOURS, minutes);
}

export type SaoPauloDateTimeParts = { year: number; month: number; day: number; hours: number; minutes: number };

// epoch ms -> componentes de data/hora em horário de Brasília (pra preencher um
// <input type="datetime-local"> corretamente, sem depender do fuso do dispositivo de quem abriu
// o formulário).
export function epochToSaoPauloParts(epochMs: number): SaoPauloDateTimeParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(epochMs));

  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day"), hours: get("hour"), minutes: get("minute") };
}
