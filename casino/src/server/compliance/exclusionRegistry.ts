// Self-exclusion registry checks. Both CZ and SK operate central registries
// of self-excluded persons that licenced operators MUST consult before
// allowing a player to register, deposit, or wager.
//
//   CZ: "Rejstřík fyzických osob vyloučených z účasti na hazardních hrách"
//       — operated by Ministerstvo financí; technical spec is part of the AISG
//       integration package. See § 16 of Act 186/2016 Sb.
//
//   SK: register operated by ÚRHH ("register vylúčených osôb") under Act
//       30/2019 Z.z. § 35. Online operators must perform live lookups.
//
// This module is intentionally a stub. The real implementation will:
//   1. Establish mTLS to the regulator endpoint with certs issued at
//      licensing.
//   2. Submit the player's national ID (rodné číslo / rodné číslo SK) for
//      lookup, with a signed audit trail.
//   3. Cache the result on `users.registry_excluded` with `registry_checked_at`
//      and re-check at the cadence the regulator demands (typically before
//      every deposit and at session start).

import type { Jurisdiction } from "./types";

export interface ExclusionLookup {
  excluded: boolean;
  source: "CZ_REJSTRIK" | "SK_URHH" | "STUB";
  checkedAt: Date;
  reason?: string;
}

export async function checkExclusionRegistry(args: {
  jurisdiction: Jurisdiction;
  nationalId: string;
}): Promise<ExclusionLookup> {
  // TODO: implement against CZ and SK endpoints. Until certs are provisioned,
  // this stub fails closed in production and open in dev so the rest of the
  // app can be developed.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      `exclusion registry not configured for ${args.jurisdiction}; refusing to proceed`,
    );
  }
  return { excluded: false, source: "STUB", checkedAt: new Date() };
}
