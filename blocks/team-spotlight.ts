import type { BlockDefinition } from "@venore/plugin-sdk/cms";

// Card compacto de UM time específico (ex: "time campeão", destaque do mês) — o único campo real é
// o slug do time; o resto (brasão, cores, recorde) vem sempre do cadastro/classificação na hora de
// renderizar. Ver blocks/team-spotlight-block.tsx.
export const erastoLeagueTeamSpotlightBlockDefinition: BlockDefinition = {
  key: "erasto-league.team-spotlight",
  label: "Erasto League — Time em destaque",
  category: "erasto-league",
  structure: "leaf",
  allowedInRoot: true,
  defaultData: {
    teamSlug: "",
  },
  editorFields: [
    { name: "teamSlug", type: "text", label: "Slug do time (veja em /admin/erasto-league/teams)" },
  ],
  requiredDataFields: ["teamSlug"],
  missingConfigMessage: "Informe o slug do time pra esse bloco aparecer.",
};
