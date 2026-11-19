import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireSession } from "@/lib/auth";
import { isAdminRole, canManageOwned } from "@/lib/access";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session || !isAdminRole(session))
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const { data: assignment } = await supabase
    .from("profile_assignments")
    .select("profile_id")
    .eq("id", id)
    .maybeSingle();
  if (!assignment) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (!(await canManageOwned(session, "profiles", assignment.profile_id as string)))
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const { error } = await supabase.from("profile_assignments").delete().eq("id", id);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
