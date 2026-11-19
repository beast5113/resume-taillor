import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireSession } from "@/lib/auth";
import { isAdminRole, isSuperAdmin } from "@/lib/access";
import bcrypt from "bcryptjs";

const ROLES = ["super_admin", "admin", "assistant"];

/**
 * super_admin: full team list (account management).
 * admin: read-only list of themselves + assistants, used by pickers
 * (profile assignment, bidder filter). Admins can't manage accounts.
 */
export async function GET() {
  const session = await requireSession();
  if (!session || !isAdminRole(session)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  let query = supabase
    .from("team_users")
    .select("id, name, email, role, is_active, created_at")
    .order("created_at", { ascending: true });

  if (!isSuperAdmin(session)) {
    query = query.or(`id.eq.${session.userId},role.eq.assistant`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!isSuperAdmin(session)) {
    return NextResponse.json({ message: "Only the super admin can manage accounts" }, { status: 403 });
  }

  const { name, email, password, role } = await request.json();

  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    return NextResponse.json({ message: "name, email, and password are required" }, { status: 400 });
  }
  if (!ROLES.includes(role)) {
    return NextResponse.json({ message: "role must be super_admin, admin or assistant" }, { status: 400 });
  }

  const password_hash = await bcrypt.hash(password, 12);

  const { data, error } = await supabase
    .from("team_users")
    .insert({ name: name.trim(), email: email.toLowerCase().trim(), password_hash, role })
    .select("id, name, email, role, is_active, created_at")
    .single();

  if (error) {
    const msg = error.code === "23505" ? "Email already in use." : error.message;
    return NextResponse.json({ message: msg }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}
