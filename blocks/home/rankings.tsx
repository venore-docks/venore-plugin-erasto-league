import Link from "next/link";
import { listTopMvps, listTopScorers } from "../../runtime/stats";
import { listFanVoteRanking } from "../../runtime/fan-votes";
import { formatScore } from "../../shared/score";
import { rankPositions } from "../../shared/ranking";

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

type RankingEntry = { id: string; slug: string; name: string; teamName: string; photoUrl: string | null; value: number; valueLabel: string };

function Avatar({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photoUrl} alt="" loading="lazy" className="size-8 shrink-0 rounded-full object-cover" />;
  }
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}

// Ranking enxuto pra coluna lateral — os blocos cheios (blocks/scorer-row.tsx) são largos demais
// pra 3 rankings empilhados. Posição dividida no empate (shared/ranking.ts).
function CompactRanking({ title, href, entries, emptyMessage }: { title: string; href: string; entries: RankingEntry[]; emptyMessage: string }) {
  const positions = rankPositions(entries.map((entry) => entry.value));
  return (
    <div className="rounded-panel border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</h3>
        <Link href={href} className="text-xs font-semibold text-primary hover:underline">
          Ver todos →
        </Link>
      </div>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <ol className="space-y-0.5">
          {entries.map((entry, index) => (
            <li key={entry.id}>
              <Link
                href={`/erasto-league/players/${entry.slug}`}
                className="flex items-center gap-2.5 rounded-md px-1 py-1.5 ui-motion-base hover:bg-muted"
              >
                <span className="w-5 shrink-0 text-center text-sm" aria-label={`${positions[index]}º`}>
                  {MEDAL[positions[index]] ?? <span className="text-xs font-semibold text-muted-foreground">{positions[index]}</span>}
                </span>
                <Avatar name={entry.name} photoUrl={entry.photoUrl} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">{entry.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{entry.teamName}</span>
                </span>
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-sm font-bold tabular-nums text-primary">{entry.valueLabel}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// Destaques da página inicial: artilharia, MVPs e Jogador da Torcida — cada um com o link pra
// lista completa (/erasto-league/artilharia, /mvps, /jogador-da-torcida).
export async function HomeRankings({ windowHours }: { windowHours: number }) {
  const [scorers, mvps, fanVotes] = await Promise.all([listTopScorers(5), listTopMvps(3), listFanVoteRanking(windowHours, 3)]);

  return (
    <div className="space-y-3">
      <CompactRanking
        title="⚽ Artilharia"
        href="/erasto-league/artilharia"
        emptyMessage="Nenhum gol registrado ainda."
        entries={scorers.map((entry) => ({
          id: entry.playerId,
          slug: entry.slug,
          name: entry.name,
          teamName: entry.teamName,
          photoUrl: entry.photoUrl,
          value: entry.goals,
          valueLabel: formatScore(entry.goals),
        }))}
      />
      <CompactRanking
        title="⭐ MVPs"
        href="/erasto-league/mvps"
        emptyMessage="Nenhum MVP escolhido ainda."
        entries={mvps.map((entry) => ({
          id: entry.playerId,
          slug: entry.slug,
          name: entry.name,
          teamName: entry.teamName,
          photoUrl: entry.photoUrl,
          value: entry.mvpCount,
          valueLabel: String(entry.mvpCount),
        }))}
      />
      <CompactRanking
        title="📣 Jogador da Torcida"
        href="/erasto-league/jogador-da-torcida"
        emptyMessage="Nenhuma votação encerrada ainda."
        entries={fanVotes.map((entry) => ({
          id: entry.playerId,
          slug: entry.slug,
          name: entry.name,
          teamName: entry.teamName,
          photoUrl: entry.photoUrl,
          value: entry.wins,
          valueLabel: String(entry.wins),
        }))}
      />
    </div>
  );
}
