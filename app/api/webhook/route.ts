import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { supabase } from "@/lib/supabase";
import { generateFromTemplate } from "@/lib/generateResume";
import { uploadResumeToDrive } from "@/lib/googleDrive";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Webhook-Secret",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.WEBHOOK_SECRET;
  if (webhookSecret) {
    const provided = request.headers.get("x-webhook-secret");
    if (!provided || provided !== webhookSecret) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
    }
  }

  let job_url: string | undefined;
  let role: string;
  let company_name: string;
  let job_description: string;
  let template_id: string | undefined;

  try {
    ({ job_url, role, company_name, job_description, template_id } = await request.json());
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400, headers: CORS_HEADERS });
  }

  if (!role?.trim() || !company_name?.trim() || !job_description?.trim()) {
    return NextResponse.json(
      { message: "role, company_name, and job_description are required" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const templateId = template_id?.trim() || process.env.DEFAULT_TEMPLATE_ID;
  

  const { data: application, error: insertError } = await supabase
    .from("applications")
    .insert({
      job_url: job_url?.trim() || null,
      role: role.trim(),
      company_name: company_name.trim(),
      job_description: job_description.trim(),
      status: templateId ? "generating" : "pending",
    })
    .select()
    .single();

  if (insertError || !application) {
    return NextResponse.json({ message: insertError?.message ?? "Insert failed" }, { status: 500, headers: CORS_HEADERS });
  }

  if (templateId) {
    after(async () => {
      try {
        const { buffer, filename } = await generateFromTemplate(
          templateId,
          "",
          job_description.trim()
        );

        const driveFilename = `${application.seq ? `${filename.replace(".docx", "")}_${application.seq}` : filename}.docx`
          .replace(".docx.docx", ".docx");
        const { fileId, driveLink } = await uploadResumeToDrive(buffer, driveFilename);

        await supabase
          .from("applications")
          .update({ status: "completed", google_drive_link: driveLink, google_drive_file_id: fileId })
          .eq("id", application.id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await supabase
          .from("applications")
          .update({ status: "failed", error_message: msg })
          .eq("id", application.id);
      }
    });
  }

  return NextResponse.json(application, { status: 202, headers: CORS_HEADERS });
}
