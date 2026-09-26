"use client";

import { useState, useSyncExternalStore } from "react";

const subscribeNothing = () => () => {};

// Miniatura do YouTube POR CIMA do fundo de reserva do card (cores + brasões, ver
// blocks/matches-gallery-block.tsx) — só aparece depois de carregar de verdade: vídeo privado ou
// apagado, link com id errado ou rede ruim deixam o fundo de reserva à mostra em vez do ícone de
// imagem quebrada. Largura ≤ 120 = placeholder cinza de 120×90 que o YouTube devolve pra vídeo sem
// miniatura. O <img> só entra no DOM depois de montar no client (useSyncExternalStore, mesmo padrão
// de src/components/color-mode-toggle.tsx no host): carga/erro que acontecesse antes da hidratação
// não dispararia onLoad/onError do React e a imagem ficaria invisível pra sempre.
export function YoutubeThumbnail({ src }: { src: string }) {
  const mounted = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
  const [state, setState] = useState<"loading" | "ok" | "failed">("loading");

  if (!mounted || state === "failed") return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      onLoad={(event) => setState(event.currentTarget.naturalWidth > 120 ? "ok" : "failed")}
      onError={() => setState("failed")}
      className={`absolute inset-0 size-full object-cover ui-motion-base ${state === "ok" ? "opacity-100" : "opacity-0"}`}
    />
  );
}
