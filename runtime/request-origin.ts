import { headers } from "next/headers";

// Origem pública do site (https://dominio) a partir do request atual — pro QR code da votação
// precisar de URL absoluta sem uma setting "URL do site" a mais pra configurar. Mesma leitura de
// host/x-forwarded-proto de platform/breadcrumbs/resolve-breadcrumbs.ts no core. O overlay/TV
// são abertos pelo domínio de produção (OBS/TV), então é esse domínio que vai no QR.
export async function resolveRequestOrigin(): Promise<{ origin: string; host: string }> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host")?.split(",")[0]?.trim() || headerList.get("host") || "localhost:3000";
  const proto =
    headerList.get("x-forwarded-proto")?.split(",")[0]?.trim() || (process.env.NODE_ENV === "production" ? "https" : "http");
  return { origin: `${proto}://${host}`, host };
}

export const VOTE_HUB_PATH = "/erasto-league/votar";
