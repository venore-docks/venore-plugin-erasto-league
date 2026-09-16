"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ScheduleEntry } from "../runtime/bracket";
import { FIXTURE_PHASE_LABEL } from "../shared/fixture-phase";
import { formatScore } from "../shared/score";

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
      <div className="mb-2 flex items-center gap-2">
        {entry.roundLabel && (
          <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-primary-foreground">
            {entry.roundLabel}
          </span>
        )}
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{phaseTag(entry)}</span>
      </div>
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
        </div>

        <TeamCell name={entry.awayName} crestUrl={entry.awayCrestUrl} slug={entry.awaySlug} align="right" />
      </div>
    </div>
  );
}

type RoundGroup = { key: string; label: string; entries: ScheduleEntry[] };

// Agrupa por rodada (não por dia) — dentro de cada aba os confrontos continuam em ordem
// cronológica (a ordem de `entries` já vem assim de getScheduleView). Confronto sem rodada
// (eliminatória sem round label, por ex.) cai numa aba própria pela fase. Abas ordenadas pela
// data mais cedo de cada grupo, pra "1ª Rodada" vir antes de "2ª Rodada" mesmo com jogos de grupos
// diferentes intercalados por data.
function groupByRound(entries: ScheduleEntry[]): RoundGroup[] {
  const byKey = new Map<string, RoundGroup>();
  for (const entry of entries) {
    const key = entry.roundLabel ?? phaseTag(entry);
    const group = byKey.get(key);
    if (group) {
      group.entries.push(entry);
    } else {
      byKey.set(key, { key, label: key, entries: [entry] });
    }
  }

  return [...byKey.values()].sort((a, b) => {
    const earliestA = Math.min(...a.entries.map((entry) => entry.scheduledAt ?? Infinity));
    const earliestB = Math.min(...b.entries.map((entry) => entry.scheduledAt ?? Infinity));
    return earliestA - earliestB;
  });
}

// Pedido explícito: manter o card de confronto "cheio" (o formato anterior, que já estava bom),
// só trocar como o VOLUME de jogos é apresentado — abas por rodada em vez de uma lista/grade com
// tudo de uma vez.
export function ScheduleTabs({ entries }: { entries: ScheduleEntry[] }) {
  const groups = useMemo(() => groupByRound(entries), [entries]);
  const [activeKey, setActiveKey] = useState(groups[0]?.key);
  const active = groups.find((group) => group.key === activeKey) ?? groups[0];

  if (!active) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {groups.map((group) => (
          <button
            key={group.key}
            type="button"
            onClick={() => setActiveKey(group.key)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
              group.key === active.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
            }`}
          >
            {group.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {active.entries.map((entry) => (
          <ScheduleRow key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}
