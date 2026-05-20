import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { supabase } from "@/lib/supabase";
import { generateTailoredResume } from "@/lib/generateResume";
import { uploadResumeToDrive } from "@/lib/googleDrive";
import { ResumeData } from "@/lib/types";

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

  try {
    ({ job_url, role, company_name, job_description } = await request.json());
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400, headers: CORS_HEADERS });
  }

  if (!role?.trim() || !company_name?.trim() || !job_description?.trim()) {
    return NextResponse.json(
      { message: "role, company_name, and job_description are required" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, resume_data")
    .order("created_at", { ascending: true })
    .limit(1);

  if (profileError || !profiles?.length) {
    return NextResponse.json(
      { message: "No profile found. Create a profile first." },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  const profile = profiles[0];

  const { data: application, error: insertError } = await supabase
    .from("applications")
    .insert({
      job_url: job_url?.trim() || null,
      role: role.trim(),
      company_name: company_name.trim(),
      job_description: job_description.trim(),
      profile_id: profile.id,
      status: "generating",
    })
    .select()
    .single();

  if (insertError || !application) {
    return NextResponse.json({ message: insertError?.message ?? "Insert failed" }, { status: 500, headers: CORS_HEADERS });
  }

  after(async () => {
    try {
      const { buffer, safeName } = await generateTailoredResume(
        profile.resume_data as ResumeData,
        job_description.trim()
      );

      const driveFilename = `${safeName}_${application.seq}.docx`;
      const { fileId, driveLink } = await uploadResumeToDrive(buffer, driveFilename);

      await supabase
        .from("applications")
        .update({
          status: "completed",
          google_drive_link: driveLink,
          google_drive_file_id: fileId,
        })
        .eq("id", application.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await supabase
        .from("applications")
        .update({ status: "failed", error_message: msg })
        .eq("id", application.id);
    }
  });

  return NextResponse.json(application, { status: 202, headers: CORS_HEADERS });
}
