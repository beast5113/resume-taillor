"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, computeToken, readEnv } from "@/lib/auth";

export async function login(formData: FormData): Promise<{ error: string } | void> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const validEmail = readEnv(process.env.APP_EMAIL);
  const validPassword = readEnv(process.env.APP_PASSWORD);
  const secret = readEnv(process.env.SESSION_SECRET);

  if (!validEmail || !validPassword || !secret) {
    return { error: "Server credentials not configured." };
  }

  if (email !== validEmail || password !== validPassword) {
    return { error: "Invalid email or password." };
  }

  const token = await computeToken(validEmail, validPassword, secret);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  redirect("/");
}
