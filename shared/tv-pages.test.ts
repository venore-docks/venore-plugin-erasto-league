import { describe, expect, it } from "vitest";
import { buildTvPages, DEFAULT_TV_PAGE_VISIBILITY, type TvPagesOptions } from "./tv-pages";
import type { BracketView } from "../runtime/bracket";
import type { FanVoteResults } from "../runtime/fan-votes";
import type { TeamStanding } from "../contracts/types";

const standing: TeamStanding = {
  teamId: "team-1",
  slug: "team-1",
  name: "Time 1",
  crestUrl: null,
  played: 1,
  won: 1,
  drawn: 0,
  lost: 0,
  goalsFor: 3,
  goalsAgainst: 1,
  points: 3,
  yellowCards: 0,
  redCards: 0,
};

function bracket(overrides: Partial<BracketView> = {}): BracketView {
  return {
    groups: [{ name: "A", standings: [standing], fixtures: [] }],
    knockout: [{ phase: "final", fixtures: [] }],
    ...overrides,
  };
}

const favoriteResults: FanVoteResults = {
  totalVotes: 10,
  entries: [{ id: "team-1", name: "Time 1", imageUrl: null, subtitle: null, href: "/erasto-league/teams/team-1", color: null, votes: 10, percent: 100 }],
  leaders: [{ id: "team-1", name: "Time 1", votes: 10 }],
};

function options(overrides: Partial<TvPagesOptions> = {}): TvPagesOptions {
  return { groupStageClosed: false, visibility: DEFAULT_TV_PAGE_VISIBILITY, ...overrides };
}

describe("buildTvPages", () => {
  it("mostra grupos quando a fase de grupos não está encerrada", () => {
    const pages = buildTvPages(bracket(), [], null, [], null, null, options());
    expect(pages.map((p) => p.kind)).toContain("group");
  });

  // Bug real: a TV continuava mostrando a chave de grupos mesmo com "fase de grupos encerrada"
  // marcada no admin (shared/settings.ts groupStageClosed), porque buildTvPages nunca recebia essa
  // setting — só a home (blocks/home-block.tsx) a respeitava.
  it("esconde grupos E classificação geral quando a fase de grupos está encerrada", () => {
    const pages = buildTvPages(bracket(), [standing], null, [], null, null, options({ groupStageClosed: true }));
    expect(pages.map((p) => p.kind)).not.toContain("group");
    expect(pages.map((p) => p.kind)).not.toContain("standings");
  });

  it("cada tipo de página some quando desligado em visibility", () => {
    const allOff = { nextGame: false, standings: false, scorers: false, bracket: false, finalWinner: false, favoriteTeam: false };
    const pages = buildTvPages(
      bracket(),
      [],
      null,
      [{ playerId: "p1", slug: "p1", name: "J1", number: null, photoUrl: null, teamId: "t1", teamName: "T1", teamSlug: "t1", goals: 5 }],
      favoriteResults,
      favoriteResults,
      options({ visibility: allOff }),
    );
    expect(pages).toEqual([]);
  });

  it("time da torcida só aparece com voto registrado", () => {
    const withoutVotes = buildTvPages(bracket({ groups: [], knockout: [] }), [], null, [], { ...favoriteResults, totalVotes: 0, entries: [] }, null, options());
    expect(withoutVotes.map((p) => p.kind)).not.toContain("favorite-team");

    const withVotes = buildTvPages(bracket({ groups: [], knockout: [] }), [], null, [], favoriteResults, null, options());
    expect(withVotes.map((p) => p.kind)).toContain("favorite-team");
  });

  it("favorito da final só aparece com voto registrado", () => {
    const withoutVotes = buildTvPages(bracket({ groups: [], knockout: [] }), [], null, [], null, { ...favoriteResults, totalVotes: 0, entries: [] }, options());
    expect(withoutVotes.map((p) => p.kind)).not.toContain("final-winner");

    const withVotes = buildTvPages(bracket({ groups: [], knockout: [] }), [], null, [], null, favoriteResults, options());
    expect(withVotes.map((p) => p.kind)).toContain("final-winner");
  });
});
