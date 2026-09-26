import Link from "next/link";
import { listTeams } from "../../runtime/teams";
import { TeamCrest } from "./team-crest";

// Times da página inicial em forma de "muro" de brasões — a grade cheia com recorde de cada time
// (bloco erasto-league.teams) ocupava um terço da página no celular.
export async function HomeTeamsWall() {
  const teams = await listTeams();
  if (teams.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum time cadastrado ainda.</p>;
  }

  return (
    <div className="grid grid-cols-4 gap-1 rounded-panel border border-border bg-card p-2 sm:grid-cols-6 xl:grid-cols-4">
      {teams.map((team) => (
        <Link
          key={team.id}
          href={`/erasto-league/teams/${team.slug}`}
          title={team.name}
          className="flex min-w-0 flex-col items-center gap-1 rounded-md p-1.5 ui-motion-base hover:bg-muted"
        >
          <TeamCrest name={team.name} crestUrl={team.crestUrl} className="size-11" />
          <span className="w-full truncate text-center text-[10px] font-semibold text-muted-foreground">{team.name}</span>
        </Link>
      ))}
    </div>
  );
}
