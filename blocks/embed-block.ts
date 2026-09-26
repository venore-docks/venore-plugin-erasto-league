import type { BlockRendererProps } from "@venore/plugin-sdk";

// Props sintéticas pra renderizar um bloco do plugin DENTRO de outro (página inicial completa,
// blocks/home-block.tsx) com dados fixos — os renderers do plugin só leem `block.data`.
export function embedBlockProps(key: string, data: Record<string, unknown>): BlockRendererProps {
  return {
    block: { id: `embed:${key}`, key, slot: "", htmlId: null, data, areas: [] },
    mode: "published",
    renderBlocks: async () => [],
  };
}
