# Crash — TODO

Crash is provably-fair-friendly and a good second game to ship after Dice.

Standard formulation:

```
h = hmac_sha256(serverSeed, clientSeed + ":" + nonce)
e = first 52 bits of h
if (e % 33 == 0) crash_at = 1.00       # instant-bust house edge
else             crash_at = floor((100 * 2^52 - e) / (2^52 - e)) / 100
```

This produces a 1/33 ≈ 3% house edge and a heavy-tailed multiplier
distribution that tops out very high.

Notes:
- Crash needs **real-time pubsub** (Redis pub/sub or websockets) to broadcast
  the multiplier curve to all watchers and to accept cash-out events.
- A round is a multi-second event with many concurrent players. Each player
  has their own `game_rounds` row referencing the shared `crash_round` id.
- Cash-out is server-authoritative: the server records "cashed out at X" only
  if the broadcast multiplier was at least X at the moment of the request.
- Bet phase ends a few seconds before the curve starts; no late entries.
