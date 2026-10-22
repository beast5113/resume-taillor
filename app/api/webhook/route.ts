import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireBearerAuth } from "@/lib/auth";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/** Creates an application record from the extension's job capture. Resumes are
 * never generated here - every application lands as "pending" and gets its
 * JSON submitted later (AutoGen, Batch Builder's paste-JSON, or the "Copy
 * Prompt" + paste-back flow), never via a direct in-app OpenAI call. */
export async function POST(request: NextRequest) {
  const session = await requireBearerAuth(request);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }

  let job_url: string | undefined;
  let role: string;
  let company_name: string;
  let job_description: string | undefined;
  let template_id: string | undefined;
  let profile_id: string | undefined;
  let job_board: string | undefined;
  let salary: string | undefined;

  try {
    ({ job_url, role, company_name, job_description, template_id, profile_id, job_board, salary } = await request.json());
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400, headers: CORS_HEADERS });
  }

  if (!role?.trim() || !company_name?.trim()) {
    return NextResponse.json(
      { message: "role and company_name are required" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  let resolvedProfileId: string | null = null;
  let profileDefaultTemplateId: string | null = null;

  if (profile_id?.trim()) {
    // A deactivated profile is treated as if it doesn't exist here - same as
    // an unrecognized id - so a stale extension can't keep filing new
    // applications against a profile that's been turned off.
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, default_template_id")
      .eq("id", profile_id.trim())
      .eq("is_active", true)
      .maybeSingle();
    if (profile) {
      resolvedProfileId = profile.id;
      profileDefaultTemplateId = profile.default_template_id ?? null;
    }
  }

  // Extension-provided template wins; otherwise fall back to the profile's own
  // default template. Purely metadata for whoever renders this application's
  // resume later - nothing here triggers generation.
  const storedTemplateId = template_id?.trim() || profileDefaultTemplateId;

  const { data: application, error: insertError } = await supabase
    .from("applications")
    .insert({
      job_url: job_url?.trim() || null,
      role: role.trim(),
      company_name: company_name.trim(),
      job_description: job_description?.trim() || null,
      profile_id: resolvedProfileId,
      template_id: storedTemplateId,
      created_by: session.userId,
      status: "pending",
      pipeline_status: "saved",
      job_board: job_board?.trim() || null,
      salary: salary?.trim() || null,
    })
    .select()
    .single();

  if (insertError || !application) {
    return NextResponse.json({ message: insertError?.message ?? "Insert failed" }, { status: 500, headers: CORS_HEADERS });
  }

  return NextResponse.json(application, { status: 202, headers: CORS_HEADERS });
}
