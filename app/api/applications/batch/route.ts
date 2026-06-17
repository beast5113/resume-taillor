import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { ids, pipeline_status } = body;

  if (!Array.isArray(ids) || ids.length === 0 || !pipeline_status)
    return NextResponse.json({ message: "ids and pipeline_status are required" }, { status: 400 });

  const { error } = await supabase
    .from("applications")
    .update({ pipeline_status })
    .in("id", ids);

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ updated: ids.length });
}
