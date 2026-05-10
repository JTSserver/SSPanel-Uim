# Casino

Online casino skeleton targeting **Czech Republic** and **Slovakia**.
Crypto + fiat. Provably-fair core. Built on **Next.js 15 + TypeScript +
PostgreSQL (Drizzle) + Redis**.

> ⚠️ This is software scaffolding, **not a turn-key licensed product**.
> Operating real-money gambling in CZ or SK requires a basic licence from
> the relevant regulator (MFČR / ÚRHH), local company presence, RNG
> certification by an accredited lab (GLI / iTech Labs / BMM / Trezor),
> mTLS integration with the regulator's monitoring system (AISG / ÚRHH),
> consultation of the self-exclusion registry on every relevant action,
> AML/KYC, payment partners that support gambling MCCs, and ongoing
> reporting. None of that is in the box; engage local counsel early.

## Layout

```
src/
  app/                      Next.js App Router
    page.tsx                Lobby
    games/dice/             Playable Dice game UI
    api/games/dice/route.ts JSON endpoint for placing dice bets
  server/
    db/                     Drizzle schema + client
    wallet/                 Decimal money + serializable ledger
    rng/                    Provably-fair seed pairs and byte stream
    games/                  Server-side play orchestration
    auth/                   JWT session helpers + playable-gates
    compliance/             AISG, ÚRHH, exclusion registry, RG limits, audit
  games/
    dice/                   Pure dice math (deterministic from seeds)
    slots|blackjack|roulette|crash|plinko/  TODO stubs with design notes
tests/                      Vitest unit tests
drizzle/                    Generated migrations (run db:generate)
```

## Money & ledger

All amounts are stored as `numeric(30, 8)` and handled in code with
`decimal.js`. **Never** convert to a JS `number`. Every change to
`wallets.balance` is paired with an append-only row in `ledger`, written
inside a `SERIALIZABLE` transaction with an `idempotency_key` so retries are
safe. See `src/server/wallet/ledger.ts`.

## Provably fair

For every player, the server commits to a 32-byte server seed by publishing
its SHA-256 hash. Each round, outcome bytes are derived from
`HMAC-SHA256(serverSeed, clientSeed + ":" + nonce)`, with `nonce`
incrementing per round. When the seed pair is rotated (manually or after N
rounds), the plaintext server seed is published so the player can re-derive
every past round and verify it matches `outcome` in `game_rounds`.

See `src/server/rng/provablyFair.ts` and `tests/dice.test.ts` for the
reference implementation and a small RTP smoke test.

## CZ / SK compliance touchpoints

| Concern                  | Where it lives                                    |
| ------------------------ | ------------------------------------------------- |
| Real-time event push     | `compliance/aisg.ts`, `compliance/urhh.ts`        |
| Self-exclusion registry  | `compliance/exclusionRegistry.ts`                 |
| Deposit / loss limits    | `compliance/responsibleGaming.ts`                 |
| Tamper-evident audit     | `compliance/audit.ts` (hash-chained `audit_log`)  |
| Per-round records        | `db/schema.ts` → `game_rounds`                    |
| KYC status               | `db/schema.ts` → `users.kyc_status` + provider id |

The integrations are stubbed; they fail closed in production until you wire
in the regulator endpoints, mTLS certs, and the KYC provider.

## Local dev

```bash
cp .env.example .env
docker run -d --name casino-pg -e POSTGRES_USER=casino -e POSTGRES_PASSWORD=casino \
  -e POSTGRES_DB=casino -p 5432:5432 postgres:16
docker run -d --name casino-redis -p 6379:6379 redis:7
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

Tests:

```bash
npm test
```

## What's intentionally not here

- Authentication UI (login / register flows) — only the JWT helpers are.
- KYC provider integration — pick Sumsub / Veriff / Onfido and wire it.
- Crypto deposit watcher — design is in `db/schema.ts → crypto_deposits` but
  the worker isn't written.
- Withdrawals — needs your AML scoring + manual review queue.
- Slots, Blackjack, Roulette, Crash, Plinko — design notes per game in
  `src/games/<game>/README.md`. Dice is the only playable one.
- Any UI for the marketing site, account area, transaction history,
  responsible-gaming controls, or KYC upload.
- Cron / worker process for seed rotation and AISG/ÚRHH push.

These are the next obvious things to pick up.
