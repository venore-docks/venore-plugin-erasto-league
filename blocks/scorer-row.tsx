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

// Ícone de bola (inline SVG, não .png — sem asset bitmap no plugin hoje e um vetor acompanha
// tema/dark-mode via currentColor de graça) — só na artilharia, pra diferenciar visualmente o
// número de gols do número de MVPs (mesmo ScorerRow, ver blocks/mvp-scorers-block.tsx) e do placar
// de últimos resultados (blocks/match-result-card.tsx), que os dois usavam a mesma pílula genérica.
function BallIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M12 7.6l3.3 2.4-1.25 3.9H9.95L8.7 10l3.3-2.4zM12 7.6V4.3M15.3 10l3.1-1.7M14.05 14l2.1 3.05M9.95 14l-2.1 3.05M8.7 10l-3.1-1.7"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="currentColor"
        fillOpacity="0.18"
      />
    </svg>
  );
}

// Linha de ranking compartilhada entre artilharia (blocks/top-scorers-block.tsx) e MVPs
// (blocks/mvp-scorers-block.tsx) — tanto no bloco (top N) quanto na página cheia
// (routes/artillery-public, routes/mvp-public). `value` é o número em destaque à direita (gols ou
// contagem de MVPs); quem chama decide o que ele significa. `unit` é opcional (só a artilharia
// passa "gol"/"gols" já no plural certo — MVPs não tem uma palavra natural pro número e continua
// sem, mostrando só o número na pílula simples de antes).
export function ScorerRow({
  rank,
  name,
  slug,
  photoUrl,
  teamName,
  teamSlug,
  value,
  unit,
}: {
  rank: number;
  name: string;
  slug: string;
  photoUrl: string | null;
  teamName: string;
  teamSlug: string;
  value: string;
  unit?: string;
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
      {unit ? (
        <span className="flex shrink-0 flex-col items-center gap-0.5 rounded-panel bg-primary/10 px-3 py-1.5">
          <span className="flex items-center gap-1 text-lg font-bold tabular-nums text-primary">
            <BallIcon className="size-4 shrink-0" />
            {value}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wide text-primary/70">{unit}</span>
        </span>
      ) : (
        <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-lg font-bold tabular-nums text-primary">{value}</span>
      )}
    </li>
  );
}
