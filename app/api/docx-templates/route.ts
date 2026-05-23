import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { extractTemplateVariables } from "@/lib/docxTemplater";

export async function GET() {
  const { data, error } = await supabase
    .from("docx_templates")
    .select("id, name, storage_path, variables, created_at, updated_at")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ message: "Invalid form data" }, { status: 400 });

  const name = (formData.get("name") as string | null)?.trim();
  const file = formData.get("file") as File | null;

  if (!name) return NextResponse.json({ message: "Name is required" }, { status: 400 });
  if (!file) return NextResponse.json({ message: "File is required" }, { status: 400 });
  if (!file.name.endsWith(".docx"))
    return NextResponse.json({ message: "Only .docx files are supported" }, { status: 400 });

  const arrayBuffer = await file.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);

  // Extract <<variable>> placeholders before uploading
  let variables: string[] = [];
  try {
    variables = extractTemplateVariables(fileBuffer);
  } catch {
    return NextResponse.json({ message: "Could not parse DOCX file" }, { status: 400 });
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
    .insert({ name, storage_path: storagePath, variables })
    .select()
    .single();

  if (error) {
    await supabase.storage.from("docx-templates").remove([storagePath]);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
