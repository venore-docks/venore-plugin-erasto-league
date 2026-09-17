import type { BlockRendererProps } from "@venore/plugin-sdk";
import { resolveErastoLeagueConfig } from "../shared/config";

function readString(data: Record<string, unknown>, key: string, fallback = ""): string {
  const value = data[key];
  return typeof value === "string" ? value : fallback;
}

// Transmissão ao vivo — embeda .../embed/live_stream?channel=<id>, um endpoint do próprio YouTube
// que resolve sozinho pra live atual do canal (sem precisar de API key nem do admin colar o link de
// cada jogo). Quando o canal não está ao vivo, o iframe mostra o estado "offline" dele — não dá pra
// saber isso do lado do servidor sem API key, por isso o texto de apoio abaixo do player.
export async function ErastoLeagueBroadcastBlock({ block }: BlockRendererProps) {
  const title = readString(block.data, "title", "Transmissão ao vivo");
  const config = await resolveErastoLeagueConfig();

  if (!config.youtubeChannelId) {
    return null;
  }

  return (
    <div className="space-y-3">
      {title && <h2 className="text-2xl font-semibold text-foreground">{title}</h2>}

      <div className="aspect-video w-full overflow-hidden rounded-panel border border-border bg-card shadow-sm">
        <iframe
          src={`https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(config.youtubeChannelId)}`}
          title={title || "Transmissão ao vivo"}
          className="size-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      <p className="text-center text-xs text-muted-foreground">
        O player aparece automaticamente quando a transmissão está ao vivo no canal do YouTube da liga.
      </p>
    </div>
  );
}
