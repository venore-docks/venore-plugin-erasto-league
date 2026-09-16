import { csvToObjects } from "../shared/csv";
import { getTeamByName, upsertTeamByName } from "./teams";
import { createFixture, deleteAllFixtures } from "./fixtures";
import type { FixturePhase } from "../contracts/types";

export type ImportError = { line: number; message: string };
export type ImportResult = { created: number; updated: number; errors: ImportError[] };

function cell(row: Record<string, string>, key: string): string {
  return (row[key] ?? "").trim();
}

function optionalCell(row: Record<string, string>, key: string): string | null {
  const value = cell(row, key);
  return value || null;
}

// Colunas esperadas (header, case-insensitive): name, group, primaryColor, secondaryColor,
// foundedDate, description. Só "name" é obrigatória — o resto fica null se a coluna faltar ou a
// célula estiver vazia. Reimportar a mesma planilha atualiza os times existentes (casados por
// nome, ver upsertTeamByName) em vez de duplicar.
export async function importTeamsCsv(csvText: string): Promise<ImportResult> {
  const rows = csvToObjects(csvText);
  const result: ImportResult = { created: 0, updated: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const line = i + 2; // +1 pelo header, +1 porque índice começa em 0
    const name = cell(row, "name");
    if (!name) {
      result.errors.push({ line, message: "Coluna \"name\" vazia." });
      continue;
    }

    try {
      const { created } = await upsertTeamByName({
        name,
        crestMediaId: null, // CSV não faz upload de arquivo — brasão continua manual pelo form.
        primaryColor: optionalCell(row, "primarycolor"),
        secondaryColor: optionalCell(row, "secondarycolor"),
        description: optionalCell(row, "description"),
        foundedDate: optionalCell(row, "foundeddate"),
        groupName: optionalCell(row, "group"),
      });
      if (created) result.created++;
      else result.updated++;
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
// separada. Sem data válida = null (fixture "sem data marcada" — o widget mostra "a definir").
function parseFlexibleDate(dateRaw: string, timeRaw: string): number | null {
  if (!dateRaw) return null;

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
    return null;
  }

  let hours = 0;
  let minutes = 0;
  const timeMatch = timeRaw.match(/^(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    hours = Number(timeMatch[1]);
    minutes = Number(timeMatch[2]);
  }

  const date = new Date(year, month - 1, day, hours, minutes);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

// Colunas esperadas: phase, group, round, homeTeam, awayTeam, homeLabel, awayLabel, date, time,
// order. homeTeam/awayTeam vazios = confronto "a definir" (usa homeLabel/awayLabel — ex: "Vencedor
// Grupo A") pra quartas/semi/final antes dos times reais serem conhecidos.
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

    const homeTeamName = cell(row, "hometeam");
    const awayTeamName = cell(row, "awayteam");
    let homeTeamId: string | null = null;
    let awayTeamId: string | null = null;

    if (homeTeamName) {
      const team = await getTeamByName(homeTeamName);
      if (!team) {
        result.errors.push({ line, message: `Time da casa não encontrado: "${homeTeamName}". Cadastre/importe os times antes.` });
        continue;
      }
      homeTeamId = team.id;
    }
    if (awayTeamName) {
      const team = await getTeamByName(awayTeamName);
      if (!team) {
        result.errors.push({ line, message: `Time visitante não encontrado: "${awayTeamName}". Cadastre/importe os times antes.` });
        continue;
      }
      awayTeamId = team.id;
    }

    try {
      await createFixture({
        phase,
        groupName: optionalCell(row, "group"),
        roundLabel: optionalCell(row, "round"),
        homeTeamId,
        awayTeamId,
        homeLabel: optionalCell(row, "homelabel"),
        awayLabel: optionalCell(row, "awaylabel"),
        scheduledAt: parseFlexibleDate(cell(row, "date"), cell(row, "time")),
        sortOrder: Number(cell(row, "order")) || 0,
      });
      result.created++;
    } catch (error) {
      result.errors.push({ line, message: error instanceof Error ? error.message : "Falha ao importar." });
    }
  }

  return result;
}
