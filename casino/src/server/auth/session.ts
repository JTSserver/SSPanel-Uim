import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";

// Minimal session helper. Production should:
//   - Use secure, httpOnly, sameSite=lax cookies (already set below).
//   - Bind sessions to device fingerprints + IP changes for fraud detection.
//   - Force re-auth before withdrawals and limit changes.
//   - Issue refresh tokens separately from access tokens.

const SESSION_COOKIE = "casino_session";

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    throw new Error("AUTH_SECRET must be set to >= 32 chars");
  }
  return new TextEncoder().encode(s);
}

export interface SessionClaims {
  sub: string;
  jurisdiction: "CZ" | "SK";
  kyc: "none" | "pending" | "verified" | "rejected" | "expired";
}

export async function issueSession(claims: SessionClaims): Promise<void> {
  const ttl = Number(process.env.SESSION_TTL_SECONDS ?? 3600);
  const token = await new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttl}s`)
    .sign(secret());
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ttl,
  });
}

export async function getSession(): Promise<SessionClaims | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionClaims;
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<SessionClaims> {
  const s = await getSession();
  if (!s) throw new Response("unauthorized", { status: 401 });
  return s;
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
