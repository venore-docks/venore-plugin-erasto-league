import Link from "next/link";
import { notFound } from "next/navigation";
import { isPluginActive } from "@venore/plugin-sdk";
import { getMatch } from "../../runtime/matches";
import { toMatchVotePoll } from "../../runtime/fan-votes";
import { readVoterKey } from "../../runtime/voter";
import { getTurnstileSiteKey } from "../../runtime/turnstile";
import { readFanVoteWindowHours } from "../../shared/config";
import { MatchVoteSection } from "./vote-sections";
import { getTeam } from "../../runtime/teams";
import { resolveRequestOrigin } from "../../runtime/request-origin";
import { storyPath } from "../../shared/story-request";
import { ShareBar } from "../../blocks/share-bar";

// /erasto-league/votar/jogo/:id — votação do Jogador da Torcida de UM jogo (link direto; o hub
// /erasto-league/votar manda pra cá quando há mais de um jogo aberto ao mesmo tempo). Aberta ou
// encerrada, sempre mostra o resultado — encerrada vira a página do "resultado final".
export default async function MatchVotePage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isPluginActive("erasto-league"))) {
    notFound();
  }

  const { id } = await params;
  const match = await getMatch(id);
  if (!match || match.status === "cancelled") {
    notFound();
  }

  const [windowHours, voterKey, homeTeam, awayTeam, { origin }] = await Promise.all([
    readFanVoteWindowHours(),
    readVoterKey(),
    getTeam(match.homeTeamId),
    getTeam(match.awayTeamId),
    resolveRequestOrigin(),
  ]);
  const poll = toMatchVotePoll(match, windowHours);
  const matchLabel = `${homeTeam?.name ?? "—"} × ${awayTeam?.name ?? "—"}`;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Erasto League · Jogador da Torcida</p>
      </div>
      <MatchVoteSection poll={poll} voterKey={voterKey} windowHours={windowHours} turnstileSiteKey={getTurnstileSiteKey()} />
      <ShareBar
        url={`${origin}/erasto-league/votar/jogo/${id}`}
        text={
          poll.isOpen
            ? `📣 Vote no Jogador da Torcida de ${matchLabel} — Erasto League`
            : `📣 Resultado do Jogador da Torcida de ${matchLabel} — Erasto League`
        }
        storyUrl={storyPath({ kind: "match", matchId: id, vote: true })}
      />
      <Link href="/erasto-league/votar" className="inline-block text-sm font-semibold text-primary hover:underline">
        ← Todas as votações (e o seu time favorito)
      </Link>
    </div>
  );
}
