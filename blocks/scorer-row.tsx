import Link from "next/link";

const RANK_MEDAL: Record<number, string> = { 0: "🥇", 1: "🥈", 2: "🥉" };

// Silhueta genérica — usada quando o jogador não tem foto cadastrada ainda, em vez de iniciais
// (pedido explícito: "avatar placeholder", não texto).
function PlayerAvatarPlaceholder() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-6 text-muted-foreground/70">
      <circle cx="12" cy="8" r="4" fill="currentColor" />
      <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" fill="currentColor" />
    </svg>
  );
}

// Linha de ranking compartilhada entre artilharia (blocks/top-scorers-block.tsx) e MVPs
// (blocks/mvp-scorers-block.tsx) — tanto no bloco (top N) quanto na página cheia
// (routes/artillery-public, routes/mvp-public). `value` é o número em destaque à direita (gols ou
// contagem de MVPs); quem chama decide o que ele significa.
export function ScorerRow({
  rank,
  name,
  slug,
  photoUrl,
  teamName,
  teamSlug,
  value,
}: {
  rank: number;
  name: string;
  slug: string;
  photoUrl: string | null;
  teamName: string;
  teamSlug: string;
  value: string;
}) {
  return (
    <li
      className={`flex items-center gap-3 rounded-panel border bg-card px-4 py-3 shadow-sm transition hover:border-primary/40 ${
        rank < 3 ? "border-primary/30" : "border-border"
      }`}
    >
      <span className="w-7 shrink-0 text-center text-lg" aria-hidden="true">
        {RANK_MEDAL[rank] ?? <span className="text-sm font-semibold text-muted-foreground">{rank + 1}</span>}
      </span>
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className="size-11 shrink-0 rounded-full border border-border/60 object-cover shadow-sm" />
      ) : (
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted">
          <PlayerAvatarPlaceholder />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <Link href={`/erasto-league/players/${slug}`} className="block truncate text-sm font-semibold text-foreground hover:underline">
          {name}
        </Link>
        <Link href={`/erasto-league/teams/${teamSlug}`} className="block truncate text-xs text-muted-foreground hover:underline">
          {teamName}
        </Link>
      </div>
      <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-lg font-bold tabular-nums text-primary">{value}</span>
    </li>
  );
}
