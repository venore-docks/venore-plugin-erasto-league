import { createHash, createHmac, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { normalizeIpForGrouping, pickClientIp } from "../shared/fan-votes";

// Identidade de quem vota na torcida — SEM login (pedido explícito). Um cookie de aparelho
// (httpOnly, 400 dias — teto do Chrome) com um token aleatório; no banco vai só o hash dele
// (voterKey), nunca o valor cru. Limpar cookie/aba anônima = "aparelho novo": é a limitação aceita
// desse modelo, e o que a auditoria por IP (ipHash/uaHash) existe pra deixar visível ao admin.
//
// IP e user-agent nunca são gravados em claro: HMAC com o AUTH_SECRET do host (sem o segredo, um
// hash de IPv4 seria reversível por força bruta — são só 2^32 valores), truncado. Só servem pra
// agrupar votos na auditoria (shared/fan-votes.ts buildAuditGroups).

const VOTER_COOKIE = "erasto_league_voter";
const VOTER_COOKIE_MAX_AGE_S = 400 * 24 * 60 * 60;

export type VoterIdentity = {
  voterKey: string;
  ipHash: string | null;
  uaHash: string | null;
};

function hashSecret(): string {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "erasto-league";
}

function keyedHash(namespace: string, value: string, length: number): string {
  return createHmac("sha256", `erasto-league:${namespace}:${hashSecret()}`).update(value).digest("hex").slice(0, length);
}

function voterKeyFromToken(token: string): string {
  return createHash("sha256").update(token).digest("hex").slice(0, 40);
}

// Token precisa ter cara de token (base64url, tamanho certo) — cookie adulterado com lixo/valor
// gigante vira "sem cookie" e ganha um token novo, em vez de entrar como chave no banco.
function isValidToken(token: string | undefined): token is string {
  return typeof token === "string" && /^[A-Za-z0-9_-]{32,64}$/.test(token);
}

// Só leitura (página/bloco renderizando "você já votou em X") — nunca cria cookie: cookies() só é
// gravável em Server Action/Route Handler.
export async function readVoterKey(): Promise<string | null> {
  const token = (await cookies()).get(VOTER_COOKIE)?.value;
  return isValidToken(token) ? voterKeyFromToken(token) : null;
}

// Na hora do voto (Server Action): reaproveita o cookie do aparelho ou cria um novo, e calcula os
// hashes de auditoria do request atual.
export async function ensureVoterIdentity(): Promise<VoterIdentity> {
  const cookieStore = await cookies();
  let token = cookieStore.get(VOTER_COOKIE)?.value;
  if (!isValidToken(token)) {
    token = randomBytes(24).toString("base64url");
  }
  // Regrava sempre (renova os 400 dias a cada voto).
  cookieStore.set(VOTER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: VOTER_COOKIE_MAX_AGE_S,
  });

  const headerList = await headers();
  const ip = normalizeIpForGrouping(pickClientIp(headerList.get("x-real-ip"), headerList.get("x-forwarded-for")));
  const userAgent = headerList.get("user-agent")?.trim() ?? "";

  return {
    voterKey: voterKeyFromToken(token),
    ipHash: ip ? keyedHash("ip", ip, 16) : null,
    uaHash: userAgent ? keyedHash("ua", userAgent, 12) : null,
  };
}
