import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireBearerAuth } from "@/lib/auth";
import { scopeApps, applicationFilter, canUseTemplate } from "@/lib/access";
import { assembleFullPrompt } from "@/lib/promptBuilder";
import { tryClaimRow, releaseClaim, staleThresholdIso } from "@/lib/autogenClaim";

const MAX_CANDIDATES = 20;

const CANDIDATE_FIELDS =
  "id, seq, role, company_name, job_description, profile_id, template_id, status, autogen_claimed_at, created_at";

/**
 * Auto-claim path: atomically claims and returns the oldest claimable application
 * (`status='pending'`, or a stale abandoned `generating` claim), rendering its
 * prompt against the application's OWN `template_id`. An optional `?templateId=`
 * default template is used as a fallback for applications that have none - when
 * that fallback is supplied, template-less applications are also claimable;
 * otherwise they are ignored.
 *
 * `?bidderId=` hard-restricts claimable applications to ones created by that
 * team_user - lets one window run only a specific bidder's queue. Ignored for
 * an `assistant`-role caller, since those are already always scoped to their
 * own `created_by` below regardless of this param (mirrors /api/applications'
 * existing bidderId precedent).
 */
export async function GET(request: NextRequest) {
  const session = await requireBearerAuth(request);
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  let fallbackTemplateId = request.nextUrl.searchParams.get("templateId")?.trim() || "";
  // A fallback template outside the caller's scope is ignored.
  if (fallbackTemplateId && !(await canUseTemplate(session, fallbackTemplateId))) fallbackTemplateId = "";
  const bidderId = request.nextUrl.searchParams.get("bidderId")?.trim() || "";

  let query = supabase
    .from("applications")
    .select(CANDIDATE_FIELDS)
    .neq("job_description", "")
    .or(`status.eq.pending,and(status.eq.generating,autogen_claimed_at.lt.${staleThresholdIso()})`)
    .order("created_at", { ascending: true })
    .limit(MAX_CANDIDATES);

  // Without a default template, only applications that carry their own template
  // are claimable; with one, template-less applications fall back to it.
  if (!fallbackTemplateId) query = query.not("template_id", "is", null);

  query = scopeApps(query, await applicationFilter(session));
  if (session.role !== "assistant" && bidderId) query = query.eq("created_by", bidderId);

  const { data: candidates, error } = await query;
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  for (const app of candidates ?? []) {
    const effectiveTemplateId = (app.template_id as string | null) || fallbackTemplateId;
    if (!effectiveTemplateId) continue;
    const claimedAt = await tryClaimRow(app);
    if (!claimedAt) continue; // lost the race to another lane/window

    const prompt = await assembleFullPrompt(effectiveTemplateId, app);
    if (!prompt) {
      await releaseClaim(app.id, "pending");
      continue;
    }

    return NextResponse.json({
      application: {
        id: app.id,
        seq: app.seq,
        company_name: app.company_name,
        role: app.role,
        created_at: app.created_at,
        job_description: app.job_description,
        rendered_prompt: prompt.fullPrompt,
        autogen_claimed_at: claimedAt,
      },
    });
  }

  return NextResponse.json({ application: null });
}
