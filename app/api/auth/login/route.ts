import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, computeToken, timingSafeEqual, readEnv } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const appEmail = readEnv(process.env.APP_EMAIL);
  const appPassword = readEnv(process.env.APP_PASSWORD);
  const secret = readEnv(process.env.SESSION_SECRET);

  if (!appEmail || !appPassword || !secret) {
    return NextResponse.json({ message: "Auth is not configured" }, { status: 500 });
  }

  let email: string;
  let password: string;
  try {
    ({ email, password } = await request.json());
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const trimmedEmail = email?.trim() ?? "";
  const emailOk = timingSafeEqual(trimmedEmail, appEmail);
  const passwordOk = timingSafeEqual(password ?? "", appPassword);

  if (!emailOk || !passwordOk) {
    return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
  }

  const token = await computeToken(appEmail, appPassword, secret);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });
  return response;
}
