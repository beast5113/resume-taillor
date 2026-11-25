import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { extractTemplateVariables } from "@/lib/docxTemplater";
import { requireAnyAuth, requireSession } from "@/lib/auth";
import { isAdminRole, isSuperAdmin, visibleTemplateIds, canManageOwned, profileOwnerId } from "@/lib/access";

const COVER_LETTER_VARS = new Set(["date", "letter"]);

export async function GET(request: NextRequest) {
  // Bearer too, not just the web cookie: the AutoGen extension lists templates with its token.
  const session = await requireAnyAuth(request);
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  let query = supabase
    .from("docx_templates")
    .select("id, name, storage_path, variables, template_type, profile_id, prompt_id, notes, company_name_hyperlink, created_at, updated_at")
    .order("created_at", { ascending: true });

  // super_admin: all · admin: own templates · assistant: templates of assigned profiles
  const ids = await visibleTemplateIds(session);
  if (ids !== null) {
    if (ids.length === 0) return NextResponse.json([]);
    query = query.in("id", ids);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session || !isAdminRole(session))
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ message: "Invalid form data" }, { status: 400 });

  const name = (formData.get("name") as string | null)?.trim();
  const file = formData.get("file") as File | null;
  const template_type = (formData.get("template_type") as string | null)?.trim() || "resume";
  const profile_id = (formData.get("profile_id") as string | null)?.trim() || null;
  const prompt_id = (formData.get("prompt_id") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;
  const company_name_hyperlink = formData.get("company_name_hyperlink") !== "false";

  if (!name) return NextResponse.json({ message: "Name is required" }, { status: 400 });
  if (!file) return NextResponse.json({ message: "File is required" }, { status: 400 });
  if (!file.name.endsWith(".docx"))
    return NextResponse.json({ message: "Only .docx files are supported" }, { status: 400 });
  if (!["resume", "cover_letter"].includes(template_type))
    return NextResponse.json({ message: "template_type must be resume or cover_letter" }, { status: 400 });

  if (profile_id && !(await canManageOwned(session, "profiles", profile_id)))
    return NextResponse.json({ message: "You can only use your own profiles" }, { status: 403 });
  if (prompt_id && !(await canManageOwned(session, "prompts", prompt_id)))
    return NextResponse.json({ message: "You can only use your own prompts" }, { status: 403 });

  // A template belongs to its profile's owner (so a super admin creating a
  // template for an admin's profile hands it to that admin); otherwise the caller.
  const owner_id =
    (profile_id && isSuperAdmin(session) ? await profileOwnerId(profile_id) : null) ?? session.userId;

  const arrayBuffer = await file.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);

  let variables: string[] = [];
  try {
    variables = extractTemplateVariables(fileBuffer);
  } catch {
    return NextResponse.json({ message: "Could not parse DOCX file" }, { status: 400 });
  }

  if (template_type === "cover_letter") {
    const unknown = variables.filter((v) => !COVER_LETTER_VARS.has(v));
    if (unknown.length > 0) {
      return NextResponse.json(
        {
          message: `Cover letter templates may only contain <<date>> and <<letter>>. Unknown: ${unknown.map((v) => `<<${v}>>`).join(", ")}`,
        },
        { status: 400 }
      );
    }
  }

  const storagePath = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  const { error: uploadError } = await supabase.storage
    .from("docx-templates")
    .upload(storagePath, fileBuffer, {
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      upsert: false,
    });

  if (uploadError) return NextResponse.json({ message: uploadError.message }, { status: 500 });

  const { data, error } = await supabase
    .from("docx_templates")
    .insert({ name, storage_path: storagePath, variables, template_type, profile_id: profile_id || null, prompt_id, notes, company_name_hyperlink, owner_id })
    .select()
    .single();

  if (error) {
    await supabase.storage.from("docx-templates").remove([storagePath]);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
