import { getMatch } from "./matches";
import { getTeam, listTeams } from "./teams";
import { getPlayerBySlug } from "./players";
import { getPlayerStats } from "./stats";
import { listFanVoteAwardsForPlayer, listOpenMatchPolls } from "./fan-votes";
import { loadMatchCoverData } from "./match-cover";
import { readFanVoteWindowHours, resolveErastoLeagueConfig } from "../shared/config";
import { formatScore } from "../shared/score";
import type { StoryRequest } from "../shared/story-request";
import type { StoryData, StoryTeam } from "./story-image";
import { resolveMediaImageUrl } from "../shared/media-url";

// Dados de cada story do Instagram (runtime/story-image.tsx) — mesmo conteúdo das páginas que têm o
// botão (jogo, votação, jogador, time favorito). null = jogo/jogador não existe mais.

async function loadMatchStory(matchId: string, vote: boolean, domain: string): Promise<StoryData | null> {
  const [cover, match] = await Promise.all([loadMatchCoverData(matchId), getMatch(matchId)]);
  if (!cover || !match || match.status === "cancelled") return null;

  const live = match.status === "in_progress";
  const kicker = vote ? "Vote no Jogador da Torcida" : live ? "Ao vivo" : "Resultado";
  const cta = vote ? "Toque no link e vote" : live ? "Assista ao vivo" : match.youtubeUrl ? "Assista ao jogo completo" : "Veja a súmula do jogo";

  return {
    kicker,
    cta,
    domain,
    leagueLogoUrl: cover.leagueLogoUrl,
    accentColor: cover.accentColor,
    content: {
      kind: "match",
      home: { name: cover.homeName, crestUrl: cover.homeCrestUrl, color: cover.homeColor },
      away: { name: cover.awayName, crestUrl: cover.awayCrestUrl, color: cover.awayColor },
      score: { home: formatScore(match.homeScore), away: formatScore(match.awayScore) },
      caption: [cover.stageLabel, cover.dateLabel].filter(Boolean).join(" · ") || null,
    },
  };
}

async function loadPlayerStory(slug: string, domain: string): Promise<StoryData | null> {
  const player = await getPlayerBySlug(slug);
  if (!player) return null;

  const windowHours = await readFanVoteWindowHours();
  const [team, stats, fanVoteAwards, config] = await Promise.all([
    getTeam(player.teamId),
    getPlayerStats(player.id, player.teamId),
    listFanVoteAwardsForPlayer(player.id, windowHours),
    resolveErastoLeagueConfig(),
  ]);

  return {
    kicker: "Perfil do jogador",
    cta: "Veja o perfil completo",
    domain,
    leagueLogoUrl: config.logoUrl || null,
    accentColor: config.accentColor,
    content: {
      kind: "player",
      name: player.name,
      subtitle: [player.number != null ? `#${player.number}` : null, team?.name].filter(Boolean).join(" · "),
      // Foto do story sai em 640×640 (runtime/story-image.tsx) — maior que a de exibição do site.
      photoUrl: await resolveMediaImageUrl(player.photoMediaId, 640, 1),
      color: team?.primaryColor ?? null,
      stats: [
        { label: "Gols", value: formatScore(stats.goals) },
        { label: "MVPs", value: String(stats.mvpCount) },
        { label: "Jogador da Torcida", value: String(fanVoteAwards.length) },
      ],
    },
  };
}

async function loadTeamsStory(title: string, subtitle: string | null, domain: string): Promise<StoryData> {
  const [teams, config] = await Promise.all([listTeams(), resolveErastoLeagueConfig()]);
  const storyTeams: StoryTeam[] = teams.map((team) => ({ name: team.name, crestUrl: team.crestUrl, color: team.primaryColor }));
  return {
    kicker: "Votação da torcida",
    cta: "Toque no link e vote",
    domain,
    leagueLogoUrl: config.logoUrl || null,
    accentColor: config.accentColor,
    content: { kind: "teams", title, subtitle, teams: storyTeams },
  };
}

// domain: host do site, escrito embaixo do story (o link de verdade vai no sticker).
export async function loadStoryData(request: StoryRequest, domain: string): Promise<StoryData | null> {
  if (request.kind === "match") return loadMatchStory(request.matchId, request.vote, domain);
  if (request.kind === "player") return loadPlayerStory(request.slug, domain);
  if (request.kind === "favorite-team") return loadTeamsStory("Qual é o seu time favorito?", "Vote e acompanhe a parcial", domain);

  // Hub: com jogo em votação, o story chama pra ele; sem nenhum, a votação da torcida em geral.
  const openPolls = await listOpenMatchPolls(await readFanVoteWindowHours());
  if (openPolls[0]) return loadMatchStory(openPolls[0].match.id, true, domain);
  return loadTeamsStory("Jogador da Torcida e Time favorito", "Sem cadastro: cada celular vota uma vez", domain);
}
