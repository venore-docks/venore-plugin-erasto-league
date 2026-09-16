import Link from "next/link";
import type { BlockRendererProps } from "@venore/plugin-sdk";
import { getScheduleView, type ScheduleEntry } from "../runtime/bracket";
import { FIXTURE_PHASE_LABEL } from "../shared/fixture-phase";
import { formatScore } from "../shared/score";

function readString(data: Record<string, unknown>, key: string, fallback = ""): string {
  const value = data[key];
  return typeof value === "string" ? value : fallback;
}

function readNumber(data: Record<string, unknown>, key: string, fallback: number): number {
  const value = Number(data[key]);
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : fallback;
}

function dayKey(epochMs: number): string {
  return new Date(epochMs).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function formatDayHeading(epochMs: number): string {
  const label = new Date(epochMs).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "long",
    timeZone: "America/Sao_Paulo",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatTime(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
}

function phaseTag(entry: ScheduleEntry): string {
  if (entry.phase === "group" && entry.groupName) return `Grupo ${entry.groupName}`;
  return FIXTURE_PHASE_LABEL[entry.phase];
}

function TeamChip({ name, crestUrl, slug, align }: { name: string; crestUrl: string | null; slug: string | null; align: "left" | "right" }) {
  const content = (
    <div className={`flex min-w-0 flex-1 items-center gap-1.5 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      {crestUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={crestUrl} alt="" className="size-6 shrink-0 rounded-full border border-border/60 object-cover" />
      ) : (
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[8px] font-bold text-muted-foreground">
          {name.slice(0, 2).toUpperCase()}
        </span>
      )}
      <span className="truncate text-xs font-semibold text-foreground">{name}</span>
    </div>
  );

  return slug ? (
    <Link href={`/ext/erasto-league/teams/${slug}`} className="flex min-w-0 flex-1 hover:opacity-80">
      {content}
    </Link>
  ) : (
    content
  );
}

// Linha compacta de UM confronto, pensada pra caber dentro do card do dia (DayCard) sem esticar a
// altura — brasão pequeno, times numa linha só, placar/horário no meio. A rodada vira um selinho
// inline em vez de uma faixa própria (era o que deixava o widget "um listão").
function CompactMatchRow({ entry }: { entry: ScheduleEntry }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        {entry.roundLabel && (
          <span className="shrink-0 rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
            {entry.roundLabel}
          </span>
        )}
        <span className="truncate text-[9px] font-medium uppercase tracking-wide text-muted-foreground">{phaseTag(entry)}</span>
      </div>
      <div className="flex items-center gap-2">
        <TeamChip name={entry.homeName} crestUrl={entry.homeCrestUrl} slug={entry.homeSlug} align="left" />
        {entry.played ? (
          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold tabular-nums text-primary">
            {formatScore(entry.homeScore ?? 0)}-{formatScore(entry.awayScore ?? 0)}
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {entry.scheduledAt ? formatTime(entry.scheduledAt) : "vs"}
          </span>
        )}
        <TeamChip name={entry.awayName} crestUrl={entry.awayCrestUrl} slug={entry.awaySlug} align="right" />
      </div>
    </div>
  );
}

// Agenda de jogos — lista cronológica de TODOS os confrontos (grupos + eliminatórias), com brasão
// de cada time. Complementa o bloco de fases (que não mostra mais datas, ver bracket-block.tsx) e
// os últimos resultados (que só mostra o que já terminou) — este cobre passado e futuro juntos.
export async function ErastoLeagueScheduleBlock({ block }: BlockRendererProps) {
  const title = readString(block.data, "title", "Agenda de jogos");
  const limit = readNumber(block.data, "limit", 0);
  const entries = await getScheduleView(limit > 0 ? limit : undefined);

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Tabela de jogos ainda não importada.</p>;
  }

  const groups: { key: string; heading: string; entries: ScheduleEntry[] }[] = [];
  for (const entry of entries) {
    const key = entry.scheduledAt ? dayKey(entry.scheduledAt) : "tbd";
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.entries.push(entry);
    } else {
      groups.push({ key, heading: entry.scheduledAt ? formatDayHeading(entry.scheduledAt) : "Data a definir", entries: [entry] });
    }
  }

  return (
    <div className="space-y-6">
      {title && <h2 className="text-2xl font-semibold text-foreground">{title}</h2>}

      {/* Grade de "cards de dia" (2-3 colunas) em vez de uma lista única empilhada — ainda
          ordenado/agrupado por data, só que organizado em blocos curtos em vez de um listão. */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => (
          <div key={group.key} className="space-y-3 rounded-panel border border-border bg-card p-4 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{group.heading}</h3>
            <div className="space-y-3 divide-y divide-border/60">
              {group.entries.map((entry, index) => (
                <div key={entry.id} className={index > 0 ? "pt-3" : undefined}>
                  <CompactMatchRow entry={entry} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
