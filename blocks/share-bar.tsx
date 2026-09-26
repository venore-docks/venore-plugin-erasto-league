"use client";

import { useEffect, useState } from "react";
import { Button } from "@venore/plugin-sdk/ui";

type InstagramState =
  | { status: "idle" }
  | { status: "preparing" }
  | { status: "ready"; file: File; previewUrl: string; canShareFile: boolean }
  | { status: "error" };

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-4 shrink-0">
      <path
        d="M4.5 19.5l1.2-3.6A7.5 7.5 0 1 1 8.4 18.6L4.5 19.5z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-4 shrink-0">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3.8" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-4 shrink-0">
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const PILL = "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground ui-motion-base hover:bg-muted";

// Barra "Compartilhar" das páginas públicas (jogo, votação, jogador):
// - WhatsApp: link wa.me com texto + URL — o preview com a capa vem da metadata da página.
// - Instagram: não aceita link em post/legenda, então o caminho que funciona é o STORY — baixa a
//   imagem 1080×1920 gerada pelo servidor (routes/api/story) e abre o menu de compartilhar do
//   celular (Web Share API com arquivo); o link vai copiado pra colar no sticker de link. Em dois
//   passos de propósito: o menu de compartilhar só abre dentro do toque que o pediu, e gerar a
//   imagem pode levar alguns segundos (o toque "expira") — primeiro prepara, depois compartilha.
//   Sem suporte a compartilhar arquivo (computador), vira "Baixar imagem".
// - Copiar link: pra qualquer outro lugar.
export function ShareBar({ url, text, storyUrl }: { url: string; text: string; storyUrl: string }) {
  const [copied, setCopied] = useState(false);
  const [instagram, setInstagram] = useState<InstagramState>({ status: "idle" });
  const [shareError, setShareError] = useState<string | null>(null);

  const previewUrl = instagram.status === "ready" ? instagram.previewUrl : null;
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  function markCopied() {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 4000);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      markCopied();
    } catch {
      window.prompt("Copie o link:", url);
    }
  }

  async function prepareStory() {
    if (instagram.status === "preparing") return;
    setShareError(null);
    setInstagram({ status: "preparing" });
    try {
      const response = await fetch(storyUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const extension = blob.type === "image/png" ? "png" : "jpg";
      const file = new File([blob], `erasto-league-story.${extension}`, { type: blob.type || "image/jpeg" });
      const canShareFile = typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
      setInstagram({ status: "ready", file, previewUrl: URL.createObjectURL(blob), canShareFile });
    } catch {
      setInstagram({ status: "error" });
    }
  }

  function shareStory(file: File) {
    setShareError(null);
    // Link copiado ANTES de abrir o menu (vai no sticker de link do story) — as duas chamadas no
    // mesmo toque.
    navigator.clipboard
      ?.writeText(url)
      .then(markCopied)
      .catch(() => {});
    navigator.share({ files: [file] }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareError("Não deu pra abrir o compartilhamento. Baixe a imagem e poste pelo app do Instagram.");
    });
  }

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Compartilhar</span>
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={PILL}>
          <ChatIcon />
          WhatsApp
        </a>
        <button type="button" onClick={prepareStory} aria-expanded={instagram.status !== "idle"} className={PILL}>
          <CameraIcon />
          Instagram
        </button>
        <button type="button" onClick={copyLink} className={PILL} aria-live="polite">
          <LinkIcon />
          {copied ? "Link copiado!" : "Copiar link"}
        </button>
      </div>

      {instagram.status !== "idle" && (
        <div className="flex gap-4 rounded-panel border border-border bg-card p-4">
          {instagram.status === "ready" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={instagram.previewUrl} alt="Prévia do story" className="h-40 w-auto shrink-0 rounded-md border border-border" />
          ) : (
            <div className="h-40 w-[5.625rem] shrink-0 animate-pulse rounded-md bg-muted" aria-hidden="true" />
          )}

          <div className="min-w-0 flex-1 space-y-3 text-sm">
            {instagram.status === "preparing" && <p className="text-muted-foreground">Preparando a imagem do story…</p>}

            {instagram.status === "error" && (
              <div className="space-y-2">
                <p className="text-destructive">Não deu pra gerar a imagem agora.</p>
                <Button type="button" size="sm" variant="outline" onClick={prepareStory}>
                  Tentar de novo
                </Button>
              </div>
            )}

            {instagram.status === "ready" && (
              <>
                <p className="font-semibold text-foreground">Story pronto!</p>
                <div className="flex flex-wrap gap-2">
                  {instagram.canShareFile && (
                    <Button type="button" size="sm" onClick={() => shareStory(instagram.file)}>
                      Abrir no Instagram
                    </Button>
                  )}
                  <Button asChild size="sm" variant={instagram.canShareFile ? "outline" : "default"}>
                    <a href={instagram.previewUrl} download={instagram.file.name}>
                      Baixar imagem
                    </a>
                  </Button>
                </div>
                <ol className="list-decimal space-y-1 pl-4 text-muted-foreground">
                  {instagram.canShareFile ? (
                    <li>Toque em &ldquo;Abrir no Instagram&rdquo; e escolha Stories.</li>
                  ) : (
                    <li>Baixe a imagem e poste no story pelo app do Instagram no celular.</li>
                  )}
                  <li>
                    No story, adicione o sticker de link e cole o endereço
                    {copied ? " (já copiado)" : ""}.{" "}
                    {!copied && (
                      <button type="button" onClick={copyLink} className="font-semibold text-primary hover:underline">
                        Copiar link
                      </button>
                    )}
                  </li>
                </ol>
                {shareError && <p className="text-destructive">{shareError}</p>}
              </>
            )}

            <button
              type="button"
              onClick={() => setInstagram({ status: "idle" })}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
