import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireBearerAuth } from "@/lib/auth";

const MAX_CANDIDATES = 200;

/**
 * Tab 2 (Applications) candidate list for the AutoGen extension: applications that
 * still need a resume generated - `status IN ('pending','failed')` - newest first,
 * joined to their template's name so the panel can show it and flag rows with no
 * template assigned (those can't be generated and are disabled in the UI).
 *
 * `?bidderId=` hard-filters to applications created by that team_user, same
 * precedent as /api/applications' existing bidderId param; ignored for an
 * `assistant`-role caller, who's already always scoped to their own rows.
 */
export async function GET(request: NextRequest) {
  const session = await requireBearerAuth(request);
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const bidderId = request.nextUrl.searchParams.get("bidderId")?.trim() || "";

  let query = supabase
    .from("applications")
    .select(
      "id, seq, role, company_name, status, created_at, created_by, template_id, error_message, docx_templates(name), creator:team_users!created_by(name)"
    )
    .in("status", ["pending", "failed"])
    .order("created_at", { ascending: false })
    .limit(MAX_CANDIDATES);

  if (session.role === "assistant") query = query.eq("created_by", session.userId);
  else if (bidderId) query = query.eq("created_by", bidderId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  const applications = (data ?? []).map(({ docx_templates, creator, ...rest }) => ({
    ...rest,
    template_name: (docx_templates as unknown as { name: string } | null)?.name ?? null,
    bidder_name: (creator as unknown as { name: string } | null)?.name ?? null,
  }));

  return NextResponse.json({ applications });
}
