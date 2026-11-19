import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireSession } from "@/lib/auth";
import { canUseTemplate } from "@/lib/access";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await requireSession();
  if (!session || !(await canUseTemplate(session, id)))
    return NextResponse.json({ message: "Template not found" }, { status: 404 });

  const { data: tpl, error } = await supabase
    .from("docx_templates")
    .select("name, storage_path")
    .eq("id", id)
    .single();

  if (error || !tpl) return NextResponse.json({ message: "Template not found" }, { status: 404 });

  const { data: fileBlob, error: dlError } = await supabase.storage
    .from("docx-templates")
    .download(tpl.storage_path);

  if (dlError || !fileBlob)
    return NextResponse.json({ message: "Failed to download template file" }, { status: 500 });

  const buffer = Buffer.from(await fileBlob.arrayBuffer());
  const safeName = tpl.name.replace(/[^a-zA-Z0-9_\- ]/g, "").replace(/\s+/g, "_").slice(0, 60) || "template";

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${safeName}.docx"`,
      "Content-Length": String(buffer.length),
    },
  });
}
