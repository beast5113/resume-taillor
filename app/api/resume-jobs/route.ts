import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { inngest } from "@/inngest/client";
import type { ResumeData } from "@/lib/types";

export async function POST(request: NextRequest) {
  let resumeData: ResumeData;
  let jobDescription: string;
  let profileId: string | undefined;
  let promptContent: string | undefined;
  let contextContent: string | undefined;
  let modelId: string | undefined;

  try {
    ({ resumeData, jobDescription, profileId, promptContent, contextContent, modelId } =
      await request.json());
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  if (!resumeData?.name?.trim()) {
    return NextResponse.json({ message: "Name is required in resume data" }, { status: 400 });
  }
  if (!jobDescription?.trim()) {
    return NextResponse.json({ message: "Job description is required" }, { status: 400 });
  }

  const { data: job, error } = await supabase
    .from("resume_jobs")
    .insert({
      status: "queued",
      job_description: jobDescription.trim(),
      resume_data: resumeData,
      prompt_content: promptContent ?? null,
      context_content: contextContent ?? null,
      model_id: modelId ?? null,
      profile_id: profileId ?? null,
    })
    .select("id")
    .single();

  if (error || !job) {
    return NextResponse.json(
      { message: error?.message ?? "Failed to create job" },
      { status: 500 }
    );
  }

  try {
    await inngest.send({
      name: "resume/generate",
      data: {
        jobId: job.id,
        resumeData,
        jobDescription: jobDescription.trim(),
        promptContent,
        contextContent,
        modelId,
      },
    });
  } catch (err) {
    // Roll back the queued record so the user can retry
    await supabase.from("resume_jobs").delete().eq("id", job.id);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { message: `Failed to queue background job: ${msg}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, jobId: job.id }, { status: 202 });
}

export async function GET() {
  const { data, error } = await supabase
    .from("resume_jobs")
    .select(
      "id, status, file_name, google_drive_link, error_message, created_at, updated_at"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(data);
}
