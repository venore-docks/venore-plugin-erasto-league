import { describe, expect, it } from "vitest";
import { issueVoteTicket, verifyVoteTicket } from "./vote-ticket";

const match = { kind: "match" as const, matchId: "48f0aef6-fe76-492f-bc9d-eb7fe52d5a10" };

describe("vote ticket", () => {
  it("vale pra votação em que foi emitido e devolve quando foi emitido", () => {
    const ticket = issueVoteTicket(match, 1_000_000);
    const check = verifyVoteTicket(ticket, match, 1_010_000);
    expect(check).toMatchObject({ ok: true, issuedAt: 1_000_000 });
  });

  it("cada ticket tem nonce próprio (um ticket = um voto)", () => {
    const a = verifyVoteTicket(issueVoteTicket(match), match);
    const b = verifyVoteTicket(issueVoteTicket(match), match);
    expect(a.ok && b.ok && a.nonce !== b.nonce).toBe(true);
  });

  it("recusa ticket de outra votação, adulterado ou lixo", () => {
    const ticket = issueVoteTicket(match);
    expect(verifyVoteTicket(ticket, { kind: "favorite" })).toEqual({ ok: false, reason: "invalid" });
    expect(verifyVoteTicket(ticket, { kind: "match", matchId: "outro" })).toEqual({ ok: false, reason: "invalid" });

    // Adiantar o "emitido em" pra pular a espera quebra a assinatura.
    const parts = ticket.split(".");
    parts[2] = String(Number(parts[2]) - 60_000);
    expect(verifyVoteTicket(parts.join("."), match)).toEqual({ ok: false, reason: "invalid" });

    expect(verifyVoteTicket("lixo", match)).toEqual({ ok: false, reason: "invalid" });
    expect(verifyVoteTicket(null, match)).toEqual({ ok: false, reason: "invalid" });
  });

  it("expira 15 minutos depois de emitido", () => {
    const ticket = issueVoteTicket({ kind: "favorite" }, 0);
    expect(verifyVoteTicket(ticket, { kind: "favorite" }, 14 * 60_000).ok).toBe(true);
    expect(verifyVoteTicket(ticket, { kind: "favorite" }, 16 * 60_000)).toEqual({ ok: false, reason: "expired" });
  });
});
