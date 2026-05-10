import DiceClient from "./DiceClient";
import { getSession } from "@/server/auth/session";
import { redirect } from "next/navigation";
import { db, schema } from "@/server/db/client";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function DicePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [wallet] = await db
    .select({ id: schema.wallets.id, balance: schema.wallets.balance, currency: schema.wallets.currency })
    .from(schema.wallets)
    .where(
      and(eq(schema.wallets.userId, session.sub), eq(schema.wallets.currency, "EUR")),
    );

  if (!wallet) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <p className="text-white/70">No EUR wallet found. Make a deposit first.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-8 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Dice</h1>
        <p className="text-white/60 text-sm">House edge 1% • Provably fair</p>
      </header>
      <DiceClient
        walletId={wallet.id}
        currency={wallet.currency}
        initialBalance={wallet.balance}
      />
    </main>
  );
}
