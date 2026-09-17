import type { BlockRendererProps } from "@venore/plugin-sdk";
import { getNextFixture } from "../runtime/bracket";

function readString(data: Record<string, unknown>, key: string, fallback = ""): string {
  const value = data[key];
  return typeof value === "string" ? value : fallback;
}

// scheduledDate/scheduledTime já chegam como texto puro — só formata pra exibição, nenhuma
// conversão de fuso (ver shared/timezone.ts).
function formatDateLabel(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "long" });
}

function TeamSide({ name, crestUrl, color, align }: { name: string; crestUrl: string | null; color: string | null; align: "left" | "right" }) {
  const teamColor = color ?? "var(--muted-foreground)";
  return (
    <div
      className={`flex flex-1 flex-col items-center justify-center gap-1.5 px-2 py-2 @sm:gap-2 @sm:px-3 @sm:py-4 @lg:gap-3 @lg:px-4 @lg:py-6 ${align === "left" ? "text-right" : "text-left"}`}
    >
      {crestUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={crestUrl}
          alt=""
          className="size-10 shrink-0 rounded-full border-2 object-cover shadow-xl @sm:size-14 @sm:border-[3px] @md:size-20 @lg:size-24 @lg:border-4 @xl:size-28"
          style={{ borderColor: teamColor }}
        />
      ) : (
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 bg-muted text-xs font-black text-foreground shadow-xl @sm:size-14 @sm:border-[3px] @sm:text-base @md:size-20 @md:text-xl @lg:size-24 @lg:border-4 @lg:text-2xl @xl:size-28"
          style={{ borderColor: teamColor }}
        >
          {name.slice(0, 2).toUpperCase()}
        </div>
      )}
      <div className="flex flex-col items-center gap-1 @lg:gap-1.5">
        <span className="max-w-full truncate text-center text-[10px] font-black uppercase tracking-wide text-foreground @sm:text-sm @md:text-lg @lg:text-2xl">
          {name}
        </span>
        <span className="h-0.5 w-6 rounded-full @sm:h-1 @sm:w-10" style={{ background: teamColor }} />
      </div>
    </div>
  );
}

// "Ad" 16:9 do próximo jogo — pensado pra chamar atenção (página inicial e view de TV), não pra
// ler detalhe: crista grande, "VS" no meio, rodada e data/hora em destaque. Fundo nas cores do
// TEMA (não dos times — a cor de cada time fica só no anel da crista/traço sob o nome), pra não
// entrar em conflito com a identidade visual do site. Sempre recalculado na hora de renderizar
// (runtime/bracket.ts).
//
// Responsivo por CONTAINER, não por viewport: este bloco pode aparecer tanto ocupando a largura
// inteira da página quanto espremido numa coluna estreita (ex: dentro de uma "Linha" 2 colunas do
// construtor) — nesse caso o viewport continua desktop, então breakpoints `sm:`/`md:` de sempre
// ativariam do mesmo jeito e o conteúdo ficaria grande demais pro espaço real. `@container` +
// variantes `@sm:`/`@md:`/... (Tailwind v4, nativo) medem a largura REAL deste card, não a da
// janela.
export async function ErastoLeagueNextGameAdBlock({ block }: BlockRendererProps) {
  const title = readString(block.data, "title", "Próximo jogo");
  const next = await getNextFixture();

  if (!next) {
    return <p className="text-sm text-muted-foreground">Nenhum próximo jogo agendado.</p>;
  }

  const dateLabel = next.scheduledDate ? formatDateLabel(next.scheduledDate) : null;

  return (
    <div className="@container relative aspect-video w-full overflow-hidden rounded-panel border-t-4 border-primary bg-gradient-to-br from-card via-card to-muted shadow-xl">
      <div className="relative flex h-full flex-col">
        <div className="flex items-center justify-center gap-1.5 pt-1.5 @sm:gap-2 @sm:pt-3 @lg:pt-6">
          {title && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[7px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground @sm:px-2.5 @sm:py-1 @sm:text-[9px] @sm:tracking-[0.2em] @lg:px-3 @lg:text-xs">
              {title}
            </span>
          )}
          {next.roundLabel && (
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[7px] font-extrabold uppercase tracking-wide text-primary-foreground @sm:px-2.5 @sm:py-1 @sm:text-[9px] @lg:px-3 @lg:text-xs">
              {next.roundLabel}
            </span>
          )}
        </div>

        <div className="flex flex-1 items-center">
          <TeamSide name={next.homeName} crestUrl={next.homeCrestUrl} color={next.homeColor} align="left" />
          <span className="shrink-0 px-0.5 text-sm font-black italic text-muted-foreground @sm:px-1 @sm:text-xl @md:text-2xl @lg:text-4xl">
            VS
          </span>
          <TeamSide name={next.awayName} crestUrl={next.awayCrestUrl} color={next.awayColor} align="right" />
        </div>

        <div className="flex items-center justify-center gap-3 pb-1.5 @sm:pb-3 @lg:pb-6">
          <span className="rounded-full bg-muted px-2 py-0.5 text-[8px] font-bold text-foreground @sm:px-4 @sm:py-1.5 @sm:text-xs @lg:text-sm">
            {dateLabel ? `${dateLabel}${next.scheduledTime ? ` · ${next.scheduledTime}` : ""}` : "Data a definir"}
          </span>
        </div>
      </div>
    </div>
  );
}
