import { cookies } from "next/headers";

export const SESSION_COOKIE = "rt_session";

export function readEnv(value: string | undefined): string {
  if (!value) return "";
  return value.replace(/^(['"])(.*)\1$/, "$2").trim();
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

async function hmacHex(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type SessionPayload = { userId: string; role: string };

/** Token format: `userId:role:<hmac(userId:role)>` */
export async function createSession(userId: string, role: string, secret: string): Promise<string> {
  const payload = `${userId}:${role}`;
  const sig = await hmacHex(payload, secret);
  return `${payload}:${sig}`;
}

export async function verifySession(token: string, secret: string): Promise<SessionPayload | null> {
  const last = token.lastIndexOf(":");
  if (last === -1) return null;
  const payload = token.slice(0, last);
  const sig = token.slice(last + 1);
  const expected = await hmacHex(payload, secret);
  if (!timingSafeEqual(sig, expected)) return null;
  const colonIdx = payload.indexOf(":");
  if (colonIdx === -1) return null;
  const userId = payload.slice(0, colonIdx);
  const role = payload.slice(colonIdx + 1);
  if (!userId || !role) return null;
  return { userId, role };
}

/** Read and verify the session cookie from the current request. Returns null if missing or invalid. */
export async function requireSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value ?? "";
  return verifySession(token, readEnv(process.env.SESSION_SECRET));
}
