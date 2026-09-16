import type { BlockRendererProps } from "@venore/plugin-sdk";
import { getNextFixture } from "../runtime/bracket";

function readString(data: Record<string, unknown>, key: string, fallback = ""): string {
  const value = data[key];
  return typeof value === "string" ? value : fallback;
}

function formatDateTime(epochMs: number | null): { date: string; time: string } | null {
  if (!epochMs) return null;
  const d = new Date(epochMs);
  return {
    date: d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "long", timeZone: "America/Sao_Paulo" }),
    time: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }),
  };
}

function TeamSide({ name, crestUrl, color, align }: { name: string; crestUrl: string | null; color: string | null; align: "left" | "right" }) {
  const teamColor = color ?? "var(--muted-foreground)";
  return (
    <div className={`flex flex-1 flex-col items-center justify-center gap-3 px-4 py-6 ${align === "left" ? "text-right" : "text-left"}`}>
      {crestUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={crestUrl}
          alt=""
          className="size-20 shrink-0 rounded-full border-4 object-cover shadow-xl sm:size-28"
          style={{ borderColor: teamColor }}
        />
      ) : (
        <div
          className="flex size-20 shrink-0 items-center justify-center rounded-full border-4 bg-muted text-2xl font-black text-foreground shadow-xl sm:size-28"
          style={{ borderColor: teamColor }}
        >
          {name.slice(0, 2).toUpperCase()}
        </div>
      )}
      <div className="flex flex-col items-center gap-1.5">
        <span className="max-w-full truncate text-center text-lg font-black uppercase tracking-wide text-foreground sm:text-2xl">{name}</span>
        <span className="h-1 w-10 rounded-full" style={{ background: teamColor }} />
      </div>
    </div>
  );
}

// "Ad" 16:9 do próximo jogo — pensado pra chamar atenção (página inicial e view de TV), não pra
// ler detalhe: crista grande, "VS" no meio, rodada e data/hora em destaque. Fundo nas cores do
// TEMA (não dos times — a cor de cada time fica só no anel da crista/traço sob o nome), pra não
// entrar em conflito com a identidade visual do site. Sempre recalculado na hora de renderizar
// (runtime/bracket.ts).
export async function ErastoLeagueNextGameAdBlock({ block }: BlockRendererProps) {
  const title = readString(block.data, "title", "Próximo jogo");
  const next = await getNextFixture();

  if (!next) {
    return <p className="text-sm text-muted-foreground">Nenhum próximo jogo agendado.</p>;
  }

  const when = formatDateTime(next.scheduledAt);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-panel border-t-4 border-primary bg-gradient-to-br from-card via-card to-muted shadow-xl">
      <div className="relative flex h-full flex-col">
        <div className="flex items-center justify-center gap-2 pt-4 sm:pt-6">
          {title && (
            <span className="rounded-full bg-muted px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground sm:text-xs">
              {title}
            </span>
          )}
          {next.roundLabel && (
            <span className="rounded-full bg-primary px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-primary-foreground sm:text-xs">
              {next.roundLabel}
            </span>
          )}
        </div>

        <div className="flex flex-1 items-center">
          <TeamSide name={next.homeName} crestUrl={next.homeCrestUrl} color={next.homeColor} align="left" />
          <span className="shrink-0 px-1 text-2xl font-black italic text-muted-foreground sm:text-4xl">VS</span>
          <TeamSide name={next.awayName} crestUrl={next.awayCrestUrl} color={next.awayColor} align="right" />
        </div>

        <div className="flex items-center justify-center gap-3 pb-4 sm:pb-6">
          <span className="rounded-full bg-muted px-4 py-1.5 text-xs font-bold text-foreground sm:text-sm">
            {when ? `${when.date} · ${when.time}` : "Data a definir"}
          </span>
        </div>
      </div>
    </div>
  );
}
