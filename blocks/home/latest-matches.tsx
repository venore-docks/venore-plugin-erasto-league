import { loadMatchCards, MatchCard } from "../matches-gallery-block";

// Últimos jogos da página inicial — os mesmos cards da galeria (miniatura do vídeo + placar),
// substituindo "Últimos resultados" + "Transmissão" separados. No celular (e em coluna estreita)
// vira uma fileira que desliza pro lado; com espaço, grade de 3 — medido pelo CONTAINER, não pela
// janela, porque aqui ele pode estar na coluna principal ou ocupando a largura inteira.
export async function HomeLatestMatches() {
  const { matches, context } = await loadMatchCards({ limit: 3 });
  if (matches.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum jogo salvo ainda.</p>;
  }

  return (
    <div className="@container">
      <div className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2 @2xl:grid @2xl:grid-cols-3 @2xl:overflow-visible @2xl:pb-0">
        {matches.map((match) => (
          <MatchCard key={match.id} match={match} context={context} className="w-[17rem] shrink-0 snap-start @2xl:w-auto" />
        ))}
      </div>
    </div>
  );
}
