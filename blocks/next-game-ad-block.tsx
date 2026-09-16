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
  return (
    <div className={`flex flex-1 flex-col items-center justify-center gap-3 px-4 py-6 ${align === "left" ? "text-right" : "text-left"}`}>
      {crestUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={crestUrl} alt="" className="size-20 shrink-0 rounded-full border-4 border-white/20 object-cover shadow-2xl sm:size-28" />
      ) : (
        <div
          className="flex size-20 shrink-0 items-center justify-center rounded-full border-4 border-white/20 text-2xl font-black text-white shadow-2xl sm:size-28"
          style={{ background: color ?? "#334155" }}
        >
          {name.slice(0, 2).toUpperCase()}
        </div>
      )}
      <span className="max-w-full truncate text-center text-lg font-black uppercase tracking-wide text-white drop-shadow sm:text-2xl">{name}</span>
    </div>
  );
}

// "Ad" 16:9 do próximo jogo — pensado pra chamar atenção (página inicial e view de TV), não pra
// ler detalhe: fundo split com a cor de cada time, crista grande, "VS" no meio, rodada e
// data/hora em destaque. Sempre recalculado na hora de renderizar (runtime/bracket.ts).
export async function ErastoLeagueNextGameAdBlock({ block }: BlockRendererProps) {
  const title = readString(block.data, "title", "Próximo jogo");
  const next = await getNextFixture();

  if (!next) {
    return <p className="text-sm text-muted-foreground">Nenhum próximo jogo agendado.</p>;
  }

  const when = formatDateTime(next.scheduledAt);
  const homeColor = next.homeColor ?? "#0f172a";
  const awayColor = next.awayColor ?? "#020617";

  return (
    <div
      className="relative aspect-video w-full overflow-hidden rounded-panel shadow-xl"
      style={{ background: `linear-gradient(115deg, ${homeColor} 0%, ${homeColor} 42%, #04070d 50%, ${awayColor} 58%, ${awayColor} 100%)` }}
    >
      <div className="absolute inset-0 bg-black/25" />

      <div className="relative flex h-full flex-col">
        <div className="flex items-center justify-center gap-2 pt-4 sm:pt-6">
          {title && (
            <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-white backdrop-blur-sm sm:text-xs">
              {title}
            </span>
          )}
          {next.roundLabel && (
            <span className="rounded-full bg-white px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-black sm:text-xs">
              {next.roundLabel}
            </span>
          )}
        </div>

        <div className="flex flex-1 items-center">
          <TeamSide name={next.homeName} crestUrl={next.homeCrestUrl} color={next.homeColor} align="left" />
          <span className="shrink-0 px-1 text-2xl font-black italic text-white/70 sm:text-4xl">VS</span>
          <TeamSide name={next.awayName} crestUrl={next.awayCrestUrl} color={next.awayColor} align="right" />
        </div>

        <div className="flex items-center justify-center gap-3 pb-4 sm:pb-6">
          {when ? (
            <span className="rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold text-white backdrop-blur-sm sm:text-sm">
              {when.date} · {when.time}
            </span>
          ) : (
            <span className="rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold text-white backdrop-blur-sm sm:text-sm">Data a definir</span>
          )}
        </div>
      </div>
    </div>
  );
}
