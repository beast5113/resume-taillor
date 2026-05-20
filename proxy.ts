import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, computeToken, timingSafeEqual, readEnv } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow login, auth actions, and webhook
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/webhook")
  ) {
    return NextResponse.next();
  }

  const appEmail = readEnv(process.env.APP_EMAIL);
  const appPassword = readEnv(process.env.APP_PASSWORD);
  const secret = readEnv(process.env.SESSION_SECRET);

  // Skip auth if credentials not configured
  if (!appEmail || !appPassword || !secret) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const expected = await computeToken(appEmail, appPassword, secret);
  if (!timingSafeEqual(sessionCookie, expected)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
