import { z } from "zod";
import { eq } from "drizzle-orm";
import Decimal from "decimal.js";
import { db, schema } from "@/server/db/client";
import { consumeNextNonce } from "@/server/rng/seedService";
import { settleRound } from "@/server/wallet/wallet";
import { fromDb, toDb } from "@/server/wallet/money";
import { play as playDice } from "@/games/dice/logic";
import { appendAudit } from "@/server/compliance/audit";

export const PlayDiceInput = z.object({
  walletId: z.string().uuid(),
  bet: z.string().regex(/^\d+(\.\d{1,8})?$/),
  clientSeed: z.string().min(1).max(128),
  params: z.object({
    target: z.string(),
    side: z.enum(["over", "under"]),
  }),
});
export type PlayDiceInput = z.infer<typeof PlayDiceInput>;

export interface PlayResult {
  roundId: string;
  serverSeedHash: string;
  nonce: string;
  outcome: unknown;
  payout: string;
  newBalance: string;
}

export async function playDiceRound(
  userId: string,
  input: PlayDiceInput,
): Promise<PlayResult> {
  const bet = new Decimal(input.bet);
  if (bet.lte(0)) throw new Error("bet must be positive");

  // Verify the wallet belongs to the user before touching it.
  const [wallet] = await db
    .select()
    .from(schema.wallets)
    .where(eq(schema.wallets.id, input.walletId));
  if (!wallet || wallet.userId !== userId) throw new Error("wallet not found");

  const seed = await consumeNextNonce({
    userId,
    clientSeed: input.clientSeed,
  });

  const { outcome, payout, multiplier } = playDice({
    serverSeed: seed.serverSeed,
    clientSeed: input.clientSeed,
    nonce: seed.nonce,
    bet,
    params: input.params,
  });

  const [round] = await db
    .insert(schema.gameRounds)
    .values({
      userId,
      walletId: input.walletId,
      game: "dice",
      status: "settled",
      seedPairId: seed.seedPairId,
      nonce: seed.nonce,
      bet: toDb(bet),
      payout: toDb(payout),
      multiplier: multiplier.toFixed(8),
      params: input.params,
      outcome,
      settledAt: new Date(),
    })
    .returning();

  await settleRound({
    walletId: input.walletId,
    roundId: round!.id,
    bet,
    payout,
  });

  await appendAudit({
    userId,
    eventType: "round.settled",
    payload: {
      game: "dice",
      roundId: round!.id,
      bet: toDb(bet),
      payout: toDb(payout),
      seedPairId: seed.seedPairId,
      nonce: seed.nonce.toString(),
      serverSeedHash: seed.serverSeedHash,
    },
  });

  const [updatedWallet] = await db
    .select({ balance: schema.wallets.balance })
    .from(schema.wallets)
    .where(eq(schema.wallets.id, input.walletId));

  return {
    roundId: round!.id,
    serverSeedHash: seed.serverSeedHash,
    nonce: seed.nonce.toString(),
    outcome,
    payout: toDb(payout),
    newBalance: updatedWallet ? toDb(fromDb(updatedWallet.balance)) : "0",
  };
}
