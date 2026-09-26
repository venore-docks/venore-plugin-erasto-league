import type { MatchCoverData } from "./match-cover";
import { encodeForWeb, fetchImage, loadSharp, prepareEmblem, preparePhoto, renderPng, type RenderedImage } from "./og-image";
import { COVER_HEIGHT, COVER_WIDTH, coverTeamNameFontSize } from "../shared/match-cover-layout";

// Capa 1280×720 do jogo (tamanho recomendado de miniatura do YouTube) — foto da súmula de fundo,
// brasões + nomes dos times, rodada/fase, data e logo da liga. SEM placar (pedido explícito).
// Renderizada com next/og e convertida pra JPEG quando o sharp existe (runtime/og-image.ts): PNG de
// foto em 1280×720 passa fácil dos 2 MB que o YouTube aceita.

const FALLBACK_TEAM_COLOR = "#64748b";

function CoverTeam({ name, crest, color }: { name: string; crest: string | null; color: string | null }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 480 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 196,
          height: 196,
          borderRadius: 999,
          border: `8px solid ${color ?? "rgba(255,255,255,0.4)"}`,
          background: "rgba(8,11,15,0.6)",
          boxShadow: "0 18px 44px rgba(0,0,0,0.55)",
        }}
      >
        {crest ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={crest} width={180} height={180} style={{ width: 180, height: 180, borderRadius: 999, objectFit: "cover" }} alt="" />
        ) : (
          <div style={{ display: "flex", fontSize: 76, fontWeight: 800, color: "#ffffff" }}>{name.slice(0, 2).toUpperCase()}</div>
        )}
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 18,
          maxWidth: 480,
          fontSize: coverTeamNameFontSize(name),
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: 1,
          textTransform: "uppercase",
          color: "#ffffff",
          textAlign: "center",
          textShadow: "0 4px 18px rgba(0,0,0,0.65)",
        }}
      >
        {name}
      </div>
    </div>
  );
}

function CoverLayout({
  data,
  photo,
  homeCrest,
  awayCrest,
  logo,
}: {
  data: MatchCoverData;
  photo: string | null;
  homeCrest: string | null;
  awayCrest: string | null;
  logo: string | null;
}) {
  const homeColor = data.homeColor ?? FALLBACK_TEAM_COLOR;
  const awayColor = data.awayColor ?? FALLBACK_TEAM_COLOR;
  const full = { position: "absolute" as const, top: 0, left: 0, width: COVER_WIDTH, height: COVER_HEIGHT };

  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width: COVER_WIDTH,
        height: COVER_HEIGHT,
        background: "#0b0f14",
        fontFamily: "Barlow Condensed",
      }}
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} width={COVER_WIDTH} height={COVER_HEIGHT} style={{ ...full, objectFit: "cover" }} alt="" />
      ) : (
        <div
          style={{
            ...full,
            display: "flex",
            backgroundImage: `linear-gradient(115deg, ${homeColor} 0%, #0b0f14 46%, #0b0f14 54%, ${awayColor} 100%)`,
          }}
        />
      )}
      <div
        style={{
          ...full,
          display: "flex",
          backgroundImage:
            "linear-gradient(180deg, rgba(5,8,12,0.62) 0%, rgba(5,8,12,0.08) 26%, rgba(5,8,12,0.12) 46%, rgba(5,8,12,0.82) 76%, rgba(5,8,12,0.95) 100%)",
        }}
      />

      <div style={{ position: "absolute", top: 34, left: 44, right: 44, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          {logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} width={92} height={92} style={{ width: 92, height: 92, borderRadius: 999, objectFit: "cover", marginRight: 18 }} alt="" />
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 44, fontWeight: 800, lineHeight: 1, letterSpacing: 2, textTransform: "uppercase", color: "#ffffff" }}>
              Erasto League
            </div>
            <div style={{ display: "flex", marginTop: 4, fontSize: 28, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>{data.dateLabel}</div>
          </div>
        </div>
        {data.stageLabel && (
          <div
            style={{
              display: "flex",
              padding: "8px 26px",
              borderRadius: 999,
              background: data.accentColor,
              color: "#04170a",
              fontSize: 34,
              fontWeight: 800,
              letterSpacing: 1,
              textTransform: "uppercase",
              boxShadow: "0 10px 28px rgba(0,0,0,0.45)",
            }}
          >
            {data.stageLabel}
          </div>
        )}
      </div>

      <div style={{ position: "absolute", left: 0, right: 0, bottom: 44, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <CoverTeam name={data.homeName} crest={homeCrest} color={data.homeColor} />
        <div
          style={{
            display: "flex",
            marginBottom: 118,
            fontSize: 104,
            fontWeight: 800,
            lineHeight: 1,
            color: data.accentColor,
            textShadow: "0 6px 22px rgba(0,0,0,0.6)",
          }}
        >
          VS
        </div>
        <CoverTeam name={data.awayName} crest={awayCrest} color={data.awayColor} />
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 10,
          display: "flex",
          backgroundImage: `linear-gradient(90deg, ${homeColor}, ${data.accentColor}, ${awayColor})`,
        }}
      />
    </div>
  );
}

function renderCoverPng(props: Parameters<typeof CoverLayout>[0]): Promise<Buffer> {
  return renderPng(<CoverLayout {...props} />, COVER_WIDTH, COVER_HEIGHT);
}

export type RenderedCover = RenderedImage;

// origin: base pra URLs de mídia relativas (driver "filesystem" do host serve em /api/media/...).
export async function renderMatchCover(data: MatchCoverData, origin: string): Promise<RenderedCover> {
  const sharp = await loadSharp();
  const [photoImage, homeCrestImage, awayCrestImage, logoImage] = await Promise.all([
    fetchImage(data.photoUrl, origin),
    fetchImage(data.homeCrestUrl, origin),
    fetchImage(data.awayCrestUrl, origin),
    fetchImage(data.leagueLogoUrl, origin),
  ]);
  const [photo, homeCrest, awayCrest, logo] = await Promise.all([
    preparePhoto(photoImage, sharp, COVER_WIDTH, COVER_HEIGHT),
    prepareEmblem(homeCrestImage, sharp),
    prepareEmblem(awayCrestImage, sharp),
    prepareEmblem(logoImage, sharp),
  ]);

  let png: Buffer;
  try {
    png = await renderCoverPng({ data, photo, homeCrest, awayCrest, logo });
  } catch {
    // Alguma imagem num formato que o Satori não decodifica (sem sharp pra normalizar) — melhor
    // uma capa só com cores/nomes do que nenhuma.
    png = await renderCoverPng({ data, photo: null, homeCrest: null, awayCrest: null, logo: null });
  }

  return encodeForWeb(png, sharp);
}
