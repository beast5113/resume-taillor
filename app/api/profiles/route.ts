import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAnyAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await requireAnyAuth(request);
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  // Deactivated profiles are hidden everywhere by default (extension-facing
  // lookups included, since they go through this same endpoint) - only the
  // Profile management page and the Applications filter explicitly opt in
  // with ?includeInactive=1 to show the full set.
  const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "1";

  let query = supabase
    .from("profiles")
    .select("id, name, first_name, last_name, default_template_id, profile_note, is_active, created_at, updated_at")
    .order("is_active", { ascending: false })
    .order("name", { ascending: true });

  if (!includeInactive) query = query.eq("is_active", true);

  if (session.role === "assistant") {
    const { data: assignments } = await supabase
      .from("profile_assignments")
      .select("profile_id")
      .eq("user_id", session.userId);

    const ids = (assignments ?? []).map((a) => a.profile_id);
    if (ids.length === 0) return NextResponse.json([]);
    query = query.in("id", ids);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const session = await requireAnyAuth(request);
  if (!session || session.role !== "admin")
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  let name: string;
  let first_name: string;
  let last_name: string;
  let profile_note: string | undefined;
  try {
    ({ name, first_name, last_name, profile_note } = await request.json());
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  name = name?.trim();
  first_name = first_name?.trim();
  last_name = last_name?.trim();
  if (!name || !first_name || !last_name)
    return NextResponse.json({ message: "name, first_name, and last_name are required" }, { status: 400 });

  const { data, error } = await supabase
    .from("profiles")
    .insert({ name, first_name, last_name, profile_note: profile_note?.trim() || null })
    .select("id, name, first_name, last_name, default_template_id, profile_note, is_active, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
