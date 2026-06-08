import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ message: "Invalid request" }, { status: 400 });

  const email = String(body.email ?? "").toLowerCase().trim();
  const password = String(body.password ?? "");

  if (!email || !password) {
    return NextResponse.json({ message: "Email and password are required." }, { status: 400 });
  }

  const { data: user } = await supabase
    .from("team_users")
    .select("id, name, email, role, password_hash")
    .eq("email", email)
    .maybeSingle();

  if (!user) {
    return NextResponse.json({ message: "Invalid email or password." }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return NextResponse.json({ message: "Invalid email or password." }, { status: 401 });
  }

  return NextResponse.json({
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
}
