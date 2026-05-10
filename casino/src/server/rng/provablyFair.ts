import { createHash, createHmac, randomBytes } from "node:crypto";

// Provably-fair scheme:
//
//   1. Server generates a random server seed S and publishes hash H = sha256(S)
//      to the player BEFORE play. The plaintext S is kept secret.
//   2. Player submits a client seed C (any string they choose).
//   3. For each round, server computes:
//          digest = HMAC-SHA256(key = S, msg = "<C>:<nonce>")
//      and consumes bytes from `digest` to derive the outcome. nonce starts at
//      0 and increments per round.
//   4. When the seed pair is rotated, the server publishes S. The player can
//      verify sha256(S) matches the previously committed H, then re-derive
//      every past round to confirm fairness.

export interface SeedTriple {
  serverSeed: string;
  clientSeed: string;
  nonce: bigint;
}

export function generateServerSeed(): string {
  return randomBytes(32).toString("hex");
}

export function hashServerSeed(serverSeed: string): string {
  return createHash("sha256").update(serverSeed, "utf8").digest("hex");
}

// Returns a generator of uniformly distributed bytes for a single round. Games
// pull as many bytes as they need; rolling out of bytes triggers a rehash with
// an incrementing cursor so we never re-use bytes.
export function* roundByteStream(seeds: SeedTriple): Generator<number> {
  let cursor = 0;
  while (true) {
    const msg = `${seeds.clientSeed}:${seeds.nonce.toString()}:${cursor}`;
    const digest = createHmac("sha256", seeds.serverSeed).update(msg, "utf8").digest();
    for (const b of digest) yield b;
    cursor += 1;
  }
}

// Convert the next 4 bytes from the stream into a uniform float in [0, 1).
export function nextUnitFloat(stream: Generator<number>): number {
  const b0 = stream.next().value as number;
  const b1 = stream.next().value as number;
  const b2 = stream.next().value as number;
  const b3 = stream.next().value as number;
  // 32-bit unsigned divided by 2^32. Slight bias is below 1 ULP and well below
  // any house-edge threshold a regulator would care about.
  const n = ((b0 << 24) >>> 0) + (b1 << 16) + (b2 << 8) + b3;
  return n / 0x1_0000_0000;
}

// Uniform integer in [0, max) without modulo bias. Used by slots, blackjack,
// roulette wheel index, plinko bucket, etc.
export function nextIntBelow(stream: Generator<number>, max: number): number {
  if (max <= 0 || !Number.isInteger(max)) {
    throw new Error("nextIntBelow: max must be a positive integer");
  }
  // Rejection sampling against the largest multiple of `max` that fits in 2^32.
  const limit = Math.floor(0x1_0000_0000 / max) * max;
  while (true) {
    const b0 = stream.next().value as number;
    const b1 = stream.next().value as number;
    const b2 = stream.next().value as number;
    const b3 = stream.next().value as number;
    const n = ((b0 << 24) >>> 0) + (b1 << 16) + (b2 << 8) + b3;
    if (n < limit) return n % max;
  }
}
