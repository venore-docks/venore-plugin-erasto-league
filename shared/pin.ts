import { cookies } from "next/headers";
import { resolveErastoLeagueConfig } from "./config";

// PIN de escrita do controle (celular). Valor resolvido em shared/config.ts: setting
// `erasto-league.pin` > env `ERASTO_LEAGUE_PIN` > "1234". O cookie guarda o PIN em texto (spike de
// LAN, mesma ideia do broadcast-output-pin) e cada request reconfere aqui. Sem hardening de timing
// — fica pra quando virar PIN por partida no banco.
const COOKIE_NAME = "erasto-league-pin";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24; // 24h — evento acaba no mesmo dia.

export async function readPinCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

// Só chamável de dentro de uma Server Action. `secure: false` de propósito: o spike pode rodar em
// http numa LAN — com `secure: true` o cookie não gruda e o PIN pede toda hora.
export async function writePinCookie(pin: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, pin, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

export async function hasValidPin(): Promise<boolean> {
  const cookie = await readPinCookie();
  if (cookie === null) return false;
  const config = await resolveErastoLeagueConfig();
  return cookie === config.pin;
}
