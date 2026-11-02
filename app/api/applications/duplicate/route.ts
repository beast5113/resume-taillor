import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireSession } from "@/lib/auth";

/** Clones the selected applications' job (URL, role, company, JD, board,
 * salary) onto a different profile + template, so the same job can be applied
 * to with several profiles without re-capturing it through the extension.
 * Each copy lands as a fresh "pending" / "saved" application owned by the
 * caller - no resume, Drive file, recruiter or meeting data is carried over. */
export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const ids: unknown = body?.ids;
  const profileId: string = body?.profile_id?.trim?.() ?? "";
  const templateId: string = body?.template_id?.trim?.() ?? "";

  if (!Array.isArray(ids) || ids.length === 0)
    return NextResponse.json({ message: "ids array is required" }, { status: 400 });
  if (!profileId || !templateId)
    return NextResponse.json({ message: "profile_id and template_id are required" }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", profileId)
    .eq("is_active", true)
    .maybeSingle();
  if (!profile) return NextResponse.json({ message: "Profile not found or inactive" }, { status: 400 });

  if (session.role === "assistant") {
    const { data: assignment } = await supabase
      .from("profile_assignments")
      .select("id")
      .eq("user_id", session.userId)
      .eq("profile_id", profileId)
      .maybeSingle();
    if (!assignment) return NextResponse.json({ message: "You are not assigned to this profile" }, { status: 403 });
  }

  const { data: template } = await supabase
    .from("docx_templates")
    .select("id")
    .eq("id", templateId)
    .maybeSingle();
  if (!template) return NextResponse.json({ message: "Template not found" }, { status: 400 });

  const { data: sources, error: fetchError } = await supabase
    .from("applications")
    .select("job_url, role, company_name, job_description, job_board, salary")
    .in("id", ids)
    .order("seq", { ascending: true });
  if (fetchError) return NextResponse.json({ message: fetchError.message }, { status: 500 });
  if (!sources?.length) return NextResponse.json({ message: "No matching applications" }, { status: 404 });

  const { data: created, error: insertError } = await supabase
    .from("applications")
    .insert(sources.map((s) => ({
      job_url: s.job_url,
      role: s.role,
      company_name: s.company_name,
      job_description: s.job_description,
      job_board: s.job_board,
      salary: s.salary,
      profile_id: profileId,
      template_id: templateId,
      created_by: session.userId,
      status: "pending",
      pipeline_status: "saved",
    })))
    .select("id");

  if (insertError) return NextResponse.json({ message: insertError.message }, { status: 500 });
  return NextResponse.json({ created: created?.length ?? 0 }, { status: 201 });
}
