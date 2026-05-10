import { eq } from "drizzle-orm";
import Decimal from "decimal.js";
import { db, schema } from "@/server/db/client";
import { fromDb, type Money } from "@/server/wallet/money";

// Responsible-gaming gates that must be checked before accepting a deposit
// or a wager. Both CZ and SK require the operator to honour player-set
// limits and to enforce a registered cool-off period.

export interface DepositCheckArgs {
  userId: string;
  amount: Money;
  currency: "EUR" | "CZK" | "BTC" | "ETH" | "USDT";
}

export interface DepositCheckResult {
  allowed: boolean;
  reason?: string;
}

export async function canDeposit(args: DepositCheckArgs): Promise<DepositCheckResult> {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, args.userId));
  if (!user) return { allowed: false, reason: "user_not_found" };

  if (user.selfExcludedUntil && user.selfExcludedUntil > new Date()) {
    return { allowed: false, reason: "self_excluded" };
  }
  if (user.registryExcluded) {
    return { allowed: false, reason: "registry_excluded" };
  }
  if (user.kycStatus !== "verified") {
    return { allowed: false, reason: "kyc_required" };
  }

  // TODO: roll up daily / monthly deposit totals from the ledger and compare
  // against user.depositLimitDaily / depositLimitMonthly. Convert across
  // currencies via a snapshotted FX rate table.
  void args.amount;
  void args.currency;

  return { allowed: true };
}

export function defaultLimitsForJurisdiction(j: "CZ" | "SK"): {
  depositMonthly: Money;
} {
  // Both jurisdictions allow players to set their own limits at any value, but
  // the operator must offer a sane default. These are placeholders — confirm
  // current statutory minima with counsel before going live.
  return j === "CZ"
    ? { depositMonthly: new Decimal(50_000) } // CZK
    : { depositMonthly: new Decimal(2_000) }; // EUR
}

void fromDb;
