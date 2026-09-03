import { cookies } from "next/headers";

// PIN do controle — spike: vem da env `ERASTO_LEAGUE_PIN`, não de tabela/admin. Sem env
// configurada, cai num PIN padrão só pra a demo rodar de primeira numa LAN (o console mostra um
// aviso âmbar nesse caso). Trocar por PIN por partida no banco é trabalho da fase "site de
// verdade" (ver README).
const DEFAULT_PIN = "1234";
const COOKIE_NAME = "erasto-league-pin";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24; // 24h — evento acaba no mesmo dia.

export function configuredPin(): string {
  return process.env.ERASTO_LEAGUE_PIN?.trim() || DEFAULT_PIN;
}

// true quando NÃO há env — o console avisa que está usando o PIN padrão.
export function pinIsDefault(): boolean {
  return !process.env.ERASTO_LEAGUE_PIN?.trim();
}

export async function readPinCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

// Só chamável de dentro de uma Server Action (routes/control/actions.ts). `secure: false` de
// propósito: a saída de TV do broadcast roda atrás de TLS, mas este spike é pra rede local em
// http — com `secure: true` o cookie não gruda e o PIN pede toda hora.
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

// O cookie guarda o PIN em texto (mesma ideia do broadcast-output-pin): cada request reenvia e a
// gente reconfere aqui contra o valor configurado. Comparação simples — spike de LAN, sem
// hardening de timing (o broadcast usa scrypt + timingSafeEqual; fica pra fase de banco).
export async function hasValidPin(): Promise<boolean> {
  const cookie = await readPinCookie();
  return cookie !== null && cookie === configuredPin();
}
