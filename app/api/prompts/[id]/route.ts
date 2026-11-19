import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireSession } from "@/lib/auth";
import { canManageOwned } from "@/lib/access";

async function guard(id: string) {
  const session = await requireSession();
  if (!session || !(await canManageOwned(session, "prompts", id))) return null;
  return session;
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await guard(id))) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  let name: string | undefined;
  let content: string | undefined;
  let is_default: boolean | undefined;

  try {
    ({ name, content, is_default } = await request.json());
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name.trim();
  if (content !== undefined) updates.content = content;
  if (is_default !== undefined) updates.is_default = is_default;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ message: "No fields to update" }, { status: 400 });
  }

  if (is_default === true) {
    // Default is per owner: only clear the other default prompt of the same owner.
    const { data: own } = await supabase.from("prompts").select("owner_id").eq("id", id).maybeSingle();
    let clear = supabase
      .from("prompts")
      .update({ is_default: false })
      .eq("is_default", true)
      .neq("id", id);
    clear = own?.owner_id ? clear.eq("owner_id", own.owner_id) : clear.is("owner_id", null);
    const { error: clearError } = await clear;
    if (clearError) return NextResponse.json({ message: clearError.message }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("prompts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await guard(id))) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const { data: prompt } = await supabase
    .from("prompts")
    .select("is_default")
    .eq("id", id)
    .maybeSingle();

  if (prompt?.is_default) {
    return NextResponse.json(
      { message: "Cannot delete the default prompt. Set a different prompt as default first." },
      { status: 409 }
    );
  }

  const { error } = await supabase.from("prompts").delete().eq("id", id);

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
