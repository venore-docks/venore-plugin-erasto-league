import Link from "next/link";
import type { CSSProperties } from "react";
import type { FanVoteResults } from "../runtime/fan-votes";

const RANK_MEDAL: Record<number, string> = { 0: "🥇", 1: "🥈", 2: "🥉" };

function AvatarPlaceholder({ label }: { label: string }) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
      {label.slice(0, 2).toUpperCase()}
    </span>
  );
}

// Resultado (parcial ou final) de uma votação da torcida — Jogador da Torcida ou Time favorito.
// DENTRO da shell/tema do host: só tokens shadcn; a única cor "livre" é a cor do time (dado do
// cadastro), misturada no fundo da barra via color-mix, mesmo princípio de
// routes/teams-public/team-profile-view.tsx. Sem hooks — serve tanto em server component (bloco,
// páginas) quanto dentro de client component.
export function VoteResultsList({
  results,
  highlightId,
  emptyMessage = "Nenhum voto ainda — seja o primeiro!",
}: {
  results: FanVoteResults;
  // Id da escolha deste aparelho (destaca a linha com "seu voto").
  highlightId?: string | null;
  emptyMessage?: string;
}) {
  if (results.entries.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      <ol className="space-y-2">
        {results.entries.map((entry, index) => {
          const color = entry.color ?? "var(--primary)";
          const isMine = highlightId === entry.id;
          return (
            <li key={entry.id}>
              <Link
                href={entry.href}
                className={`relative flex items-center gap-3 overflow-hidden rounded-panel border bg-card px-3 py-2.5 ui-motion-base hover:bg-muted/40 ${
                  isMine ? "border-primary" : "border-border"
                }`}
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0"
                  style={
                    {
                      width: `${entry.percent}%`,
                      background: `color-mix(in srgb, ${color} 16%, transparent)`,
                    } as CSSProperties
                  }
                />
                <span className="relative w-6 shrink-0 text-center text-sm font-bold text-muted-foreground">
                  {RANK_MEDAL[index] ?? index + 1}
                </span>
                {entry.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={entry.imageUrl} alt="" className="relative size-10 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="relative">
                    <AvatarPlaceholder label={entry.name} />
                  </span>
                )}
                <span className="relative min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {entry.name}
                    {isMine && <span className="ml-2 text-xs font-bold text-primary">seu voto</span>}
                  </span>
                  {entry.subtitle && <span className="block truncate text-xs text-muted-foreground">{entry.subtitle}</span>}
                </span>
                <span className="relative shrink-0 text-right">
                  <span className="block text-base font-extrabold tabular-nums text-foreground">{entry.percent}%</span>
                  <span className="block text-xs tabular-nums text-muted-foreground">
                    {entry.votes} voto{entry.votes === 1 ? "" : "s"}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      <p className="text-xs text-muted-foreground">
        {results.totalVotes} voto{results.totalVotes === 1 ? "" : "s"} no total
      </p>
    </div>
  );
}
