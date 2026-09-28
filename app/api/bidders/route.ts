import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAnyAuth } from "@/lib/auth";

/**
 * Bidder (team_users) list for the AutoGen extension's "Assigned bidder"
 * picker. Distinct from /api/team (cookie-session, admin-only, used by the
 * admin web UI's team management page) - this one accepts the extension's
 * Bearer token and is readable by any authenticated user, not just admins.
 *
 * Admins see every active team member; an assistant only ever sees
 * themselves, since an assistant's applications are already always scoped to
 * their own created_by server-side regardless of any bidder filter they set.
 */
export async function GET(request: NextRequest) {
  const session = await requireAnyAuth(request);
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  let query = supabase
    .from("team_users")
    .select("id, name")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (session.role === "assistant") query = query.eq("id", session.userId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
