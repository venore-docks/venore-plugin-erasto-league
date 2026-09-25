import { Badge, Button } from "@venore/plugin-sdk/ui";
import type { VoteAudit } from "../../../runtime/fan-votes";
import { restoreVoteGroupAction, voidVoteGroupAction } from "./actions";

function formatTime(epochMs: number): string {
  return new Date(epochMs).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

const LEVEL_BADGE = {
  suspect: { label: "Suspeito", variant: "destructive" as const },
  watch: { label: "Atenção", variant: "outline" as const },
  none: { label: "Normal", variant: "secondary" as const },
};

// Auditoria da votação (súmula = Jogador da Torcida de UM jogo; /admin/erasto-league/votes = Time
// favorito). Agrupa por IP (hash — o IP nunca é gravado em claro, runtime/voter.ts) e deixa o admin
// decidir: nada é anulado automaticamente (pedido explícito). "Manter 1 por navegador" é o caso
// típico de quem votou várias vezes limpando cookie/aba anônima no MESMO aparelho; "Anular todos"
// pra quando o grupo inteiro é armação. Tudo reversível ("Restaurar").
export function VoteAuditGroups({ audit, scope, matchId }: { audit: VoteAudit; scope: "match" | "favorite"; matchId?: string }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {audit.totalVotes} voto{audit.totalVotes === 1 ? "" : "s"} registrado{audit.totalVotes === 1 ? "" : "s"}
        {audit.voidedVotes > 0 ? ` · ${audit.voidedVotes} anulado${audit.voidedVotes === 1 ? "" : "s"}` : ""}. Abaixo, IPs com 3 votos
        ou mais. Mesmo IP com navegadores diferentes costuma ser rede da escola, 4G da operadora ou família; muitos votos do mesmo
        IP <strong>e</strong> do mesmo navegador é quem limpou o cookie pra votar de novo.
      </p>

      {audit.groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum IP com 3 votos ou mais — nada pra revisar.</p>
      ) : (
        <ul className="space-y-2">
          {audit.groups.map((group) => {
            const badge = LEVEL_BADGE[group.level];
            const topName = audit.choiceNames[group.topChoiceId] ?? "—";
            return (
              <li key={group.ipHash} className="space-y-2 rounded-panel border border-border bg-card p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">IP #{group.ipHash.slice(0, 8)}</code>
                  <span className="text-sm font-semibold text-foreground">
                    {group.totalVotes} votos
                    {group.voidedVotes > 0 && <span className="font-normal text-muted-foreground"> ({group.voidedVotes} anulados)</span>}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    · {group.browsers} navegador{group.browsers === 1 ? "" : "es"} · {group.topChoiceVotes} em {topName} ·{" "}
                    {formatTime(group.firstAt)} → {formatTime(group.lastAt)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.activeVotes > 0 && (
                    <>
                      <form action={voidVoteGroupAction}>
                        <input type="hidden" name="scope" value={scope} />
                        {matchId && <input type="hidden" name="matchId" value={matchId} />}
                        <input type="hidden" name="ipHash" value={group.ipHash} />
                        <input type="hidden" name="mode" value="keep-one-per-browser" />
                        <Button type="submit" size="sm" variant="outline">
                          Manter 1 por navegador
                        </Button>
                      </form>
                      <form action={voidVoteGroupAction}>
                        <input type="hidden" name="scope" value={scope} />
                        {matchId && <input type="hidden" name="matchId" value={matchId} />}
                        <input type="hidden" name="ipHash" value={group.ipHash} />
                        <input type="hidden" name="mode" value="all" />
                        <Button type="submit" size="sm" variant="ghost" className="text-destructive">
                          Anular todos
                        </Button>
                      </form>
                    </>
                  )}
                  {group.voidedVotes > 0 && (
                    <form action={restoreVoteGroupAction}>
                      <input type="hidden" name="scope" value={scope} />
                      {matchId && <input type="hidden" name="matchId" value={matchId} />}
                      <input type="hidden" name="ipHash" value={group.ipHash} />
                      <Button type="submit" size="sm" variant="ghost">
                        Restaurar anulados
                      </Button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
