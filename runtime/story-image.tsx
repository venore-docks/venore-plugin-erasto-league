import type { ReactNode } from "react";
import { encodeForWeb, fetchImage, loadSharp, prepareEmblem, preparePhoto, renderPng, type RenderedImage } from "./og-image";
import { readableTextOn, storyNameFontSize, withAlpha } from "../shared/story-layout";

// Story 1080×1920 (9:16) pro Instagram — o botão "Instagram" das páginas públicas
// (blocks/share-bar.tsx) baixa esta imagem e abre o menu de compartilhar do celular; o link vai no
// sticker de link do story (Instagram não aceita link em post/legenda). Mesma identidade da capa
// do jogo (fundo escuro, Barlow Condensed, cor de destaque da liga), fora do tema do site.
// Faixas de ~250px no topo e ~330px embaixo ficam livres: o Instagram cobre com perfil/barra de
// resposta.
export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;

export type StoryTeam = { name: string; crestUrl: string | null; color: string | null };

export type StoryData = {
  kicker: string;
  cta: string;
  // Domínio do site, escrito embaixo (o link de verdade vai no sticker).
  domain: string;
  leagueLogoUrl: string | null;
  accentColor: string;
  content:
    | { kind: "match"; home: StoryTeam; away: StoryTeam; score: { home: string; away: string } | null; caption: string | null }
    | {
        kind: "player";
        name: string;
        subtitle: string;
        photoUrl: string | null;
        color: string | null;
        stats: { label: string; value: string }[];
      }
    | { kind: "teams"; title: string; subtitle: string | null; teams: StoryTeam[] };
};

const BACKGROUND = "#0b0f14";
const MUTED = "rgba(255,255,255,0.72)";
const FALLBACK_TEAM_COLOR = "#64748b";

type Images = { logo: string | null; crests: (string | null)[]; photo: string | null };

function Initials({ name, size, fontSize }: { name: string; size: number; fontSize: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: 999,
        background: "rgba(255,255,255,0.1)",
        fontSize,
        fontWeight: 800,
        color: "#ffffff",
      }}
    >
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function RingedImage({ src, name, size, ring, color }: { src: string | null; name: string; size: number; ring: number; color: string }) {
  const inner = size - ring * 2;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: 999,
        border: `${ring}px solid ${color}`,
        background: "rgba(8,11,15,0.6)",
        boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} width={inner} height={inner} style={{ width: inner, height: inner, borderRadius: 999, objectFit: "cover" }} alt="" />
      ) : (
        <Initials name={name} size={inner} fontSize={Math.round(inner * 0.32)} />
      )}
    </div>
  );
}

function StoryTeamColumn({ team, crest }: { team: StoryTeam; crest: string | null }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 480 }}>
      <RingedImage src={crest} name={team.name} size={320} ring={12} color={team.color ?? FALLBACK_TEAM_COLOR} />
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: 28,
          maxWidth: 460,
          fontSize: storyNameFontSize(team.name, 440, 76, 44),
          fontWeight: 800,
          lineHeight: 1.05,
          textAlign: "center",
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        {team.name}
      </div>
    </div>
  );
}

function MatchContent({ content, images, accent }: { content: Extract<StoryData["content"], { kind: "match" }>; images: Images; accent: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ display: "flex", width: 1000, justifyContent: "space-between", alignItems: "flex-start" }}>
        <StoryTeamColumn team={content.home} crest={images.crests[0] ?? null} />
        <StoryTeamColumn team={content.away} crest={images.crests[1] ?? null} />
      </div>
      {content.score ? (
        <div style={{ display: "flex", alignItems: "center", marginTop: 56, fontSize: 210, fontWeight: 800, lineHeight: 1 }}>
          <span>{content.score.home}</span>
          <span style={{ margin: "0 48px", fontSize: 140, color: accent }}>×</span>
          <span>{content.score.away}</span>
        </div>
      ) : (
        <div style={{ display: "flex", marginTop: 56, fontSize: 170, fontWeight: 800, lineHeight: 1, color: accent }}>VS</div>
      )}
      {content.caption && (
        <div style={{ display: "flex", marginTop: 48, fontSize: 46, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: 2 }}>
          {content.caption}
        </div>
      )}
    </div>
  );
}

function PlayerContent({ content, images, accent }: { content: Extract<StoryData["content"], { kind: "player" }>; images: Images; accent: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <RingedImage src={images.photo} name={content.name} size={440} ring={14} color={content.color ?? accent} />
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: 40,
          maxWidth: 980,
          fontSize: storyNameFontSize(content.name, 960, 110, 60),
          fontWeight: 800,
          lineHeight: 1,
          textAlign: "center",
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        {content.name}
      </div>
      <div style={{ display: "flex", marginTop: 18, fontSize: 50, fontWeight: 600, color: MUTED }}>{content.subtitle}</div>
      <div style={{ display: "flex", marginTop: 56 }}>
        {content.stats.map((stat, index) => (
          <div
            key={stat.label}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: 300,
              height: 200,
              marginLeft: index === 0 ? 0 : 30,
              borderRadius: 36,
              background: "rgba(255,255,255,0.08)",
            }}
          >
            <div style={{ display: "flex", fontSize: 108, fontWeight: 800, lineHeight: 1, color: accent }}>{stat.value}</div>
            <div
              style={{
                display: "flex",
                marginTop: 12,
                maxWidth: 260,
                fontSize: 32,
                fontWeight: 600,
                lineHeight: 1.1,
                textAlign: "center",
                textTransform: "uppercase",
                letterSpacing: 1,
                color: MUTED,
              }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Muro de brasões: quanto mais times, menor o brasão — até 12 (3 linhas de 4) cabem na área útil.
function crestWallSize(count: number): number {
  if (count <= 4) return 220;
  if (count <= 8) return 196;
  return 176;
}

function TeamsContent({ content, images }: { content: Extract<StoryData["content"], { kind: "teams" }>; images: Images }) {
  const crestSize = crestWallSize(Math.min(content.teams.length, 12));
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          maxWidth: 960,
          fontSize: 104,
          fontWeight: 800,
          lineHeight: 1,
          textAlign: "center",
          textTransform: "uppercase",
        }}
      >
        {content.title}
      </div>
      {content.subtitle && (
        <div style={{ display: "flex", justifyContent: "center", maxWidth: 900, marginTop: 28, fontSize: 48, fontWeight: 600, textAlign: "center", color: MUTED }}>
          {content.subtitle}
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", width: 960, marginTop: 64 }}>
        {content.teams.slice(0, 12).map((team, index) => (
          <div key={`${team.name}-${index}`} style={{ display: "flex", margin: 16 }}>
            <RingedImage src={images.crests[index] ?? null} name={team.name} size={crestSize} ring={8} color={team.color ?? FALLBACK_TEAM_COLOR} />
          </div>
        ))}
      </div>
    </div>
  );
}

function StoryLayout({ data, images }: { data: StoryData; images: Images }) {
  const accent = data.accentColor;
  let content: ReactNode;
  if (data.content.kind === "match") content = <MatchContent content={data.content} images={images} accent={accent} />;
  else if (data.content.kind === "player") content = <PlayerContent content={data.content} images={images} accent={accent} />;
  else content = <TeamsContent content={data.content} images={images} />;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        position: "relative",
        width: STORY_WIDTH,
        height: STORY_HEIGHT,
        background: BACKGROUND,
        fontFamily: "Barlow Condensed",
        color: "#ffffff",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: STORY_WIDTH,
          height: STORY_HEIGHT,
          display: "flex",
          backgroundImage: `radial-gradient(circle at 50% 0%, ${withAlpha(accent, 0.42)} 0%, ${withAlpha(accent, 0)} 55%), linear-gradient(180deg, ${BACKGROUND} 0%, #05080c 100%)`,
        }}
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: 190 }}>
        {images.logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={images.logo} width={112} height={112} style={{ width: 112, height: 112, borderRadius: 999, objectFit: "cover", marginRight: 26 }} alt="" />
        )}
        <div style={{ display: "flex", fontSize: 70, fontWeight: 800, letterSpacing: 4, textTransform: "uppercase" }}>Erasto League</div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 44 }}>
        <div
          style={{
            display: "flex",
            padding: "14px 40px",
            borderRadius: 999,
            background: accent,
            color: readableTextOn(accent),
            fontSize: 46,
            fontWeight: 800,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          {data.kicker}
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, flexDirection: "column", alignItems: "center", justifyContent: "center" }}>{content}</div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 340 }}>
        <div style={{ display: "flex", fontSize: 60, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: accent }}>{data.cta}</div>
        <div style={{ display: "flex", marginTop: 10, fontSize: 38, fontWeight: 600, color: MUTED }}>{data.domain}</div>
      </div>
    </div>
  );
}

// origin: base pra URLs de mídia relativas (driver "filesystem" do host serve em /api/media/...).
export async function renderStory(data: StoryData, origin: string): Promise<RenderedImage> {
  const sharp = await loadSharp();
  const crestUrls =
    data.content.kind === "match"
      ? [data.content.home.crestUrl, data.content.away.crestUrl]
      : data.content.kind === "teams"
        ? data.content.teams.slice(0, 12).map((team) => team.crestUrl)
        : [];
  const photoUrl = data.content.kind === "player" ? data.content.photoUrl : null;

  const [logoImage, photoImage, ...crestImages] = await Promise.all([
    fetchImage(data.leagueLogoUrl, origin),
    fetchImage(photoUrl, origin),
    ...crestUrls.map((url) => fetchImage(url, origin)),
  ]);
  const [logo, photo, ...crests] = await Promise.all([
    prepareEmblem(logoImage, sharp, 224),
    preparePhoto(photoImage, sharp, 640, 640),
    ...crestImages.map((image) => prepareEmblem(image, sharp, 400)),
  ]);

  let png: Buffer;
  try {
    png = await renderPng(<StoryLayout data={data} images={{ logo, photo, crests }} />, STORY_WIDTH, STORY_HEIGHT);
  } catch {
    // Alguma imagem que o Satori não decodifica (sem sharp pra normalizar) — melhor um story só com
    // nomes/cores do que nenhum.
    png = await renderPng(<StoryLayout data={data} images={{ logo: null, photo: null, crests: [] }} />, STORY_WIDTH, STORY_HEIGHT);
  }
  return encodeForWeb(png, sharp, 86);
}
