import Decimal from "decimal.js";
import { nextUnitFloat, roundByteStream } from "@/server/rng/provablyFair";

// Dice rules:
//   - Player picks a target in (0, 100) and a side (over | under).
//   - Server rolls a uniform float r in [0, 100).
//   - "over"  wins if r >  target; "under" wins if r <  target.
//   - Win chance = (100 - target) / 100  for "over", target / 100 for "under".
//   - Multiplier = (1 - house_edge) / win_chance, paid on the bet.
//
// House edge is configurable; 1% is standard for crypto dice. Adjust per the
// licence terms — both CZ and SK regulators require the theoretical RTP
// (return-to-player) to be displayed and not exceeded.

export const HOUSE_EDGE = new Decimal("0.01");
export const MIN_TARGET = new Decimal("0.01");
export const MAX_TARGET = new Decimal("99.99");

export type Side = "over" | "under";

export interface DiceParams {
  target: string;
  side: Side;
}

export interface DiceOutcome {
  roll: string;
  win: boolean;
  multiplier: string;
  winChance: string;
}

export function validateParams(p: DiceParams): { target: Decimal; side: Side } {
  const target = new Decimal(p.target);
  if (!target.isFinite() || target.lt(MIN_TARGET) || target.gt(MAX_TARGET)) {
    throw new Error(`target must be in [${MIN_TARGET}, ${MAX_TARGET}]`);
  }
  if (p.side !== "over" && p.side !== "under") {
    throw new Error("side must be 'over' or 'under'");
  }
  return { target, side: p.side };
}

export function winChance(target: Decimal, side: Side): Decimal {
  return side === "over"
    ? new Decimal(100).minus(target).div(100)
    : target.div(100);
}

export function multiplierFor(target: Decimal, side: Side): Decimal {
  const chance = winChance(target, side);
  if (chance.lte(0)) throw new Error("win chance is zero");
  return new Decimal(1).minus(HOUSE_EDGE).div(chance);
}

export function play(args: {
  serverSeed: string;
  clientSeed: string;
  nonce: bigint;
  bet: Decimal;
  params: DiceParams;
}): { outcome: DiceOutcome; payout: Decimal; multiplier: Decimal } {
  const { target, side } = validateParams(args.params);
  const stream = roundByteStream({
    serverSeed: args.serverSeed,
    clientSeed: args.clientSeed,
    nonce: args.nonce,
  });
  const roll = new Decimal(nextUnitFloat(stream)).times(100);
  const win = side === "over" ? roll.gt(target) : roll.lt(target);
  const multiplier = multiplierFor(target, side);
  const payout = win ? args.bet.times(multiplier) : new Decimal(0);
  return {
    outcome: {
      roll: roll.toFixed(4),
      win,
      multiplier: multiplier.toFixed(4),
      winChance: winChance(target, side).times(100).toFixed(4),
    },
    payout,
    multiplier,
  };
}
