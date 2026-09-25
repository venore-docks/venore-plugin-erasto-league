import { ImageResponse } from "next/og";
import type { MatchCoverData } from "./match-cover";
import { BARLOW_CONDENSED_600_WOFF_BASE64, BARLOW_CONDENSED_800_WOFF_BASE64 } from "../shared/fonts/barlow-condensed";
import { coverTeamNameFontSize } from "../shared/match-cover-layout";

// Capa 1280×720 do jogo (tamanho recomendado de miniatura do YouTube) — foto da súmula de fundo,
// brasões + nomes dos times, rodada/fase, data e logo da liga. SEM placar (pedido explícito).
// Renderizada com next/og (Satori + Resvg: JSX → PNG, só flexbox e um subconjunto de CSS — nada de
// grid, color-mix nem filter) e, quando o `sharp` existe (optionalDependency do próprio Next),
// convertida pra JPEG: PNG de foto em 1280×720 passa fácil dos 2 MB que o YouTube aceita.

export const COVER_WIDTH = 1280;
export const COVER_HEIGHT = 720;

const FETCH_TIMEOUT_MS = 8_000;
// Formatos que o Satori decodifica sozinho quando o sharp não está disponível pra normalizar.
const SATORI_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/svg+xml"]);

type FetchedImage = { buffer: Buffer; contentType: string };
type SharpFactory = typeof import("sharp");

let sharpPromise: Promise<SharpFactory | null> | null = null;

// Import dinâmico: sem sharp instalado a capa continua saindo (em PNG), só sem normalizar
// orientação EXIF/tamanho da foto nem comprimir pra JPEG.
function loadSharp(): Promise<SharpFactory | null> {
  if (!sharpPromise) {
    sharpPromise = import("sharp").then((mod) => mod.default).catch(() => null);
  }
  return sharpPromise;
}

async function fetchImage(url: string | null, origin: string): Promise<FetchedImage | null> {
  if (!url) return null;
  try {
    const response = await fetch(new URL(url, origin), { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() ?? "application/octet-stream";
    return { buffer: Buffer.from(await response.arrayBuffer()), contentType };
  } catch {
    return null;
  }
}

function toDataUri(buffer: Buffer, contentType: string): string {
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

// Foto: com sharp, gira pela orientação EXIF (foto de celular!), recorta 16:9 no ponto de maior
// interesse e reencoda leve — o Satori ignora EXIF e ficaria lento com foto de 8 MB.
async function preparePhoto(image: FetchedImage | null, sharp: SharpFactory | null): Promise<string | null> {
  if (!image) return null;
  if (sharp) {
    try {
      const jpeg = await sharp(image.buffer)
        .rotate()
        .resize(COVER_WIDTH, COVER_HEIGHT, { fit: "cover", position: sharp.strategy.attention })
        .jpeg({ quality: 90 })
        .toBuffer();
      return toDataUri(jpeg, "image/jpeg");
    } catch {
      // cai pro arquivo original abaixo
    }
  }
  return SATORI_IMAGE_TYPES.has(image.contentType) ? toDataUri(image.buffer, image.contentType) : null;
}

// Brasão/logo: quadrado 320px recortado no centro (mesmo object-cover redondo do site e da TV); SVG
// vira PNG aqui também.
async function prepareEmblem(image: FetchedImage | null, sharp: SharpFactory | null): Promise<string | null> {
  if (!image) return null;
  if (sharp) {
    try {
      const png = await sharp(image.buffer)
        .resize(320, 320, { fit: "cover" })
        .png()
        .toBuffer();
      return toDataUri(png, "image/png");
    } catch {
      // cai pro arquivo original abaixo
    }
  }
  return SATORI_IMAGE_TYPES.has(image.contentType) ? toDataUri(image.buffer, image.contentType) : null;
}

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

function coverFonts() {
  return [
    { name: "Barlow Condensed", data: Buffer.from(BARLOW_CONDENSED_800_WOFF_BASE64, "base64"), weight: 800 as const, style: "normal" as const },
    { name: "Barlow Condensed", data: Buffer.from(BARLOW_CONDENSED_600_WOFF_BASE64, "base64"), weight: 600 as const, style: "normal" as const },
  ];
}

async function renderPng(props: Parameters<typeof CoverLayout>[0]): Promise<Buffer> {
  const response = new ImageResponse(<CoverLayout {...props} />, { width: COVER_WIDTH, height: COVER_HEIGHT, fonts: coverFonts() });
  return Buffer.from(await response.arrayBuffer());
}

export type RenderedCover = { body: Buffer; contentType: "image/jpeg" | "image/png" };

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
    preparePhoto(photoImage, sharp),
    prepareEmblem(homeCrestImage, sharp),
    prepareEmblem(awayCrestImage, sharp),
    prepareEmblem(logoImage, sharp),
  ]);

  let png: Buffer;
  try {
    png = await renderPng({ data, photo, homeCrest, awayCrest, logo });
  } catch {
    // Alguma imagem num formato que o Satori não decodifica (sem sharp pra normalizar) — melhor
    // uma capa só com cores/nomes do que nenhuma.
    png = await renderPng({ data, photo: null, homeCrest: null, awayCrest: null, logo: null });
  }

  if (sharp) {
    try {
      const jpeg = await sharp(png).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
      return { body: jpeg, contentType: "image/jpeg" };
    } catch {
      // PNG mesmo
    }
  }
  return { body: png, contentType: "image/png" };
}
