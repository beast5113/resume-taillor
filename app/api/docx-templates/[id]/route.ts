import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireSession } from "@/lib/auth";
import { canManageOwned, canUseTemplate } from "@/lib/access";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  if (!session || !(await canUseTemplate(session, id)))
    return NextResponse.json({ message: "Template not found" }, { status: 404 });
  const { data, error } = await supabase
    .from("docx_templates")
    .select("id, name, storage_path, notes, company_name_hyperlink, created_at, updated_at")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ message: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  if (!session || !(await canManageOwned(session, "docx_templates", id)))
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || !("prompt_id" in body || "notes" in body || "company_name_hyperlink" in body))
    return NextResponse.json({ message: "No valid fields to update" }, { status: 400 });

  const updates: Record<string, string | boolean | null> = {};
  if ("prompt_id" in body) {
    if (body.prompt_id && !(await canManageOwned(session, "prompts", body.prompt_id)))
      return NextResponse.json({ message: "You can only use your own prompts" }, { status: 403 });
    updates.prompt_id = body.prompt_id || null;
  }
  if ("notes" in body) updates.notes = (body.notes as string | null)?.trim() || null;
  if ("company_name_hyperlink" in body) updates.company_name_hyperlink = Boolean(body.company_name_hyperlink);

  const { data, error } = await supabase
    .from("docx_templates")
    .update(updates)
    .eq("id", id)
    .select("id, name, storage_path, variables, template_type, profile_id, prompt_id, notes, company_name_hyperlink, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  if (!session || !(await canManageOwned(session, "docx_templates", id)))
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  const { data, error } = await supabase
    .from("docx_templates")
    .select("storage_path")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ message: "Template not found" }, { status: 404 });

  await supabase.storage.from("docx-templates").remove([data.storage_path]);

  const { error: delError } = await supabase.from("docx_templates").delete().eq("id", id);
  if (delError) return NextResponse.json({ message: delError.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
