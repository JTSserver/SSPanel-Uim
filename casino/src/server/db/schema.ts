import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  integer,
  bigint,
  boolean,
  pgEnum,
  index,
  uniqueIndex,
  jsonb,
  varchar,
} from "drizzle-orm/pg-core";

// All money is stored as numeric(30, 8). Eight decimals covers BTC sats and is
// more than enough for fiat. Application code must use Decimal.js — never
// JS number — for any arithmetic on these values.

export const currencyEnum = pgEnum("currency", ["EUR", "CZK", "BTC", "ETH", "USDT"]);
export const ledgerKindEnum = pgEnum("ledger_kind", [
  "deposit",
  "withdrawal",
  "bet",
  "payout",
  "bonus",
  "adjustment",
  "fee",
]);
export const kycStatusEnum = pgEnum("kyc_status", [
  "none",
  "pending",
  "verified",
  "rejected",
  "expired",
]);
export const jurisdictionEnum = pgEnum("jurisdiction", ["CZ", "SK"]);
export const gameKindEnum = pgEnum("game_kind", [
  "dice",
  "slots",
  "blackjack",
  "roulette",
  "crash",
  "plinko",
]);
export const roundStatusEnum = pgEnum("round_status", [
  "open",
  "settled",
  "voided",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name"),
    jurisdiction: jurisdictionEnum("jurisdiction").notNull(),
    countryCode: varchar("country_code", { length: 2 }).notNull(),
    dateOfBirth: timestamp("date_of_birth", { withTimezone: true }).notNull(),
    kycStatus: kycStatusEnum("kyc_status").notNull().default("none"),
    kycProviderRef: text("kyc_provider_ref"),
    selfExcludedUntil: timestamp("self_excluded_until", { withTimezone: true }),
    registryExcluded: boolean("registry_excluded").notNull().default(false),
    registryCheckedAt: timestamp("registry_checked_at", { withTimezone: true }),
    depositLimitDaily: numeric("deposit_limit_daily", { precision: 30, scale: 8 }),
    depositLimitMonthly: numeric("deposit_limit_monthly", { precision: 30, scale: 8 }),
    lossLimitDaily: numeric("loss_limit_daily", { precision: 30, scale: 8 }),
    sessionLimitMinutes: integer("session_limit_minutes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailUnique: uniqueIndex("users_email_unique").on(t.email),
    jurisdictionIdx: index("users_jurisdiction_idx").on(t.jurisdiction),
  }),
);

// One wallet row per (user, currency). Balance is the materialized sum of the
// ledger and must only be modified inside a SERIALIZABLE transaction together
// with a balancing ledger entry. See server/wallet/ledger.ts.
export const wallets = pgTable(
  "wallets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    currency: currencyEnum("currency").notNull(),
    balance: numeric("balance", { precision: 30, scale: 8 }).notNull().default("0"),
    locked: numeric("locked", { precision: 30, scale: 8 }).notNull().default("0"),
    version: bigint("version", { mode: "bigint" }).notNull().default(0n),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userCurrencyUnique: uniqueIndex("wallets_user_currency_unique").on(
      t.userId,
      t.currency,
    ),
  }),
);

// Append-only money ledger. Every balance change has a corresponding row.
// idempotencyKey prevents double-posting on retries.
export const ledger = pgTable(
  "ledger",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    walletId: uuid("wallet_id")
      .notNull()
      .references(() => wallets.id, { onDelete: "restrict" }),
    kind: ledgerKindEnum("kind").notNull(),
    amount: numeric("amount", { precision: 30, scale: 8 }).notNull(),
    balanceAfter: numeric("balance_after", { precision: 30, scale: 8 }).notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    refTable: text("ref_table"),
    refId: uuid("ref_id"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    walletIdx: index("ledger_wallet_idx").on(t.walletId, t.createdAt),
    idempotencyUnique: uniqueIndex("ledger_idempotency_unique").on(t.idempotencyKey),
    refIdx: index("ledger_ref_idx").on(t.refTable, t.refId),
  }),
);

// Provably-fair: server publishes hash of seed BEFORE play; reveals seed after
// rotation. Each round increments nonce. Client seed is user-supplied.
export const seedPairs = pgTable(
  "seed_pairs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    serverSeed: text("server_seed"),
    serverSeedHash: text("server_seed_hash").notNull(),
    clientSeed: text("client_seed").notNull(),
    nonce: bigint("nonce", { mode: "bigint" }).notNull().default(0n),
    activatedAt: timestamp("activated_at", { withTimezone: true }).notNull().defaultNow(),
    revealedAt: timestamp("revealed_at", { withTimezone: true }),
  },
  (t) => ({
    userIdx: index("seed_pairs_user_idx").on(t.userId, t.activatedAt),
  }),
);

export const gameRounds = pgTable(
  "game_rounds",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    walletId: uuid("wallet_id")
      .notNull()
      .references(() => wallets.id, { onDelete: "restrict" }),
    game: gameKindEnum("game").notNull(),
    status: roundStatusEnum("status").notNull().default("open"),
    seedPairId: uuid("seed_pair_id")
      .notNull()
      .references(() => seedPairs.id, { onDelete: "restrict" }),
    nonce: bigint("nonce", { mode: "bigint" }).notNull(),
    bet: numeric("bet", { precision: 30, scale: 8 }).notNull(),
    payout: numeric("payout", { precision: 30, scale: 8 }).notNull().default("0"),
    multiplier: numeric("multiplier", { precision: 20, scale: 8 }).notNull().default("0"),
    params: jsonb("params").notNull(),
    outcome: jsonb("outcome"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    settledAt: timestamp("settled_at", { withTimezone: true }),
  },
  (t) => ({
    userIdx: index("game_rounds_user_idx").on(t.userId, t.startedAt),
    gameIdx: index("game_rounds_game_idx").on(t.game, t.startedAt),
  }),
);

// Crypto deposit watcher state. The deposit watcher writes here when it
// observes confirmed on-chain transfers to the user's deposit address.
export const cryptoDeposits = pgTable(
  "crypto_deposits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    currency: currencyEnum("currency").notNull(),
    address: text("address").notNull(),
    txHash: text("tx_hash").notNull(),
    amount: numeric("amount", { precision: 30, scale: 8 }).notNull(),
    confirmations: integer("confirmations").notNull().default(0),
    creditedLedgerId: uuid("credited_ledger_id").references(() => ledger.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    txUnique: uniqueIndex("crypto_deposits_tx_unique").on(t.txHash, t.address),
  }),
);

// Audit log for regulator reporting. Every state-changing event a regulator
// might ask about gets a row here, with a hash chain for tamper evidence.
export const auditLog = pgTable(
  "audit_log",
  {
    id: bigint("id", { mode: "bigint" }).generatedAlwaysAsIdentity().primaryKey(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    actorUserId: uuid("actor_user_id"),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull(),
    prevHash: text("prev_hash").notNull(),
    hash: text("hash").notNull(),
  },
  (t) => ({
    occurredIdx: index("audit_log_occurred_idx").on(t.occurredAt),
    eventIdx: index("audit_log_event_idx").on(t.eventType),
  }),
);
