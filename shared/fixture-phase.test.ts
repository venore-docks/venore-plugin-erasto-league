import { describe, expect, it } from "vitest";
import { FIXTURE_PHASE_LABEL, FIXTURE_PHASE_ORDER } from "./fixture-phase";

describe("fixture-phase", () => {
  it("ordena grupos → oitavas → quartas → semi → final", () => {
    expect(FIXTURE_PHASE_ORDER).toEqual(["group", "roundof16", "quarterfinal", "semifinal", "final"]);
  });

  it("tem rótulo pra toda fase da ordem", () => {
    for (const phase of FIXTURE_PHASE_ORDER) expect(FIXTURE_PHASE_LABEL[phase]).toBeTruthy();
    expect(FIXTURE_PHASE_LABEL.roundof16).toBe("Oitavas de final");
  });
});
