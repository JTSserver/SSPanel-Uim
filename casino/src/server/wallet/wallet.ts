import { and, eq } from "drizzle-orm";
import { db, schema } from "@/server/db/client";
import { fromDb, type Money, toDb } from "./money";
import { postEntries } from "./ledger";

export type Currency = (typeof schema.currencyEnum.enumValues)[number];

export async function getOrCreateWallet(
  userId: string,
  currency: Currency,
): Promise<{ id: string; balance: Money }> {
  const existing = await db
    .select()
    .from(schema.wallets)
    .where(
      and(eq(schema.wallets.userId, userId), eq(schema.wallets.currency, currency)),
    );
  if (existing[0]) {
    return { id: existing[0].id, balance: fromDb(existing[0].balance) };
  }
  const [created] = await db
    .insert(schema.wallets)
    .values({ userId, currency, balance: toDb(fromDb("0")) })
    .returning();
  return { id: created!.id, balance: fromDb(created!.balance) };
}

// settleRound atomically debits the bet and credits the payout in a single
// serializable transaction, keyed by the round id. Calling it twice for the
// same round is a no-op.
export async function settleRound(args: {
  walletId: string;
  roundId: string;
  bet: Money;
  payout: Money;
}): Promise<void> {
  const { walletId, roundId, bet, payout } = args;
  const ref = { table: "game_rounds", id: roundId };
  await postEntries([
    {
      walletId,
      kind: "bet",
      amount: bet.negated(),
      idempotencyKey: `round:${roundId}:bet`,
      ref,
    },
    {
      walletId,
      kind: "payout",
      amount: payout,
      idempotencyKey: `round:${roundId}:payout`,
      ref,
    },
  ]);
}
