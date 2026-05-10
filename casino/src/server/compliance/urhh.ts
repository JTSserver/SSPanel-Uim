// ÚRHH = Úrad pre reguláciu hazardných hier (Slovak gambling regulator).
//
// Slovak Act 30/2019 Z.z. requires online operators to provide ÚRHH with
// real-time access to player accounts, transactions, and game logs. The
// integration is similar in spirit to the Czech AISG but uses the
// Slovak-specific specification published by ÚRHH.
//
// Same architecture as compliance/aisg.ts: audit_log is the source of truth,
// a worker pushes to ÚRHH with retries, and reconciliation re-runs anything
// not acknowledged.

export interface URHHEnvelope {
  operatorId: string;
  eventType: string;
  occurredAt: string;
  payload: Record<string, unknown>;
}

export async function pushToURHH(_envelope: URHHEnvelope): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("ÚRHH integration not configured");
  }
}
