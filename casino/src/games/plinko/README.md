# Plinko — TODO

Plinko is simple math but needs careful tuning so the published RTP matches.

- Pick rows R (commonly 8–16) and risk level (low/medium/high). Each risk
  level has its own bucket-multiplier vector, computed offline so that
  `sum(P(bucket_k) * multiplier_k) = 1 - house_edge`.
- The ball's path is R independent left/right choices: `nextIntBelow(stream, 2)`.
- Final bucket index = number of "right" choices.
- Multiply bet by `multipliers[bucket]`.

The animation is purely cosmetic — the server picks the bucket from the seed,
and the client renders a deterministic path that ends in that bucket.
