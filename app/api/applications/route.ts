import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const includeProfiles = request.nextUrl.searchParams.get("include_profiles") === "true";

  const select = includeProfiles
    ? "id, seq, job_url, role, company_name, status, pipeline_status, google_drive_link, google_drive_file_id, error_message, created_at, updated_at, profiles(name)"
    : "id, seq, job_url, role, company_name, status, pipeline_status, google_drive_link, google_drive_file_id, error_message, created_at, updated_at";

  const { data, error } = await supabase
    .from("applications")
    .select(select)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(data);
}
