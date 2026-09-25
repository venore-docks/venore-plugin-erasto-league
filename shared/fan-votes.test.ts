import { describe, expect, it } from "vitest";
import {
  buildAuditGroups,
  classifyAuditGroup,
  computeVoteShares,
  isVoteWindowOpen,
  normalizeIpForGrouping,
  pickClientIp,
  resolveMatchVoteWindow,
  type AuditVoteRow,
} from "./fan-votes";

const HOUR = 60 * 60 * 1000;
const START = Date.UTC(2026, 8, 25, 13, 0);

describe("resolveMatchVoteWindow / isVoteWindowOpen", () => {
  it("partida em andamento: abre no apito inicial e não tem hora pra fechar", () => {
    const window = resolveMatchVoteWindow({ status: "in_progress", startedAt: START, finishedAt: null }, 48);
    expect(window).toEqual({ opensAt: START, closesAt: null });
    expect(isVoteWindowOpen(window, START - 1)).toBe(false);
    expect(isVoteWindowOpen(window, START)).toBe(true);
    expect(isVoteWindowOpen(window, START + 500 * HOUR)).toBe(true);
  });

  it("partida encerrada: fecha N horas depois do fim", () => {
    const finishedAt = START + 25 * 60 * 1000;
    const window = resolveMatchVoteWindow({ status: "finished", startedAt: START, finishedAt }, 48);
    expect(window?.closesAt).toBe(finishedAt + 48 * HOUR);
    expect(isVoteWindowOpen(window, finishedAt + 47 * HOUR)).toBe(true);
    expect(isVoteWindowOpen(window, finishedAt + 48 * HOUR)).toBe(false);
  });

  it("súmula manual sem finishedAt usa o início como fim", () => {
    const window = resolveMatchVoteWindow({ status: "finished", startedAt: START, finishedAt: null }, 2);
    expect(window?.closesAt).toBe(START + 2 * HOUR);
  });

  it("partida cancelada nunca abre", () => {
    const window = resolveMatchVoteWindow({ status: "cancelled", startedAt: START, finishedAt: null }, 48);
    expect(window).toBeNull();
    expect(isVoteWindowOpen(window, START)).toBe(false);
  });
});

describe("computeVoteShares", () => {
  it("percentuais inteiros somam exatamente 100", () => {
    const shares = computeVoteShares([
      { id: "a", votes: 1 },
      { id: "b", votes: 1 },
      { id: "c", votes: 1 },
    ]);
    expect(shares.reduce((sum, share) => sum + share.percent, 0)).toBe(100);
    expect(shares.map((share) => share.percent).sort()).toEqual([33, 33, 34]);
  });

  it("ordena do mais votado pro menos votado, estável no empate, e ignora zero voto", () => {
    const shares = computeVoteShares([
      { id: "a", votes: 2 },
      { id: "zero", votes: 0 },
      { id: "b", votes: 5 },
      { id: "c", votes: 2 },
    ]);
    expect(shares.map((share) => share.id)).toEqual(["b", "a", "c"]);
    expect(shares.map((share) => share.percent)).toEqual([56, 22, 22]);
  });

  it("sem voto nenhum devolve lista vazia", () => {
    expect(computeVoteShares([{ id: "a", votes: 0 }])).toEqual([]);
    expect(computeVoteShares([])).toEqual([]);
  });
});

describe("normalizeIpForGrouping", () => {
  it("mantém IPv4 e tira porta", () => {
    expect(normalizeIpForGrouping("189.10.20.30")).toBe("189.10.20.30");
    expect(normalizeIpForGrouping("189.10.20.30:5123")).toBe("189.10.20.30");
    expect(normalizeIpForGrouping("::ffff:189.10.20.30")).toBe("189.10.20.30");
  });

  it("agrupa IPv6 pelo /64 (mesma casa girando o sufixo cai no mesmo grupo)", () => {
    const a = normalizeIpForGrouping("2804:14c:5b80:8a1b:1111:2222:3333:4444");
    const b = normalizeIpForGrouping("2804:14c:5b80:8a1b:aaaa:bbbb:cccc:dddd");
    expect(a).toBe("2804:14c:5b80:8a1b::/64");
    expect(b).toBe(a);
    expect(normalizeIpForGrouping("2001:db8::1")).toBe("2001:db8:0:0::/64");
    expect(normalizeIpForGrouping("[2001:0db8:0000:0001::5]:443")).toBe("2001:db8:0:1::/64");
  });

  it("lixo vira null", () => {
    expect(normalizeIpForGrouping("")).toBeNull();
    expect(normalizeIpForGrouping(null)).toBeNull();
    expect(normalizeIpForGrouping("unknown")).toBeNull();
  });
});

describe("pickClientIp", () => {
  it("prefere x-real-ip e cai pro primeiro de x-forwarded-for", () => {
    expect(pickClientIp("1.1.1.1", "2.2.2.2, 3.3.3.3")).toBe("1.1.1.1");
    expect(pickClientIp(null, "2.2.2.2, 3.3.3.3")).toBe("2.2.2.2");
    expect(pickClientIp(" ", null)).toBeNull();
  });
});

describe("buildAuditGroups", () => {
  function vote(ipHash: string | null, uaHash: string, choiceId: string, minute: number, voided = false): AuditVoteRow {
    return { ipHash, uaHash, choiceId, createdAt: START + minute * 60_000, voided };
  }

  it("mesmo IP e mesmo navegador votando muito = suspeito; navegadores variados = atenção; pouco voto fica de fora", () => {
    const rows: AuditVoteRow[] = [
      ...Array.from({ length: 9 }, (_, index) => vote("ip-farm", "ua-1", index < 8 ? "fulano" : "ciclano", index, index === 0)),
      ...Array.from({ length: 6 }, (_, index) => vote("ip-escola", `ua-${index}`, "beltrano", index)),
      vote("ip-casa", "ua-x", "fulano", 1),
      vote("ip-casa", "ua-y", "fulano", 2),
      vote(null, "ua-z", "fulano", 3),
    ];

    const groups = buildAuditGroups(rows);
    expect(groups.map((group) => group.ipHash)).toEqual(["ip-farm", "ip-escola"]);

    const [farm, school] = groups;
    expect(farm).toMatchObject({
      level: "suspect",
      totalVotes: 9,
      activeVotes: 8,
      voidedVotes: 1,
      browsers: 1,
      topChoiceId: "fulano",
      topChoiceVotes: 8,
      firstAt: START,
      lastAt: START + 8 * 60_000,
    });
    expect(school).toMatchObject({ level: "watch", totalVotes: 6, browsers: 6 });
  });

  it("classifyAuditGroup: abaixo de 5 votos nunca marca", () => {
    expect(classifyAuditGroup(4, 1)).toBe("none");
    expect(classifyAuditGroup(5, 1)).toBe("suspect");
    expect(classifyAuditGroup(6, 2)).toBe("suspect");
    expect(classifyAuditGroup(6, 3)).toBe("watch");
  });
});
