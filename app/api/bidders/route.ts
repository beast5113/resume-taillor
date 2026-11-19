import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAnyAuth } from "@/lib/auth";
import { visibleTeamUserIds } from "@/lib/access";

/**
 * Bidder (team_users) list for the AutoGen extension's "Assigned bidder"
 * picker. Distinct from /api/team (cookie-session, admin-only, used by the
 * admin web UI's team management page) - this one accepts the extension's
 * Bearer token and is readable by any authenticated user, not just admins.
 *
 * Super admins see every active team member, admins see themselves plus
 * assistants (never other admins); an assistant only ever sees
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

  // super_admin: everyone · admin: self + assistants · assistant: self
  const ids = await visibleTeamUserIds(session);
  if (ids !== null) query = query.in("id", ids);

  const { data, error } = await query;
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
