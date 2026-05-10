# Slots — TODO

Slots are the most regulated of the games on the roadmap. **Do not build a
production slot in-house unless you have an accredited lab certifying the
math.** It's almost always faster and cheaper to integrate a licensed game
aggregator (Pragmatic Play, Hacksaw, Relax, Evolution, etc.) instead.

If you do build in-house, the minimum is:

- Mathematical model (paytable, reel strips, RTP, hit frequency, volatility)
  reviewed by an accredited lab — for CZ that's **Trezor**, **MFČR**-approved
  testing labs, or international equivalents (GLI, BMM, iTech Labs); SK uses
  the same set of accredited labs registered with **ÚRHH**.
- Server-authoritative spin: client never determines the outcome. Use
  `server/rng/provablyFair.ts` to draw reel positions.
- Per-spin round records in `game_rounds` with full reel positions in `outcome`
  so anyone can audit any spin.
- Theoretical RTP must be displayed on the game lobby page (CZ requirement).
- Free-spin bonus rounds need their own ledger entries with `kind = 'bonus'`.

Until then, this folder is a placeholder.
