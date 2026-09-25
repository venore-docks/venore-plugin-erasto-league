import { headers } from "next/headers";
import { pickClientIp } from "../shared/fan-votes";

// Anti-robô OPCIONAL da votação (Cloudflare Turnstile, gratuito e quase sempre invisível). Só
// liga quando as duas variáveis de ambiente existem — sem elas a votação funciona normalmente, só
// sem essa barreira contra script (a proteção fica no cookie + auditoria do admin). Variáveis com
// prefixo do plugin de propósito: são desta instância/plugin, não um recurso genérico do core.
//   ERASTO_LEAGUE_TURNSTILE_SITE_KEY   (pública, vai pro navegador)
//   ERASTO_LEAGUE_TURNSTILE_SECRET_KEY (secreta, só no servidor)

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

function readEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

// null = Turnstile desligado (a página de voto não renderiza o widget).
export function getTurnstileSiteKey(): string | null {
  const siteKey = readEnv("ERASTO_LEAGUE_TURNSTILE_SITE_KEY");
  const secret = readEnv("ERASTO_LEAGUE_TURNSTILE_SECRET_KEY");
  return siteKey && secret ? siteKey : null;
}

// true quando desligado (nada a verificar). Ligado: falha fechada — sem token, token inválido ou a
// Cloudflare fora do ar = voto recusado (a pessoa tenta de novo; melhor que abrir pra script).
export async function verifyTurnstileToken(token: string | null): Promise<boolean> {
  const secret = readEnv("ERASTO_LEAGUE_TURNSTILE_SECRET_KEY");
  if (!getTurnstileSiteKey() || !secret) return true;
  if (!token) return false;

  const headerList = await headers();
  const body = new URLSearchParams({ secret, response: token });
  const ip = pickClientIp(headerList.get("x-real-ip"), headerList.get("x-forwarded-for"));
  if (ip) body.set("remoteip", ip);

  try {
    const response = await fetch(VERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(5_000) });
    if (!response.ok) return false;
    const data = (await response.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
