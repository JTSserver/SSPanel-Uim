import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/server/db/client";
import { generateServerSeed, hashServerSeed } from "./provablyFair";

// Returns the current active seed pair for a user, creating one if missing,
// and atomically increments the nonce. The seed pair represents a commitment
// the user can verify after rotation. The plaintext server seed is never
// returned to the client until rotation.
export async function consumeNextNonce(args: {
  userId: string;
  clientSeed: string;
}): Promise<{
  seedPairId: string;
  nonce: bigint;
  serverSeed: string;
  serverSeedHash: string;
}> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(schema.seedPairs)
      .where(
        and(
          eq(schema.seedPairs.userId, args.userId),
          isNull(schema.seedPairs.revealedAt),
        ),
      )
      .orderBy(desc(schema.seedPairs.activatedAt))
      .for("update");

    let pair = existing;
    if (!pair || pair.clientSeed !== args.clientSeed) {
      // Different client seed (or first round) means we open a fresh commit.
      // Rotate the previous pair if its client seed differs so the player can
      // change their seed mid-session and still verify history.
      if (pair) {
        await tx
          .update(schema.seedPairs)
          .set({ revealedAt: new Date() })
          .where(eq(schema.seedPairs.id, pair.id));
      }
      const serverSeed = generateServerSeed();
      const [created] = await tx
        .insert(schema.seedPairs)
        .values({
          userId: args.userId,
          serverSeed,
          serverSeedHash: hashServerSeed(serverSeed),
          clientSeed: args.clientSeed,
          nonce: 0n,
        })
        .returning();
      pair = created!;
    }

    const nextNonce = pair.nonce + 1n;
    await tx
      .update(schema.seedPairs)
      .set({ nonce: nextNonce })
      .where(eq(schema.seedPairs.id, pair.id));

    return {
      seedPairId: pair.id,
      nonce: pair.nonce,
      serverSeed: pair.serverSeed!,
      serverSeedHash: pair.serverSeedHash,
    };
  });
}

// Reveal the current seed pair on demand. After reveal, future rounds open a
// new pair. Use this when a player asks for an integrity check.
export async function rotateActiveSeed(userId: string): Promise<void> {
  await db
    .update(schema.seedPairs)
    .set({ revealedAt: new Date() })
    .where(
      and(eq(schema.seedPairs.userId, userId), isNull(schema.seedPairs.revealedAt)),
    );
}

// Auto-rotate after N rounds. Call from a periodic worker.
export async function rotateSeedsExceedingRounds(maxRounds: bigint): Promise<number> {
  const result = await db.execute(sql`
    UPDATE seed_pairs
       SET revealed_at = now()
     WHERE revealed_at IS NULL
       AND nonce >= ${maxRounds}
  `);
  return result.count ?? 0;
}
