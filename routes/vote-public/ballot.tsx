"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Button } from "@venore/plugin-sdk/ui";
import { castFavoriteTeamVoteAction, castMatchVoteAction, requestVoteTicketAction, type VoteActionState } from "./actions";
import { TurnstileWidget } from "./turnstile-widget";

export type BallotOption = {
  id: string;
  name: string;
  imageUrl: string | null;
  // Linha menor abaixo do nome ("#10 · Capitão", "Bananáticos FC"…).
  caption: string | null;
  color: string | null;
};

export type BallotSection = { key: string; title: string; color: string | null; options: BallotOption[] };

const INITIAL_STATE: VoteActionState = {
  status: "idle",
  message: null,
  choiceId: null,
  attempt: 0,
  turnstileResets: 0,
  retryAfterSeconds: null,
};

// Quanto esperar o Turnstile terminar a verificação depois que a espera do voto acabou.
const TOKEN_TIMEOUT_MS = 60_000;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type Phase = "idle" | "ticket" | "waiting" | "submitting";

// Barra da espera do voto (o "custo" — routes/vote-public/actions.ts). Só exibe: quem conta de
// verdade é o servidor.
function VoteWaitProgress({ startedAt, endsAt }: { startedAt: number; endsAt: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  const total = Math.max(1, endsAt - startedAt);
  const done = Math.min(1, Math.max(0, (now - startedAt) / total));
  const secondsLeft = Math.max(0, Math.ceil((endsAt - now) / 1000));
  return (
    <div className="space-y-1.5" aria-live="polite">
      <p className="text-sm font-semibold text-foreground">
        Validando seu voto… {secondsLeft > 0 ? `${secondsLeft}s` : "quase lá"}
      </p>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary ui-motion-base" style={{ width: `${Math.round(done * 100)}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">Cada voto leva alguns segundos — e mais um pouco a cada voto que sai da mesma rede.</p>
    </div>
  );
}

function OptionAvatar({ option }: { option: BallotOption }) {
  if (option.imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={option.imageUrl} alt="" className="size-16 rounded-full object-cover sm:size-20" />;
  }
  // Sem foto: iniciais em token do tema, com a cor do time (dado do cadastro) só no anel.
  return (
    <span
      className="flex size-16 items-center justify-center rounded-full bg-muted text-lg font-bold text-muted-foreground sm:size-20"
      style={{ boxShadow: `inset 0 0 0 3px ${option.color ?? "var(--border)"}` }}
    >
      {option.name.slice(0, 2).toUpperCase()}
    </span>
  );
}

// Cédula da votação da torcida — escolhe (toque) e confirma (botão), em dois passos de propósito:
// um toque só registraria voto errado com o dedo escorregando na lista no celular. kind decide
// qual Server Action roda (jogador da partida ou time favorito); o resto é igual.
export function Ballot({
  kind,
  hiddenFields,
  sections,
  currentChoiceId,
  allowChange,
  turnstileSiteKey,
}: {
  kind: "match" | "favorite";
  hiddenFields: Record<string, string>;
  sections: BallotSection[];
  // Escolha já registrada deste aparelho (lida do cookie no servidor).
  currentChoiceId: string | null;
  // Time favorito: pode trocar o voto; Jogador da Torcida: voto único.
  allowChange: boolean;
  turnstileSiteKey: string | null;
}) {
  const action = kind === "match" ? castMatchVoteAction : castFavoriteTeamVoteAction;
  const [state, setState] = useState<VoteActionState>(INITIAL_STATE);
  const stateRef = useRef<VoteActionState>(INITIAL_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [wait, setWait] = useState<{ startedAt: number; endsAt: number } | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Número da tentativa (state.attempt) em que a pessoa pediu "Trocar voto" — a cédula reaparece
  // até a próxima resposta de sucesso (erro mantém a cédula aberta pra tentar de novo).
  const [changeRequestedAt, setChangeRequestedAt] = useState<number | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);
  const busy = phase !== "idle";

  const allOptions = sections.flatMap((section) => section.options);
  const nameOf = (id: string | null) => allOptions.find((option) => option.id === id)?.name ?? null;

  // A escolha "oficial" deste aparelho: a que o servidor acabou de devolver (voto novo, ou "já votou
  // em X") tem prioridade sobre a lida no render da página.
  const confirmedChoiceId = state.choiceId ?? currentChoiceId;
  // "wait" e o voto em andamento (busy) mantêm a cédula aberta — senão ela sumiria no meio da espera.
  const changing =
    allowChange &&
    changeRequestedAt !== null &&
    (state.attempt === changeRequestedAt || state.status === "error" || state.status === "wait" || busy);
  const showBallot = confirmedChoiceId === null || changing;
  const fieldName = kind === "match" ? "playerId" : "teamId";
  const selectedName = nameOf(selectedId);
  const needsToken = Boolean(turnstileSiteKey);

  async function waitForToken(): Promise<string | null> {
    if (!needsToken) return null;
    const deadline = Date.now() + TOKEN_TIMEOUT_MS;
    while (!tokenRef.current && Date.now() < deadline) await sleep(200);
    return tokenRef.current;
  }

  // Toque em "Votar": pede o ticket, espera (barra de progresso), e só então envia o voto com o
  // ticket + token do Turnstile. Resposta "wait" (a espera cresceu porque outra aba da mesma rede
  // votou no meio) espera de novo e reenvia com o mesmo ticket.
  async function vote() {
    const form = formRef.current;
    if (!form || !selectedId || busy) return;
    setLocalError(null);
    setPhase("ticket");
    try {
      const issued = await requestVoteTicketAction({ kind, matchId: hiddenFields.matchId });
      if (!issued.ok) {
        setLocalError(issued.message);
        return;
      }
      let waitMs = issued.waitSeconds * 1000;
      for (;;) {
        const startedAt = Date.now();
        setWait({ startedAt, endsAt: startedAt + waitMs });
        setPhase("waiting");
        await sleep(waitMs);
        const turnstileToken = await waitForToken();
        if (needsToken && !turnstileToken) {
          setLocalError("A verificação anti-robô não terminou — tente de novo.");
          return;
        }

        setPhase("submitting");
        const formData = new FormData(form);
        formData.set("voteTicket", issued.ticket);
        if (turnstileToken) formData.set("cf-turnstile-response", turnstileToken);
        const next = await action(stateRef.current, formData);
        // Token gasto no servidor: descarta já (o widget reseta no próximo render e traz outro).
        if (next.turnstileResets !== stateRef.current.turnstileResets) tokenRef.current = null;
        stateRef.current = next;
        setState(next);
        if (next.status === "wait" && next.retryAfterSeconds) {
          waitMs = next.retryAfterSeconds * 1000;
          continue;
        }
        return;
      }
    } catch {
      setLocalError("Não deu pra registrar o voto agora — confira a internet e tente de novo.");
    } finally {
      setPhase("idle");
      setWait(null);
    }
  }

  if (!showBallot) {
    return (
      <div className="space-y-3">
        <div className="rounded-panel border border-primary bg-primary/10 p-4">
          {state.status === "success" && state.message && <p className="text-sm font-bold text-foreground">✅ {state.message}</p>}
          {state.status === "error" && state.message && <p className="text-sm font-semibold text-muted-foreground">{state.message}</p>}
          <p className="text-sm text-foreground">
            {kind === "match" ? "Seu voto neste jogo: " : "Seu time favorito: "}
            <span className="font-bold">{nameOf(confirmedChoiceId) ?? "—"}</span>
          </p>
          {kind === "match" && <p className="mt-1 text-xs text-muted-foreground">Cada aparelho vota uma vez por jogo.</p>}
        </div>
        {allowChange && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setChangeRequestedAt(state.attempt);
              setSelectedId(null);
            }}
          >
            Trocar voto
          </Button>
        )}
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={(event) => {
        event.preventDefault();
        void vote();
      }}
      className="space-y-5"
    >
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <input type="hidden" name={fieldName} value={selectedId ?? ""} />

      {sections.map((section) => (
        <fieldset key={section.key} className="space-y-2">
          <legend className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            {section.color && <span className="size-2.5 rounded-full" style={{ background: section.color }} />}
            {section.title}
          </legend>
          {section.options.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum jogador cadastrado neste time.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {section.options.map((option) => {
                const selected = option.id === selectedId;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={selected}
                    disabled={busy}
                    onClick={() => setSelectedId(option.id)}
                    className={`flex flex-col items-center gap-2 rounded-panel border bg-card p-3 text-center ui-motion-base ${
                      selected ? "border-primary ring-2 ring-primary" : "border-border hover:bg-muted/40"
                    }`}
                    style={selected ? ({ background: "color-mix(in srgb, var(--primary) 10%, var(--card))" } as CSSProperties) : undefined}
                  >
                    <OptionAvatar option={option} />
                    <span className="w-full truncate text-sm font-bold text-foreground">{option.name}</span>
                    {option.caption && <span className="w-full truncate text-xs text-muted-foreground">{option.caption}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </fieldset>
      ))}

      <div className="sticky bottom-0 z-10 -mx-4 space-y-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-panel sm:border">
        {!busy && (localError ?? (state.status === "error" ? state.message : null)) && (
          <p className="text-sm font-semibold text-destructive">{localError ?? state.message}</p>
        )}
        {phase === "waiting" && wait && <VoteWaitProgress key={wait.startedAt} startedAt={wait.startedAt} endsAt={wait.endsAt} />}
        {/* Fica montado durante a espera: a verificação roda em paralelo e o token está pronto quando a
            barra termina. Reset só quando o servidor gastou o token (turnstileResets). */}
        {turnstileSiteKey && <TurnstileWidget siteKey={turnstileSiteKey} onToken={setToken} resetSignal={state.turnstileResets} />}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={!selectedId || busy}>
            {phase === "ticket"
              ? "Preparando…"
              : phase === "waiting"
                ? "Validando…"
                : phase === "submitting"
                  ? "Registrando…"
                  : selectedName
                    ? `Votar em ${selectedName}`
                    : kind === "match"
                      ? "Escolha um jogador"
                      : "Escolha um time"}
          </Button>
          {allowChange && changing && (
            <Button type="button" variant="ghost" disabled={busy} onClick={() => setChangeRequestedAt(null)}>
              Manter meu voto
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
