# Blackjack — TODO

Blackjack is straightforward to implement but needs:

- A **shoe model** (commonly 6 or 8 decks) shuffled per round or per N rounds.
  Shuffle index = `nextIntBelow(stream, remaining)` repeatedly (Fisher–Yates).
- **Server-side state machine** for hit/stand/double/split/insurance. Never
  trust client decisions; the API takes one action at a time.
- **Push, BJ pays 3:2 (or 6:5 — disclose), dealer hits soft 17 or stands —
  publish the rule set per table.
- Insurance and side bets are separate ledger entries.
- Card-counting protections (continuous shuffle option, max bet ramps) if you
  offer high stakes.

Suggested file layout:
- `logic.ts` — pure functions (deck, hand value, dealer play)
- `state.ts` — Redis-backed in-progress hand store
- `actions.ts` — `deal`, `hit`, `stand`, `double`, `split`, `insurance`
