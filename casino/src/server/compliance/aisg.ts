// AISG = Automatický informační systém správy hazardních her
// (Czech Ministry of Finance regulator integration).
//
// Operators are required to push real-time data covering:
//   - Player registrations and KYC status changes
//   - Deposits, withdrawals, balance corrections
//   - Each game round (with stake, payout, game id)
//   - Self-exclusion events
//   - Session open/close and session length
//
// Spec is published by MFČR; integration uses signed XML over HTTPS with
// per-operator client certificates. Late or missing reports trigger fines.
//
// Architecture:
//   - We persist every event to `audit_log` first (source of truth, hash-chained).
//   - A worker drains audit_log -> AISG, with retries and a dead-letter queue.
//   - Reconciliation job re-pushes anything older than N minutes that AISG
//     hasn't acknowledged.

export interface AISGEnvelope {
  operatorId: string;
  eventType: string;
  occurredAt: string;
  payload: Record<string, unknown>;
}

export async function pushToAISG(_envelope: AISGEnvelope): Promise<void> {
  // TODO: implement signed POST to CZ_AISG_ENDPOINT with mTLS using
  // CZ_AISG_CERT_PATH. Until then, no-op in dev; throw in prod.
  if (process.env.NODE_ENV === "production") {
    throw new Error("AISG integration not configured");
  }
}
