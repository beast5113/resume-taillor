import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireSession } from "@/lib/auth";
import { isAdminRole, visibleProfileIds, canManageOwned } from "@/lib/access";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (!session || !isAdminRole(session))
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const user_id = searchParams.get("user_id");
  const profile_id = searchParams.get("profile_id");

  let query = supabase
    .from("profile_assignments")
    .select("id, profile_id, user_id, created_at")
    .order("created_at", { ascending: true });

  // Admins only see assignments of their own profiles.
  const ownIds = await visibleProfileIds(session);
  if (ownIds !== null) {
    if (ownIds.length === 0) return NextResponse.json([]);
    query = query.in("profile_id", ownIds);
  }

  if (user_id) query = query.eq("user_id", user_id);
  if (profile_id) query = query.eq("profile_id", profile_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session || !isAdminRole(session))
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  let profile_id: string, user_id: string;
  try {
    ({ profile_id, user_id } = await request.json());
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  if (!profile_id?.trim() || !user_id?.trim())
    return NextResponse.json({ message: "profile_id and user_id are required" }, { status: 400 });

  if (!(await canManageOwned(session, "profiles", profile_id)))
    return NextResponse.json({ message: "You can only assign your own profiles" }, { status: 403 });

  const { data: target } = await supabase.from("team_users").select("role").eq("id", user_id).maybeSingle();
  if (!target || target.role !== "assistant")
    return NextResponse.json({ message: "Profiles can only be assigned to assistants" }, { status: 400 });

  const { data, error } = await supabase
    .from("profile_assignments")
    .insert({ profile_id, user_id })
    .select("id, profile_id, user_id, created_at")
    .single();

  if (error) {
    const msg = error.code === "23505" ? "Assignment already exists" : error.message;
    return NextResponse.json({ message: msg }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}
