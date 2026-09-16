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

function TeamCell({ name, crestUrl, slug, align }: { name: string; crestUrl: string | null; slug: string | null; align: "left" | "right" }) {
  const content = (
    <div className={`flex min-w-0 flex-1 items-center gap-2.5 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      {crestUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={crestUrl} alt="" className="size-8 shrink-0 rounded-full border border-border/60 object-cover shadow-sm" />
      ) : (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
          {name.slice(0, 2).toUpperCase()}
        </span>
      )}
      <span className="truncate text-sm font-semibold text-foreground">{name}</span>
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

function ScheduleRow({ entry }: { entry: ScheduleEntry }) {
  return (
    <div className="rounded-panel border border-border bg-card px-4 py-3 shadow-sm transition hover:border-primary/40">
      {entry.roundLabel && (
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-primary-foreground">
            {entry.roundLabel}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{phaseTag(entry)}</span>
        </div>
      )}
      <div className="flex items-center gap-3">
        <TeamCell name={entry.homeName} crestUrl={entry.homeCrestUrl} slug={entry.homeSlug} align="left" />

        <div className="flex shrink-0 flex-col items-center gap-0.5 px-1">
          {entry.played ? (
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-sm font-bold tabular-nums text-primary">
              {formatScore(entry.homeScore ?? 0)}-{formatScore(entry.awayScore ?? 0)}
            </span>
          ) : (
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
              {entry.scheduledAt ? formatTime(entry.scheduledAt) : "vs"}
            </span>
          )}
          {!entry.roundLabel && (
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{phaseTag(entry)}</span>
          )}
        </div>

        <TeamCell name={entry.awayName} crestUrl={entry.awayCrestUrl} slug={entry.awaySlug} align="right" />
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

      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.key} className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{group.heading}</h3>
            <div className="space-y-2">
              {group.entries.map((entry) => (
                <ScheduleRow key={entry.id} entry={entry} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
