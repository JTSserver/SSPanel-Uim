import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/server/db/client";
import { fromDb, toDb, type Money, ZERO } from "./money";

export type LedgerKind = (typeof schema.ledgerKindEnum.enumValues)[number];

export interface PostEntryInput {
  walletId: string;
  kind: LedgerKind;
  // Signed amount: positive credits the wallet, negative debits it.
  amount: Money;
  idempotencyKey: string;
  ref?: { table: string; id: string };
  metadata?: Record<string, unknown>;
}

export class InsufficientFundsError extends Error {
  constructor() {
    super("insufficient funds");
    this.name = "InsufficientFundsError";
  }
}

export class IdempotencyConflictError extends Error {
  constructor(key: string) {
    super(`ledger entry already exists for idempotency key ${key}`);
    this.name = "IdempotencyConflictError";
  }
}

// postEntry runs a single balance change inside a SERIALIZABLE transaction.
// Callers that need multiple coordinated entries (e.g. bet + payout in one
// atomic step) should use postEntries.
export async function postEntries(entries: PostEntryInput[]): Promise<void> {
  if (entries.length === 0) return;

  await db.transaction(
    async (tx) => {
      // Postgres needs the isolation level set on the transaction itself.
      await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`);

      // Idempotency: if every key has already been posted, no-op. If some are
      // posted and some are not, that's a programmer error — fail loudly.
      const keys = entries.map((e) => e.idempotencyKey);
      const existing = await tx
        .select({ key: schema.ledger.idempotencyKey })
        .from(schema.ledger)
        .where(sql`${schema.ledger.idempotencyKey} = ANY(${keys})`);
      if (existing.length === entries.length) return;
      if (existing.length > 0) {
        throw new IdempotencyConflictError(existing[0]!.key);
      }

      for (const entry of entries) {
        const [wallet] = await tx
          .select()
          .from(schema.wallets)
          .where(eq(schema.wallets.id, entry.walletId))
          .for("update");
        if (!wallet) throw new Error(`wallet ${entry.walletId} not found`);

        const balance = fromDb(wallet.balance);
        const next = balance.plus(entry.amount);
        if (next.isNegative()) throw new InsufficientFundsError();

        await tx
          .update(schema.wallets)
          .set({
            balance: toDb(next),
            version: wallet.version + 1n,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(schema.wallets.id, wallet.id),
              eq(schema.wallets.version, wallet.version),
            ),
          );

        await tx.insert(schema.ledger).values({
          walletId: wallet.id,
          kind: entry.kind,
          amount: toDb(entry.amount),
          balanceAfter: toDb(next),
          idempotencyKey: entry.idempotencyKey,
          refTable: entry.ref?.table ?? null,
          refId: entry.ref?.id ?? null,
          metadata: entry.metadata ?? null,
        });
      }
    },
    { isolationLevel: "serializable" },
  );
}

export async function getBalance(walletId: string): Promise<Money> {
  const [wallet] = await db
    .select({ balance: schema.wallets.balance })
    .from(schema.wallets)
    .where(eq(schema.wallets.id, walletId));
  return wallet ? fromDb(wallet.balance) : ZERO;
}
