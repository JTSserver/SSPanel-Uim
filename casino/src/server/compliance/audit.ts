import { createHash } from "node:crypto";
import { desc } from "drizzle-orm";
import { db, schema } from "@/server/db/client";

// Tamper-evident audit log: each row's hash chains the previous hash. A
// regulator (or your own integrity checker) can replay the chain and detect
// any retroactive edits. This is required in spirit by both CZ and SK rules
// for any system-of-record event a regulator might audit.

function hash(prevHash: string, eventType: string, payload: unknown): string {
  return createHash("sha256")
    .update(prevHash)
    .update("\n")
    .update(eventType)
    .update("\n")
    .update(JSON.stringify(payload))
    .digest("hex");
}

export async function appendAudit(args: {
  userId?: string;
  eventType: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const [last] = await tx
      .select({ hash: schema.auditLog.hash })
      .from(schema.auditLog)
      .orderBy(desc(schema.auditLog.id))
      .limit(1);
    const prev = last?.hash ?? "GENESIS";
    const h = hash(prev, args.eventType, args.payload);
    await tx.insert(schema.auditLog).values({
      actorUserId: args.userId ?? null,
      eventType: args.eventType,
      payload: args.payload,
      prevHash: prev,
      hash: h,
    });
  });
}
