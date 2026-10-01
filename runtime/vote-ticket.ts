import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Ticket do "custo" de cada voto da torcida (shared/fan-votes.ts resolveVoteWaitSeconds). Emitido
// quando a pessoa toca em "Votar" e devolvido junto com o voto; o servidor só aceita o voto
// depois que passou a espera exigida DESDE A EMISSÃO. Sem estado no servidor: é um HMAC com o
// AUTH_SECRET do host sobre (votação, emitido em, nonce). O nonce vai gravado no voto (coluna
// ticket_nonce, única) — um ticket vale um voto só, então esperar uma vez e reaproveitar o
// ticket em várias abas anônimas não pula a espera.
//
// A espera NÃO vai no ticket: é recalculada na hora do voto com a contagem daquele momento. Assim
// pedir 50 tickets de uma vez não adianta — o 50º voto da mesma rede precisa esperar como 50º.

const TICKET_TTL_MS = 15 * 60 * 1000;
const PREFIX = "v1";

export type VoteTicketScope = { kind: "match"; matchId: string } | { kind: "favorite" };

function scopeKey(scope: VoteTicketScope): string {
  return scope.kind === "match" ? `m-${scope.matchId}` : "f";
}

function secret(): string {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "erasto-league";
}

function sign(payload: string): string {
  return createHmac("sha256", `erasto-league:vote-ticket:${secret()}`).update(payload).digest("base64url").slice(0, 32);
}

export function issueVoteTicket(scope: VoteTicketScope, now = Date.now()): string {
  const nonce = randomBytes(12).toString("base64url");
  const payload = `${PREFIX}.${scopeKey(scope)}.${now}.${nonce}`;
  return `${payload}.${sign(payload)}`;
}

export type VoteTicketCheck =
  | { ok: true; nonce: string; issuedAt: number }
  | { ok: false; reason: "invalid" | "expired" };

// Só autenticidade, escopo e validade — a espera (que depende da contagem atual) é checada por
// quem chama, com issuedAt.
export function verifyVoteTicket(ticket: string | null | undefined, scope: VoteTicketScope, now = Date.now()): VoteTicketCheck {
  if (typeof ticket !== "string" || ticket.length > 200) return { ok: false, reason: "invalid" };
  const parts = ticket.split(".");
  if (parts.length !== 5 || parts[0] !== PREFIX) return { ok: false, reason: "invalid" };
  const [, key, issuedRaw, nonce, signature] = parts;
  if (key !== scopeKey(scope) || !/^[A-Za-z0-9_-]{16}$/.test(nonce)) return { ok: false, reason: "invalid" };

  const expected = Buffer.from(sign(parts.slice(0, 4).join(".")));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return { ok: false, reason: "invalid" };

  const issuedAt = Number(issuedRaw);
  if (!Number.isSafeInteger(issuedAt) || issuedAt > now + 5_000) return { ok: false, reason: "invalid" };
  if (now - issuedAt > TICKET_TTL_MS) return { ok: false, reason: "expired" };
  return { ok: true, nonce, issuedAt };
}
