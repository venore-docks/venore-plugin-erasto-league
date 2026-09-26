import { describe, expect, it } from "vitest";
import { describeFixtureStage, describeMatchDate } from "./match-labels";

describe("describeFixtureStage", () => {
  it("eliminatória usa o nome da fase", () => {
    expect(describeFixtureStage({ phase: "semifinal", groupName: null, roundLabel: null })).toBe("Semifinal");
  });

  it("fase de grupos junta grupo e rodada, com fallback pro nome da fase", () => {
    expect(describeFixtureStage({ phase: "group", groupName: "A", roundLabel: "2ª Rodada" })).toBe("Grupo A · 2ª Rodada");
    expect(describeFixtureStage({ phase: "group", groupName: null, roundLabel: null })).toBe("Fase de grupos");
  });

  it("sem confronto vinculado não tem rótulo", () => {
    expect(describeFixtureStage(undefined)).toBeNull();
  });
});

describe("describeMatchDate", () => {
  it("prefere a data do confronto (texto puro, sem fuso)", () => {
    expect(describeMatchDate(Date.UTC(2026, 8, 1, 12), { scheduledDate: "2026-09-18" })).toBe("18/09");
  });

  it("sem confronto usa o apito inicial em Brasília (01h UTC ainda é o dia anterior)", () => {
    expect(describeMatchDate(Date.UTC(2026, 8, 26, 1, 0), null)).toBe("25/09");
  });
});
