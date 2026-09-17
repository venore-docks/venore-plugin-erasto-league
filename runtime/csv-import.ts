import { csvToObjects } from "../shared/csv";
import { createTeamWithId, getTeam, getTeamByName, updateTeam, upsertTeamByName, type TeamInput } from "./teams";
import { createFixture, deleteAllFixtures } from "./fixtures";
import type { FixturePhase } from "../contracts/types";

export type ImportError = { line: number; message: string };
export type ImportResult = { created: number; updated: number; errors: ImportError[] };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function cell(row: Record<string, string>, key: string): string {
  return (row[key] ?? "").trim();
}

function optionalCell(row: Record<string, string>, key: string): string | null {
  const value = cell(row, key);
  return value || null;
}

// Colunas esperadas (header, case-insensitive): name, primaryColor, secondaryColor, foundedDate,
// description, id (opcional, uuid). Só "name" é obrigatória — o resto fica null se a coluna
// faltar ou a célula estiver vazia. Grupo NÃO é campo de time — mora só em fixtures.csv
// (confronto), porque é propriedade da edição do campeonato, não do time em si.
//
// "id" vazio = casa/upserta pelo nome (upsertTeamByName) — o caminho normal quando não tem uuid
// nenhum ainda. "id" preenchido e já existe = atualiza aquele time por id (não recadastra por
// nome — útil pra renomear sem duplicar). "id" preenchido e NÃO existe ainda = cria o time COM
// esse id exato (createTeamWithId) — pra planilha ser autorada com uuid pré-gerado desde o
// início, e fixtures.csv já poder referenciar esses mesmos ids sem depender do nome de jeito
// nenhum (nome muda, digita errado, tem acento — id não).
export async function importTeamsCsv(csvText: string): Promise<ImportResult> {
  const rows = csvToObjects(csvText);
  const result: ImportResult = { created: 0, updated: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const line = i + 2; // +1 pelo header, +1 porque índice começa em 0
    const name = cell(row, "name");
    if (!name) {
      result.errors.push({ line, message: 'Coluna "name" vazia.' });
      continue;
    }

    const input: TeamInput = {
      name,
      crestMediaId: null, // CSV não faz upload de arquivo — brasão continua manual pelo form.
      primaryColor: optionalCell(row, "primarycolor"),
      secondaryColor: optionalCell(row, "secondarycolor"),
      description: optionalCell(row, "description"),
      foundedDate: optionalCell(row, "foundeddate"),
    };

    try {
      const idCell = optionalCell(row, "id");
      if (idCell) {
        if (!UUID_RE.test(idCell)) {
          result.errors.push({ line, message: `"${idCell}" não parece um id válido (uuid).` });
          continue;
        }
        const existing = await getTeam(idCell);
        if (existing) {
          await updateTeam(idCell, input);
          result.updated++;
        } else {
          await createTeamWithId(idCell, input);
          result.created++;
        }
      } else {
        const { created } = await upsertTeamByName(input);
        if (created) result.created++;
        else result.updated++;
      }
    } catch (error) {
      result.errors.push({ line, message: error instanceof Error ? error.message : "Falha ao importar." });
    }
  }

  return result;
}

const PHASE_ALIASES: Record<string, FixturePhase> = {
  group: "group",
  grupo: "group",
  grupos: "group",
  "fase de grupos": "group",
  quarterfinal: "quarterfinal",
  quartas: "quarterfinal",
  "quartas de final": "quarterfinal",
  semifinal: "semifinal",
  semi: "semifinal",
  "semifinal(is)": "semifinal",
  final: "final",
};

function normalizePhase(raw: string): FixturePhase | null {
  return PHASE_ALIASES[raw.trim().toLowerCase()] ?? null;
}

// Aceita "dd/mm/aaaa" (formato das artes) ou "aaaa-mm-dd" (ISO); hora "HH:mm" opcional, junto ou
// separada. Sem data válida = tudo null (fixture "sem data marcada" — o widget mostra "a
// definir"). Devolve as duas colunas já como texto puro — nenhuma conversão de fuso acontece
// aqui (database/schema/fixtures.ts guarda data e hora separadas exatamente pra isso).
function parseFlexibleDate(dateRaw: string, timeRaw: string): { scheduledDate: string | null; scheduledTime: string | null } {
  if (!dateRaw) return { scheduledDate: null, scheduledTime: null };

  let year: number;
  let month: number;
  let day: number;

  const brMatch = dateRaw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const isoMatch = dateRaw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (brMatch) {
    day = Number(brMatch[1]);
    month = Number(brMatch[2]);
    year = Number(brMatch[3]);
  } else if (isoMatch) {
    year = Number(isoMatch[1]);
    month = Number(isoMatch[2]);
    day = Number(isoMatch[3]);
  } else {
    return { scheduledDate: null, scheduledTime: null };
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  const scheduledDate = `${year}-${pad(month)}-${pad(day)}`;

  const timeMatch = timeRaw.match(/^(\d{1,2}):(\d{2})/);
  const scheduledTime = timeMatch ? `${pad(Number(timeMatch[1]))}:${timeMatch[2]}` : null;

  return { scheduledDate, scheduledTime };
}

type TeamRefResult = { ok: true; teamId: string | null } | { ok: false; message: string };

// Resolve um lado (casa/visitante) de um confronto: a coluna "...Id" (uuid) tem prioridade sobre a
// coluna de nome — pensado pra um export/reimport corretivo (ids não mudam se o time for
// renomeado, nome muda). As duas vazias = confronto "a definir" (eliminatória sem time conhecido
// ainda), não é erro.
async function resolveTeamRef(row: Record<string, string>, idKey: string, nameKey: string, label: string): Promise<TeamRefResult> {
  const idValue = cell(row, idKey);
  if (idValue) {
    if (!UUID_RE.test(idValue)) {
      return { ok: false, message: `${label}: "${idValue}" não parece um id válido (uuid).` };
    }
    const team = await getTeam(idValue);
    if (!team) {
      return { ok: false, message: `${label} não encontrado pelo id: "${idValue}".` };
    }
    return { ok: true, teamId: team.id };
  }

  const nameValue = cell(row, nameKey);
  if (nameValue) {
    const team = await getTeamByName(nameValue);
    if (!team) {
      return { ok: false, message: `${label} não encontrado: "${nameValue}". Cadastre/importe os times antes.` };
    }
    return { ok: true, teamId: team.id };
  }

  return { ok: true, teamId: null };
}

// Colunas esperadas: phase, group, round, homeTeamId, homeTeam, awayTeamId, awayTeam, homeLabel,
// awayLabel, date, time, order. homeTeamId/awayTeamId (uuid, ver ID em /admin/erasto-league/teams/
// :id) têm prioridade sobre homeTeam/awayTeam (nome, usado quando o id ainda não existe — primeiro
// import). Os dois vazios = confronto "a definir" (usa homeLabel/awayLabel, ex: "Vencedor Grupo A")
// pra quartas/semi/final antes dos times reais serem conhecidos.
export async function importFixturesCsv(csvText: string, options: { replaceAll?: boolean } = {}): Promise<ImportResult> {
  const rows = csvToObjects(csvText);
  const result: ImportResult = { created: 0, updated: 0, errors: [] };

  if (options.replaceAll) {
    await deleteAllFixtures();
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const line = i + 2;

    const phase = normalizePhase(cell(row, "phase") || "group");
    if (!phase) {
      result.errors.push({ line, message: `Fase inválida: "${cell(row, "phase")}". Use group, quarterfinal, semifinal ou final.` });
      continue;
    }

    const home = await resolveTeamRef(row, "hometeamid", "hometeam", "Time da casa");
    if (!home.ok) {
      result.errors.push({ line, message: home.message });
      continue;
    }
    const away = await resolveTeamRef(row, "awayteamid", "awayteam", "Time visitante");
    if (!away.ok) {
      result.errors.push({ line, message: away.message });
      continue;
    }

    try {
      await createFixture({
        phase,
        groupName: optionalCell(row, "group"),
        roundLabel: optionalCell(row, "round"),
        homeTeamId: home.teamId,
        awayTeamId: away.teamId,
        homeLabel: optionalCell(row, "homelabel"),
        awayLabel: optionalCell(row, "awaylabel"),
        ...parseFlexibleDate(cell(row, "date"), cell(row, "time")),
        sortOrder: Number(cell(row, "order")) || 0,
      });
      result.created++;
    } catch (error) {
      result.errors.push({ line, message: error instanceof Error ? error.message : "Falha ao importar." });
    }
  }

  return result;
}
