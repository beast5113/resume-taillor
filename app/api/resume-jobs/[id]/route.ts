import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("resume_jobs")
    .select(
      "id, status, file_name, google_drive_link, error_message, created_at, updated_at"
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  return NextResponse.json(data);
}
