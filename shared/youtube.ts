// Link do jogo (matches.youtube_url) — colado à mão pelo admin na súmula, então precisa ser
// tolerante ao que a pessoa realmente cola: link de "assistir" (watch?v=), link curto (youtu.be/),
// live em andamento (/live/) ou já um link de embed. Guardamos a URL como o admin colou (pra
// "Assistir no YouTube ↗" sempre funcionar mesmo se o id não bater em nenhum padrão conhecido) e só
// extraímos o id na hora de montar o player embutido da página do jogo (routes/match-public).

const YOUTUBE_ID = /^[a-zA-Z0-9_-]{6,}$/;

// Aceita colar qualquer link de vídeo/live do YouTube (ou vazio, pra limpar) — outros domínios são
// rejeitados (retorna null) porque a página do jogo assume YouTube pro embed; a URL fica só
// guardada, não validada além disso (o vídeo pode ainda nem existir/estar privado, não dá pra saber
// sem chamar a API).
export function sanitizeYoutubeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\.|^m\./, "");
  if (host !== "youtube.com" && host !== "youtu.be" && host !== "youtube-nocookie.com") return null;

  return trimmed;
}

// Extrai o id do vídeo pra montar .../embed/<id> — cobre watch?v=, youtu.be/<id>, /live/<id>,
// /embed/<id> e /shorts/<id>. null quando o formato não é reconhecido (link ainda funciona como
// "Assistir no YouTube ↗", só não ganha player embutido na página).
export function extractYoutubeVideoId(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\.|^m\./, "");
  let id: string | null = null;

  if (host === "youtu.be") {
    id = url.pathname.slice(1).split("/")[0] || null;
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") {
      id = url.searchParams.get("v");
    } else {
      const match = url.pathname.match(/^\/(?:live|embed|shorts)\/([^/]+)/);
      id = match ? match[1] : null;
    }
  }

  return id && YOUTUBE_ID.test(id) ? id : null;
}
