import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  void request; // unused but kept for Next.js route signature

  const { data, error } = await supabase
    .from("applications")
    .select("id, seq, job_url, role, company_name, status, pipeline_status, google_drive_link, google_drive_file_id, error_message, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(data);
}
