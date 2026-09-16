// Dois arquivos separados (não um só) — mesmo motivo do venore-plugin-donation (blocks/index.ts
// de lá): definitions.ts é dado puro (sem tocar em runtime/settings), renderers.ts importa os
// componentes de render (que puxam runtime/* -> db). Quem só quer o schema (ex: testes) importa
// definitions.ts direto, sem arrastar essa cadeia.
export { blockDefinitions } from "./definitions";
export { blockRenderers } from "./renderers";
