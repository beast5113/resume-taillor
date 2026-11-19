import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAnyAuth } from "@/lib/auth";
import { visibleTemplateIds } from "@/lib/access";

export async function GET(request: NextRequest) {
  const session = await requireAnyAuth(request);
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  let query = supabase
    .from("docx_templates")
    .select("id, name")
    .order("name", { ascending: true });

  const ids = await visibleTemplateIds(session);
  if (ids !== null) {
    if (ids.length === 0) return NextResponse.json([]);
    query = query.in("id", ids);
  }

  const profileId = request.nextUrl.searchParams.get("profile_id");
  if (profileId) {
    query = query.eq("profile_id", profileId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
