import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ message: "Invalid request body" }, { status: 400 });

  const update: {
    name?: string; first_name?: string; last_name?: string;
    default_template_id?: string | null;
    profile_basic?: string | null; is_active?: boolean;
  } = {};

  if ("name" in body) {
    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ message: "name is required" }, { status: 400 });
    update.name = name;
  }

  if ("first_name" in body || "last_name" in body) {
    const first_name = String(body.first_name ?? "").trim();
    const last_name = String(body.last_name ?? "").trim();
    if (!first_name || !last_name)
      return NextResponse.json({ message: "first_name and last_name are required" }, { status: 400 });
    update.first_name = first_name;
    update.last_name = last_name;
  }

  if ("profile_basic" in body) {
    const profile_basic = String(body.profile_basic ?? "").trim() || null;
    if (profile_basic) {
      try {
        JSON.parse(profile_basic);
      } catch {
        return NextResponse.json({ message: "profile_basic must be valid JSON" }, { status: 400 });
      }
    }
    update.profile_basic = profile_basic;
  }

  if ("is_active" in body) {
    update.is_active = Boolean(body.is_active);
  }

  if ("default_template_id" in body) {
    const default_template_id: string | null = body.default_template_id || null;
    if (default_template_id) {
      const { data: template } = await supabase
        .from("docx_templates")
        .select("id, profile_id")
        .eq("id", default_template_id)
        .maybeSingle();
      if (!template || template.profile_id !== id) {
        return NextResponse.json(
          { message: "default_template_id must be a template belonging to this profile" },
          { status: 400 }
        );
      }
    }
    update.default_template_id = default_template_id;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ message: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", id)
    .select("id, name, first_name, last_name, default_template_id, profile_basic, is_active, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { error } = await supabase.from("profiles").delete().eq("id", id);

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
