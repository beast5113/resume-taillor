import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireSession } from "@/lib/auth";
import { buildResumeFilename } from "@/lib/resumeFilename";
import {
  renderDocxTemplate,
  renderDocxTemplateStructured,
  isStructuredOutput,
  mapStructuredToFlat,
  extractSalary,
  type StructuredAIOutput,
} from "@/lib/docxTemplater";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  let templateId: string;
  let jsonData: Record<string, unknown>;
  try {
    ({ templateId, jsonData } = await request.json());
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  if (!templateId?.trim())
    return NextResponse.json({ message: "templateId is required" }, { status: 400 });
  if (!jsonData || typeof jsonData !== "object" || Array.isArray(jsonData))
    return NextResponse.json({ message: "jsonData must be an object" }, { status: 400 });

  const { data: app } = await supabase
    .from("applications")
    .select("id, profile_id, company_name, salary")
    .eq("id", id)
    .single();

  if (!app) return NextResponse.json({ message: "Application not found" }, { status: 404 });

  const { data: tpl, error: tplError } = await supabase
    .from("docx_templates")
    .select("name, storage_path")
    .eq("id", templateId)
    .single();

  if (tplError || !tpl)
    return NextResponse.json({ message: "Template not found" }, { status: 404 });

  const { data: fileBlob, error: dlError } = await supabase.storage
    .from("docx-templates")
    .download(tpl.storage_path);

  if (dlError || !fileBlob)
    return NextResponse.json({ message: "Failed to download template" }, { status: 500 });

  const templateBuffer = Buffer.from(await fileBlob.arrayBuffer());

  let buffer: Buffer;
  if (isStructuredOutput(jsonData)) {
    const flatData = mapStructuredToFlat(jsonData as unknown as StructuredAIOutput);
    buffer = renderDocxTemplateStructured(templateBuffer, jsonData as unknown as StructuredAIOutput, flatData);
  } else {
    buffer = renderDocxTemplate(templateBuffer, jsonData as Record<string, string>);
  }

  // Store the generated JSON verbatim (always the latest resume generated for
  // this application), and backfill salary from it if the application doesn't
  // already have one (e.g. the extension created it with none, but the job
  // description itself stated a figure the model picked up).
  const extractedSalary = app.salary ? null : extractSalary(jsonData);
  await supabase
    .from("applications")
    .update({ resume_json: JSON.stringify(jsonData), ...(extractedSalary ? { salary: extractedSalary } : {}) })
    .eq("id", id);

  let profileName = "";
  let profileFirstName: string | null = null;
  let profileLastName: string | null = null;
  if (app.profile_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("name, first_name, last_name")
      .eq("id", app.profile_id)
      .single();
    if (profile) {
      profileName = profile.name ?? "";
      profileFirstName = profile.first_name;
      profileLastName = profile.last_name;
    }
  }

  const filename = buildResumeFilename(
    profileFirstName,
    profileLastName,
    profileName,
    app.company_name ?? "",
    tpl.name.replace(/\s+/g, "_")
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Filename": filename,
    },
  });
}
