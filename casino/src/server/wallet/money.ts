import Decimal from "decimal.js";

// Money is represented in code as Decimal. Storage is numeric(30, 8) text.
// Never use the JS Number type for money — it will silently lose precision
// at amounts you'll see in production.

Decimal.set({ precision: 38, rounding: Decimal.ROUND_DOWN });

export type Money = Decimal;

export const ZERO: Money = new Decimal(0);

export function money(value: string | number | Decimal): Money {
  const d = new Decimal(value);
  if (!d.isFinite()) throw new Error("non-finite money");
  return d;
}

export function fromDb(value: string): Money {
  return new Decimal(value);
}

export function toDb(value: Money): string {
  return value.toFixed(8);
}

export function gte(a: Money, b: Money): boolean {
  return a.gte(b);
}

export function isPositive(a: Money): boolean {
  return a.gt(0);
}
