# Roulette — TODO

Roulette is the simplest of the table games to model:

- European wheel: 0–36, house edge ≈ 2.7% on every bet.
- American wheel: adds 00, house edge ≈ 5.26%. Don't ship this for EU
  operations — single-zero is what players expect.
- Spin = `nextIntBelow(stream, 37)` for European.
- Bet types: straight, split, street, corner, line, column, dozen, red/black,
  odd/even, high/low. Validate each bet's slot mask, then payout from a fixed
  table.
- Multiple players can bet on a single spin if you do shared-table mode.

Implementation order:
1. `wheel.ts` — wheel definition + spin function.
2. `bets.ts` — bet validators and payout table.
3. `logic.ts` — composes the above into a single `play()` like dice.
