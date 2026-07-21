import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const ALLOWED_STATUSES = ["pending"];

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { ids, pipeline_status, status } = body;

  if (!Array.isArray(ids) || ids.length === 0)
    return NextResponse.json({ message: "ids array is required" }, { status: 400 });

  if (!pipeline_status && !status)
    return NextResponse.json({ message: "pipeline_status or status is required" }, { status: 400 });

  if (status && !ALLOWED_STATUSES.includes(status))
    return NextResponse.json({ message: `status must be one of: ${ALLOWED_STATUSES.join(", ")}` }, { status: 400 });

  const updatePayload: Record<string, string> = {};
  if (pipeline_status) updatePayload.pipeline_status = pipeline_status;
  if (status) updatePayload.status = status;

  const { error } = await supabase
    .from("applications")
    .update(updatePayload)
    .in("id", ids);

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ updated: ids.length });
}
