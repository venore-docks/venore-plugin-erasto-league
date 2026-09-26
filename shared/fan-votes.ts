// Regras puras da votação da torcida ("Jogador da Torcida" por partida + "Time favorito" da
// temporada) — sem banco nem next/*, pra serem testadas isoladas (shared/fan-votes.test.ts) e
// reaproveitadas por runtime/fan-votes.ts, páginas públicas, bloco, TV e admin.

import type { MatchStatus } from "../contracts/types";

const HOUR_MS = 60 * 60 * 1000;

export type VoteWindow = {
  // Epoch ms do início (apito inicial = matches.started_at).
  opensAt: number;
  // Epoch ms do fechamento; null = partida ainda em andamento (fecha N horas depois do fim, que
  // ainda não aconteceu).
  closesAt: number | null;
};

// "Jogador da Torcida": abre no apito inicial e fecha windowHours DEPOIS de encerrada — pedido
// explícito, os alunos não usam celular na escola e só votam de casa. Partida "cancelled" (legado —
// cancelar hoje apaga a partida) nunca abre.
export function resolveMatchVoteWindow(
  match: { status: MatchStatus; startedAt: number; finishedAt: number | null },
  windowHours: number,
): VoteWindow | null {
  if (match.status === "cancelled") return null;
  if (match.status === "in_progress") return { opensAt: match.startedAt, closesAt: null };
  const endedAt = match.finishedAt ?? match.startedAt;
  return { opensAt: match.startedAt, closesAt: endedAt + windowHours * HOUR_MS };
}

export function isVoteWindowOpen(window: VoteWindow | null, now: number): boolean {
  if (!window) return false;
  if (now < window.opensAt) return false;
  return window.closesAt === null || now < window.closesAt;
}

export type VoteCount = { id: string; votes: number };
export type VoteShare = VoteCount & { percent: number };

// Percentual inteiro por opção somando exatamente 100 (maior resto) — "33% / 33% / 33%" somando 99
// numa tela de TV parece erro. Ordem de saída: mais votado primeiro; empate mantém a ordem de
// entrada (estável), então quem chama decide o desempate (ex: nome).
export function computeVoteShares(counts: VoteCount[]): VoteShare[] {
  const sorted = [...counts].filter((entry) => entry.votes > 0).sort((a, b) => b.votes - a.votes);
  const total = sorted.reduce((sum, entry) => sum + entry.votes, 0);
  if (total === 0) return [];

  const raw = sorted.map((entry) => (entry.votes * 100) / total);
  const floors = raw.map((value) => Math.floor(value));
  let remaining = 100 - floors.reduce((sum, value) => sum + value, 0);

  const byRemainder = raw
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (const { index } of byRemainder) {
    if (remaining <= 0) break;
    floors[index] += 1;
    remaining -= 1;
  }

  return sorted.map((entry, index) => ({ ...entry, percent: floors[index] }));
}

// Votação que já terminou de vez (partida encerrada + janela passada) — só aí o mais votado vira
// "Jogador da Torcida" de verdade (perfil do jogador, página do jogo). Em andamento/parcial, não.
export function isVoteWindowClosed(window: VoteWindow | null, now: number): boolean {
  return window !== null && window.closesAt !== null && now >= window.closesAt;
}

// Quem leva o prêmio: o mais votado. Empate no topo = todos os empatados levam (nenhum critério
// de desempate é justo aqui — ordem alfabética daria o prêmio pelo nome); sem voto = ninguém.
export function resolveTopChoiceIds(counts: VoteCount[]): string[] {
  const top = counts.reduce((max, entry) => Math.max(max, entry.votes), 0);
  if (top <= 0) return [];
  return counts.filter((entry) => entry.votes === top).map((entry) => entry.id);
}

// Posição de cada linha de um ranking já ordenado por votos (mais votado primeiro), com empate
// dividindo a posição ("1, 1, 3") — pra medalha 🥇 não ir só pro primeiro de dois empatados.
export function rankPositions(sortedVotes: number[]): number[] {
  const positions: number[] = [];
  sortedVotes.forEach((votes, index) => {
    positions.push(index > 0 && votes === sortedVotes[index - 1] ? positions[index - 1] : index + 1);
  });
  return positions;
}

// Agrupamento de IP pra auditoria: IPv4 inteiro; IPv6 pelo prefixo /64 (uma casa/aparelho recebe um
// /64 inteiro e troca o sufixo à vontade — agrupar pelo endereço completo deixaria quem gira o
// sufixo parecer N pessoas diferentes). "::ffff:1.2.3.4" (IPv4 mapeado) vira o IPv4.
export function normalizeIpForGrouping(rawIp: string | null | undefined): string | null {
  let ip = (rawIp ?? "").trim().toLowerCase();
  if (!ip) return null;

  // Alguns proxies mandam porta junto ("1.2.3.4:5678", "[2001:db8::1]:443").
  const bracketed = ip.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracketed) ip = bracketed[1];
  const v4WithPort = ip.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  if (v4WithPort) ip = v4WithPort[1];

  const mapped = ip.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return mapped[1];
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(ip)) return ip;
  if (!ip.includes(":")) return null;

  const withoutZone = ip.split("%")[0];
  const [head, tail] = withoutZone.split("::");
  const headParts = head ? head.split(":") : [];
  const tailParts = tail !== undefined && tail !== "" ? tail.split(":") : [];
  if (withoutZone.includes("::")) {
    const missing = 8 - headParts.length - tailParts.length;
    if (missing < 0) return null;
    const full = [...headParts, ...Array<string>(missing).fill("0"), ...tailParts];
    return full.slice(0, 4).map((part) => part.replace(/^0+(?=.)/, "")).join(":") + "::/64";
  }
  if (headParts.length !== 8) return null;
  return headParts.slice(0, 4).map((part) => part.replace(/^0+(?=.)/, "")).join(":") + "::/64";
}

// Primeiro IP de x-forwarded-for (o cliente, na Vercel), com x-real-ip como preferência quando
// existe (a Vercel preenche os dois; atrás de outro proxy só um deles pode vir).
export function pickClientIp(realIp: string | null, forwardedFor: string | null): string | null {
  const direct = realIp?.trim();
  if (direct) return direct;
  const first = forwardedFor?.split(",")[0]?.trim();
  return first || null;
}

export type AuditVoteRow = {
  ipHash: string | null;
  uaHash: string | null;
  choiceId: string;
  createdAt: number;
  voided: boolean;
};

export type AuditGroup = {
  ipHash: string;
  totalVotes: number;
  activeVotes: number;
  voidedVotes: number;
  // Quantos user-agents distintos (≈ navegadores/modelos de celular) votaram desse IP.
  browsers: number;
  topChoiceId: string;
  topChoiceVotes: number;
  firstAt: number;
  lastAt: number;
  // "suspect": muitos votos do mesmo IP E do mesmo navegador (limpar cookie / aba anônima);
  // "watch": muitos votos do mesmo IP, mas de navegadores diferentes (rede da escola, 4G da
  // operadora, família) — só pra olhar; "none": abaixo do limiar.
  level: "suspect" | "watch" | "none";
};

// Limiar do que aparece na auditoria — família de 2 aparelhos votando da mesma casa é o caso
// normal, não vale poluir a lista.
export const AUDIT_MIN_GROUP_VOTES = 3;

// Heurística visível (o admin sempre decide — nada é anulado sozinho, pedido explícito): a partir
// de 5 votos do mesmo IP, "suspect" quando dá 3+ votos por navegador (mesmo aparelho votando de
// novo), "watch" quando são navegadores variados. Aparelhos idênticos (ex: iPhones na mesma versão
// do iOS) mandam o mesmo user-agent — por isso o limiar alto antes de marcar "suspect".
export function classifyAuditGroup(totalVotes: number, browsers: number): AuditGroup["level"] {
  if (totalVotes < 5) return "none";
  return totalVotes / Math.max(1, browsers) >= 3 ? "suspect" : "watch";
}

export function buildAuditGroups(rows: AuditVoteRow[], minVotes = AUDIT_MIN_GROUP_VOTES): AuditGroup[] {
  const byIp = new Map<string, AuditVoteRow[]>();
  for (const row of rows) {
    if (!row.ipHash) continue;
    const list = byIp.get(row.ipHash);
    if (list) list.push(row);
    else byIp.set(row.ipHash, [row]);
  }

  const groups: AuditGroup[] = [];
  for (const [ipHash, list] of byIp) {
    if (list.length < minVotes) continue;
    const browsers = new Set(list.map((row) => row.uaHash ?? "")).size;
    const choiceCounts = new Map<string, number>();
    for (const row of list) {
      choiceCounts.set(row.choiceId, (choiceCounts.get(row.choiceId) ?? 0) + 1);
    }
    let topChoiceId = list[0].choiceId;
    let topChoiceVotes = 0;
    for (const [choiceId, votes] of choiceCounts) {
      if (votes > topChoiceVotes) {
        topChoiceId = choiceId;
        topChoiceVotes = votes;
      }
    }
    const times = list.map((row) => row.createdAt);
    const voidedVotes = list.filter((row) => row.voided).length;
    groups.push({
      ipHash,
      totalVotes: list.length,
      activeVotes: list.length - voidedVotes,
      voidedVotes,
      browsers,
      topChoiceId,
      topChoiceVotes,
      firstAt: Math.min(...times),
      lastAt: Math.max(...times),
      level: classifyAuditGroup(list.length, browsers),
    });
  }

  const levelRank: Record<AuditGroup["level"], number> = { suspect: 0, watch: 1, none: 2 };
  return groups.sort((a, b) => levelRank[a.level] - levelRank[b.level] || b.totalVotes - a.totalVotes);
}
