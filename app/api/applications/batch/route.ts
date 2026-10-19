import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireSession } from "@/lib/auth";
import { deleteFileFromDrive } from "@/lib/googleDrive";
import { STATUSES_THAT_CLEAR_RESUME, resumeClearingFields } from "@/lib/applicationResumeCleanup";

const ALLOWED_STATUSES = ["pending", "completed", "failed"];

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { ids, pipeline_status, status, created_by } = body;

  if (!Array.isArray(ids) || ids.length === 0)
    return NextResponse.json({ message: "ids array is required" }, { status: 400 });

  if (!pipeline_status && !status && !created_by)
    return NextResponse.json({ message: "pipeline_status, status, or created_by is required" }, { status: 400 });

  if (status && !ALLOWED_STATUSES.includes(status))
    return NextResponse.json({ message: `status must be one of: ${ALLOWED_STATUSES.join(", ")}` }, { status: 400 });

  if (created_by) {
    const session = await requireSession();
    if (!session || session.role !== "admin")
      return NextResponse.json({ message: "Only admins can reassign the bidder" }, { status: 403 });
  }

  const updatePayload: Record<string, string | null> = {};
  if (pipeline_status) updatePayload.pipeline_status = pipeline_status;
  if (status) updatePayload.status = status;
  if (created_by) updatePayload.created_by = created_by;

  if (status && STATUSES_THAT_CLEAR_RESUME.includes(status)) {
    Object.assign(updatePayload, await resumeClearingFields(ids));
  }

  const { error } = await supabase
    .from("applications")
    .update(updatePayload)
    .in("id", ids);

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ updated: ids.length });
}

export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const ids = body?.ids;

  if (!Array.isArray(ids) || ids.length === 0)
    return NextResponse.json({ message: "ids array is required" }, { status: 400 });

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
        // Drive file may already be gone — continue with DB deletion
      }
    })
  );

  const { error } = await supabase.from("applications").delete().in("id", ids);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ deleted: ids.length });
}
