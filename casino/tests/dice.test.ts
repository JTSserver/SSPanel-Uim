import { describe, expect, it } from "vitest";
import Decimal from "decimal.js";
import { play, multiplierFor, winChance } from "../src/games/dice/logic";
import { generateServerSeed, hashServerSeed } from "../src/server/rng/provablyFair";

describe("dice math", () => {
  it("win chance over 50 is 50%", () => {
    expect(winChance(new Decimal(50), "over").toFixed(4)).toBe("0.5000");
  });

  it("multiplier × win chance = 1 - house edge", () => {
    const target = new Decimal(50);
    const m = multiplierFor(target, "over");
    const c = winChance(target, "over");
    expect(m.times(c).toFixed(4)).toBe("0.9900");
  });

  it("is deterministic for the same seeds + nonce", () => {
    const serverSeed = generateServerSeed();
    const params = { target: "50", side: "over" as const };
    const a = play({ serverSeed, clientSeed: "abc", nonce: 1n, bet: new Decimal(1), params });
    const b = play({ serverSeed, clientSeed: "abc", nonce: 1n, bet: new Decimal(1), params });
    expect(a.outcome.roll).toBe(b.outcome.roll);
    expect(a.outcome.win).toBe(b.outcome.win);
  });

  it("seed hash is recoverable from plaintext", () => {
    const s = generateServerSeed();
    expect(hashServerSeed(s)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("dice RTP smoke test", () => {
  it("converges near 0.99 over many rounds", () => {
    const serverSeed = generateServerSeed();
    let staked = new Decimal(0);
    let returned = new Decimal(0);
    for (let i = 0; i < 5000; i++) {
      const bet = new Decimal(1);
      staked = staked.plus(bet);
      const r = play({
        serverSeed,
        clientSeed: "rtp-test",
        nonce: BigInt(i),
        bet,
        params: { target: "50", side: "over" },
      });
      returned = returned.plus(r.payout);
    }
    const rtp = returned.div(staked).toNumber();
    expect(rtp).toBeGreaterThan(0.93);
    expect(rtp).toBeLessThan(1.05);
  });
});
