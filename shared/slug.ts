// Slug pra URL pública de perfil (/erasto-league/teams/:slug, /players/:slug). Gerado do nome
// na criação, editável depois — unicidade é responsabilidade de quem chama (ver runtime/teams.ts,
// runtime/players.ts: tenta o slug base, cai pro sufixo -2/-3/... em colisão).
export function slugify(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "time";
}
