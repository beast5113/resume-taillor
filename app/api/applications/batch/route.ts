import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { deleteFileFromDrive } from "@/lib/googleDrive";

const ALLOWED_STATUSES = ["pending", "completed", "failed"];
const STATUSES_THAT_CLEAR_RESUME = ["pending", "failed"];

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { ids, pipeline_status, status } = body;

  if (!Array.isArray(ids) || ids.length === 0)
    return NextResponse.json({ message: "ids array is required" }, { status: 400 });

  if (!pipeline_status && !status)
    return NextResponse.json({ message: "pipeline_status or status is required" }, { status: 400 });

  if (status && !ALLOWED_STATUSES.includes(status))
    return NextResponse.json({ message: `status must be one of: ${ALLOWED_STATUSES.join(", ")}` }, { status: 400 });

  const updatePayload: Record<string, string | null> = {};
  if (pipeline_status) updatePayload.pipeline_status = pipeline_status;
  if (status) updatePayload.status = status;

  if (status && STATUSES_THAT_CLEAR_RESUME.includes(status)) {
    const { data: apps } = await supabase
      .from("applications")
      .select("google_drive_file_id")
      .in("id", ids)
      .not("google_drive_file_id", "is", null);

    await Promise.all(
      (apps ?? []).map(async (app) => {
        try {
          await deleteFileFromDrive(app.google_drive_file_id as string);
        } catch {
          // Drive file may already be gone — continue
        }
      })
    );

    updatePayload.google_drive_file_id = null;
    updatePayload.google_drive_link = null;
  }

  const { error } = await supabase
    .from("applications")
    .update(updatePayload)
    .in("id", ids);

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ updated: ids.length });
}
