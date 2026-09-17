"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ScheduleEntry } from "../runtime/bracket";
import { FIXTURE_PHASE_LABEL } from "../shared/fixture-phase";
import { fixtureDateTimeToEpoch } from "../shared/timezone";
import { formatScore } from "../shared/score";

// scheduledDate/scheduledTime já chegam como texto puro ("YYYY-MM-DD"/"HH:mm") — nenhuma
// conversão de fuso é necessária pra exibir (só pra ORDENAR, ver fixtureDateTimeToEpoch abaixo).
function formatDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const label = new Date(year, month - 1, day).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
  return label.charAt(0).toUpperCase() + label.slice(1);
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
    <Link href={`/erasto-league/teams/${slug}`} className="flex min-w-0 flex-1 hover:opacity-80">
      {content}
    </Link>
  ) : (
    content
  );
}

// Pedido explícito: data e hora (não só a hora) evidentes no CENTRO do card — a rodada, que antes
// era uma badge colorida chamando mais atenção que a própria data, vira texto neutro junto da fase.
function ScheduleRow({ entry }: { entry: ScheduleEntry }) {
  const dateLabel = entry.scheduledDate ? formatDate(entry.scheduledDate) : "Data a definir";

  return (
    <div className="rounded-panel border border-border bg-card px-4 py-3 shadow-sm transition hover:border-primary/40">
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        <span>{phaseTag(entry)}</span>
        {entry.roundLabel && (
          <>
            <span aria-hidden="true">·</span>
            <span>{entry.roundLabel}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-3">
        <TeamCell name={entry.homeName} crestUrl={entry.homeCrestUrl} slug={entry.homeSlug} align="left" />

        <div className="flex shrink-0 flex-col items-center gap-1 px-1">
          {entry.played ? (
            <>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-sm font-bold tabular-nums text-primary">
                {formatScore(entry.homeScore ?? 0)}-{formatScore(entry.awayScore ?? 0)}
              </span>
              <span className="text-center text-[10px] font-medium text-muted-foreground">
                {dateLabel}
                {entry.scheduledTime ? ` · ${entry.scheduledTime}` : ""}
              </span>
            </>
          ) : (
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-sm font-extrabold text-foreground">{dateLabel}</span>
              <span className="text-sm font-bold tabular-nums text-primary">{entry.scheduledTime ?? "Hora a definir"}</span>
            </div>
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

  const earliestEpoch = (group: RoundGroup) =>
    Math.min(...group.entries.map((entry) => fixtureDateTimeToEpoch(entry.scheduledDate, entry.scheduledTime) ?? Infinity));

  return [...byKey.values()].sort((a, b) => earliestEpoch(a) - earliestEpoch(b));
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
