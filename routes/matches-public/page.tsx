import { notFound } from "next/navigation";
import { isPluginActive } from "@venore/plugin-sdk";
import { loadMatchCards, MatchCard } from "../../blocks/matches-gallery-block";

// Todos os jogos e transmissões (/erasto-league/jogos) — página fixa com a mesma grade do bloco
// erasto-league.matches-gallery, destino do "Todos os jogos" da página inicial (blocks/home). Rota
// "public": DENTRO da shell/tema do host.
export default async function MatchesPage() {
  if (!(await isPluginActive("erasto-league"))) {
    notFound();
  }

  const { matches, context } = await loadMatchCards();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Erasto League</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">Jogos e transmissões</h1>
        {matches.length > 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            {matches.length} jogo{matches.length === 1 ? "" : "s"} — toque num jogo pra ver o vídeo e a súmula.
          </p>
        )}
      </div>

      {matches.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum jogo salvo ainda.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} context={context} />
          ))}
        </div>
      )}
    </div>
  );
}
