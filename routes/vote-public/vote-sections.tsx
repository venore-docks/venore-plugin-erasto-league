import Link from "next/link";
import { Badge } from "@venore/plugin-sdk/ui";
import { getEliminatedTeamIds } from "../../runtime/bracket";
import { getTeam, listTeams } from "../../runtime/teams";
import { listPlayersByTeam } from "../../runtime/players";
import {
  getFavoriteTeamResults,
  getMatchFanVoteResults,
  getMatchWinnerVoteResults,
  getVoterFavoriteTeam,
  getVoterMatchChoice,
  getVoterMatchWinnerChoice,
  type FinalMatchPoll,
  type MatchVotePoll,
} from "../../runtime/fan-votes";
import { PLAYER_POSITION_LABEL } from "../../shared/player-position";
import { VoteResultsList } from "../../blocks/vote-results-list";
import { Ballot, type BallotOption, type BallotSection } from "./ballot";
import type { PlayerProfile, TeamProfile } from "../../contracts/types";

// Seções de voto reaproveitadas pelo hub (/erasto-league/votar) e pelas páginas próprias de cada
// votação (/erasto-league/votar/jogo/:id, /erasto-league/votar/time-favorito). Server components:
// leem o cookie do aparelho (voterKey, runtime/voter.ts) só pra saber "em quem este aparelho já
// votou" — quem grava é a Server Action (routes/vote-public/actions.ts).

const RESULTS_LIMIT = 10;

export function formatSaoPauloDateTime(epochMs: number): string {
  return new Date(epochMs).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function TeamCrest({ team, className }: { team: TeamProfile | null; className: string }) {
  if (team?.crestUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={team.crestUrl} alt="" className={`${className} rounded-full object-cover`} />;
  }
  return (
    <span
      className={`${className} flex items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground`}
      style={{ boxShadow: `inset 0 0 0 2px ${team?.primaryColor ?? "var(--border)"}` }}
    >
      {(team?.name ?? "—").slice(0, 2).toUpperCase()}
    </span>
  );
}

function playerCaption(player: PlayerProfile): string | null {
  const parts = [
    player.number != null ? `#${player.number}` : null,
    player.position ? PLAYER_POSITION_LABEL[player.position] : null,
    player.isCaptain ? "Capitão" : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function rosterSection(team: TeamProfile | null, roster: PlayerProfile[], key: string): BallotSection {
  return {
    key,
    title: team?.name ?? "—",
    color: team?.primaryColor ?? null,
    options: roster.map(
      (player): BallotOption => ({
        id: player.id,
        name: player.name,
        imageUrl: player.photoUrl,
        caption: playerCaption(player),
        color: team?.primaryColor ?? null,
      }),
    ),
  };
}

function windowLabel(poll: { window: MatchVotePoll["window"]; isOpen: boolean }, windowHours: number): string {
  if (!poll.window) return "Votação indisponível para este jogo.";
  if (poll.window.closesAt === null) return `Votação aberta — fica aberta até ${windowHours}h depois do fim do jogo.`;
  if (poll.isOpen) return `Votação aberta até ${formatSaoPauloDateTime(poll.window.closesAt)}.`;
  return `Votação encerrada em ${formatSaoPauloDateTime(poll.window.closesAt)}.`;
}

export async function MatchVoteSection({
  poll,
  voterKey,
  windowHours,
  turnstileSiteKey,
  headingLevel = "h1",
}: {
  poll: MatchVotePoll;
  voterKey: string | null;
  windowHours: number;
  turnstileSiteKey: string | null;
  headingLevel?: "h1" | "h2";
}) {
  const { match } = poll;
  const [homeTeam, awayTeam, homeRoster, awayRoster, results, voterChoice] = await Promise.all([
    getTeam(match.homeTeamId),
    getTeam(match.awayTeamId),
    listPlayersByTeam(match.homeTeamId),
    listPlayersByTeam(match.awayTeamId),
    getMatchFanVoteResults(match.id, RESULTS_LIMIT),
    getVoterMatchChoice(match.id, voterKey),
  ]);
  const Heading = headingLevel;
  const title = `${homeTeam?.name ?? "—"} × ${awayTeam?.name ?? "—"}`;

  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <TeamCrest team={homeTeam} className="size-10 shrink-0" />
          <TeamCrest team={awayTeam} className="-ml-4 size-10 shrink-0 ring-2 ring-background" />
          <Heading className="min-w-0 text-xl font-extrabold tracking-tight text-foreground sm:text-3xl">{title}</Heading>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={poll.isOpen ? "default" : "secondary"}>{poll.isOpen ? "Votação aberta" : "Votação encerrada"}</Badge>
          <span className="text-xs text-muted-foreground">{windowLabel(poll, windowHours)}</span>
        </div>
        <Link href={`/erasto-league/jogos/${match.id}`} className="inline-block text-xs font-semibold text-primary hover:underline">
          Ver página do jogo →
        </Link>
      </div>

      {poll.isOpen ? (
        <Ballot
          kind="match"
          hiddenFields={{ matchId: match.id }}
          sections={[rosterSection(homeTeam, homeRoster, "home"), rosterSection(awayTeam, awayRoster, "away")]}
          currentChoiceId={voterChoice}
          allowChange={false}
          turnstileSiteKey={turnstileSiteKey}
        />
      ) : (
        voterChoice && (
          <p className="text-sm text-muted-foreground">
            Seu voto:{" "}
            <span className="font-semibold text-foreground">
              {[...homeRoster, ...awayRoster].find((player) => player.id === voterChoice)?.name ?? "—"}
            </span>
          </p>
        )
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{poll.isOpen ? "Parcial" : "Resultado final"}</h3>
        <VoteResultsList results={results} highlightId={voterChoice} />
      </div>
    </section>
  );
}

// "Favorito da Final" — mesmo molde de MatchVoteSection (voto único, janela automática), só que
// escolhendo o TIME vencedor em vez do jogador, e só existe quando a final já tem os dois finalistas
// definidos (getFinalMatchPoll, runtime/fan-votes.ts).
export async function WinnerVoteSection({
  poll,
  voterKey,
  windowHours,
  turnstileSiteKey,
  headingLevel = "h1",
}: {
  poll: FinalMatchPoll;
  voterKey: string | null;
  windowHours: number;
  turnstileSiteKey: string | null;
  headingLevel?: "h1" | "h2";
}) {
  const { match } = poll;
  const [homeTeam, awayTeam, results, voterChoice] = await Promise.all([
    getTeam(match.homeTeamId),
    getTeam(match.awayTeamId),
    getMatchWinnerVoteResults(match.id, RESULTS_LIMIT),
    getVoterMatchWinnerChoice(match.id, voterKey),
  ]);
  const Heading = headingLevel;
  const title = `${homeTeam?.name ?? "—"} × ${awayTeam?.name ?? "—"}`;
  const teams = [homeTeam, awayTeam].filter((team): team is TeamProfile => team !== null);

  const section: BallotSection = {
    key: "final-teams",
    title: "Quem vai ganhar?",
    color: null,
    options: teams.map((team) => ({ id: team.id, name: team.name, imageUrl: team.crestUrl, caption: null, color: team.primaryColor })),
  };

  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <TeamCrest team={homeTeam} className="size-10 shrink-0" />
          <TeamCrest team={awayTeam} className="-ml-4 size-10 shrink-0 ring-2 ring-background" />
          <Heading className="min-w-0 text-xl font-extrabold tracking-tight text-foreground sm:text-3xl">🏆 Favorito da Final</Heading>
        </div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={poll.isOpen ? "default" : "secondary"}>{poll.isOpen ? "Votação aberta" : "Votação encerrada"}</Badge>
          <span className="text-xs text-muted-foreground">{windowLabel(poll, windowHours)}</span>
        </div>
      </div>

      {poll.isOpen ? (
        <Ballot
          kind="winner"
          hiddenFields={{ matchId: match.id }}
          sections={[section]}
          currentChoiceId={voterChoice}
          allowChange={false}
          turnstileSiteKey={turnstileSiteKey}
        />
      ) : (
        voterChoice && (
          <p className="text-sm text-muted-foreground">
            Seu voto: <span className="font-semibold text-foreground">{teams.find((team) => team.id === voterChoice)?.name ?? "—"}</span>
          </p>
        )
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{poll.isOpen ? "Parcial" : "Resultado final"}</h3>
        <VoteResultsList results={results} highlightId={voterChoice} />
      </div>
    </section>
  );
}

export async function FavoriteTeamVoteSection({
  voterKey,
  isOpen,
  turnstileSiteKey,
  headingLevel = "h1",
}: {
  voterKey: string | null;
  isOpen: boolean;
  turnstileSiteKey: string | null;
  headingLevel?: "h1" | "h2";
}) {
  const [teams, eliminated, voterChoice] = await Promise.all([listTeams(), getEliminatedTeamIds(), getVoterFavoriteTeam(voterKey)]);
  // Pedido explícito: o percentual (getFavoriteTeamResults) só considera quem ainda está na
  // disputa, mas a CÉDULA continua mostrando os eliminados (só não dá pra escolher neles) — senão
  // "Seu voto: X" não teria como achar o nome de quem já foi eliminado, e quem votou num time
  // eliminado ficaria sem saber em quem tinha votado. Eliminados vão pro fim da lista.
  const sortedTeams = [...teams].sort((a, b) => Number(eliminated.has(a.id)) - Number(eliminated.has(b.id)));
  const results = await getFavoriteTeamResults(RESULTS_LIMIT, eliminated);
  const Heading = headingLevel;

  const section: BallotSection = {
    key: "teams",
    title: "Times",
    color: null,
    options: sortedTeams.map((team) => ({
      id: team.id,
      name: team.name,
      imageUrl: team.crestUrl,
      caption: null,
      color: team.primaryColor,
      eliminated: eliminated.has(team.id),
    })),
  };

  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <Heading className="text-xl font-extrabold tracking-tight text-foreground sm:text-3xl">Time favorito</Heading>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={isOpen ? "default" : "secondary"}>{isOpen ? "Votação aberta" : "Votação encerrada"}</Badge>
          <span className="text-xs text-muted-foreground">
            {isOpen ? "Vale a temporada inteira — dá pra trocar o voto enquanto estiver aberta." : "A votação desta temporada está fechada."}
          </span>
        </div>
      </div>

      {isOpen ? (
        <Ballot
          kind="favorite"
          hiddenFields={{}}
          sections={[section]}
          currentChoiceId={voterChoice}
          allowChange
          turnstileSiteKey={turnstileSiteKey}
        />
      ) : (
        voterChoice && (
          <p className="text-sm text-muted-foreground">
            Seu voto: <span className="font-semibold text-foreground">{teams.find((team) => team.id === voterChoice)?.name ?? "—"}</span>
          </p>
        )
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{isOpen ? "Parcial" : "Resultado"}</h3>
        <VoteResultsList results={results} highlightId={voterChoice} />
      </div>
    </section>
  );
}
