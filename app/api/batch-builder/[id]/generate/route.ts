import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireSession } from "@/lib/auth";
import { generateFromTemplate } from "@/lib/generateResume";
import { buildResumeFilename } from "@/lib/resumeFilename";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  let templateId: string;
  try {
    ({ templateId } = await request.json());
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  if (!templateId?.trim())
    return NextResponse.json({ message: "templateId is required" }, { status: 400 });

  const { data: app } = await supabase
    .from("applications")
    .select("id, role, company_name, job_description, profile_id, status")
    .eq("id", id)
    .single();

  if (!app) return NextResponse.json({ message: "Application not found" }, { status: 404 });

  if (!app.job_description?.trim())
    return NextResponse.json({ message: "No job description available for this application" }, { status: 400 });

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

  const backgroundInfo = profileName ? `Name: ${profileName}` : "";

  let buffer: Buffer;
  let filename: string;

  try {
    ({ buffer, filename } = await generateFromTemplate(templateId, backgroundInfo, app.job_description, { role: app.role }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ message: msg }, { status: 500 });
  }

  const driveFilename = buildResumeFilename(
    profileFirstName,
    profileLastName,
    profileName,
    app.company_name,
    filename.replace(/\.docx$/i, "")
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${driveFilename}"`,
      "X-Filename": driveFilename,
    },
  });
}
