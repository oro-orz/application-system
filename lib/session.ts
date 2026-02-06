/**
 * セッションの JWT 発行・検証。Cookie に載せて middleware / API で検証する。
 */
import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "settlement_session";
const DEFAULT_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  uid: string;
  email: string;
  name: string;
  tmg_email?: string;
  employee_number?: string;
  department?: string;
  role?: string;
  exp?: number;
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET must be set and at least 32 characters (for session signing)"
    );
  }
  return new TextEncoder().encode(secret);
}

/**
 * セッション JWT を発行する。
 */
export async function createSessionToken(
  payload: Omit<SessionPayload, "exp">,
  maxAgeSeconds: number = DEFAULT_MAX_AGE
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + maxAgeSeconds;
  return new SignJWT({ ...payload, exp })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(exp)
    .setIssuedAt(Math.floor(Date.now() / 1000))
    .sign(getSecret());
}

/**
 * Cookie からセッションを検証し、ペイロードを返す。無効なら null。
 */
export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const exp = payload.exp as number | undefined;
    if (exp != null && exp < Math.floor(Date.now() / 1000)) return null;
    return {
      uid: String(payload.uid ?? ""),
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
      tmg_email: payload.tmg_email != null ? String(payload.tmg_email) : undefined,
      employee_number:
        payload.employee_number != null ? String(payload.employee_number) : undefined,
      department: payload.department != null ? String(payload.department) : undefined,
      role: payload.role != null ? String(payload.role) : undefined,
      exp,
    };
  } catch {
    return null;
  }
}

export function getSessionCookieName(): string {
  return COOKIE_NAME;
}

export function getSessionCookieOptions(maxAgeSeconds: number = DEFAULT_MAX_AGE) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
