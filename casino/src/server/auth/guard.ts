import { requireSession, type SessionClaims } from "./session";

// requirePlayable enforces the gates that must hold before a user is allowed
// to wager. It throws a Response on failure so route handlers can just call
// it at the top.
export async function requirePlayable(): Promise<SessionClaims> {
  const session = await requireSession();

  if (session.kyc !== "verified") {
    throw new Response("KYC verification required", { status: 403 });
  }

  // TODO: check the live exclusion-registry status (CZ Rejstřík vyloučených
  // osob, SK equivalent) — see compliance/exclusionRegistry.ts. The cached
  // value on users.registryExcluded must be revalidated at session start and
  // before each deposit and wager per regulator requirements.

  return session;
}
