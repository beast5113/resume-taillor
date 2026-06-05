import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";
import { verifySession, SESSION_COOKIE, readEnv } from "@/lib/auth";
import bcrypt from "bcryptjs";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value ?? "";
  const session = await verifySession(token, readEnv(process.env.SESSION_SECRET));
  if (!session || session.role !== "admin") return null;
  return session;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const updates: Record<string, string> = {};

  if (body.name?.trim()) updates.name = body.name.trim();
  if (body.email?.trim()) updates.email = body.email.toLowerCase().trim();
  if (body.role && ["admin", "assistant"].includes(body.role)) updates.role = body.role;
  if (body.password?.trim()) updates.password_hash = await bcrypt.hash(body.password.trim(), 12);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ message: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("team_users")
    .update(updates)
    .eq("id", id)
    .select("id, name, email, role, created_at")
    .single();

  if (error) {
    const msg = error.code === "23505" ? "Email already in use." : error.message;
    return NextResponse.json({ message: msg }, { status: 400 });
  }

  return NextResponse.json(data);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const { id } = await params;

  if (id === session.userId) {
    return NextResponse.json({ message: "Cannot delete your own account." }, { status: 400 });
  }

  const { error } = await supabase.from("team_users").delete().eq("id", id);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
