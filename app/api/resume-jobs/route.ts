import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { inngest } from "@/inngest/client";

export async function POST(request: NextRequest) {
  let templateId: string;
  let backgroundInfo: string;
  let jobDescription: string;
  let promptContent: string | undefined;
  let contextContent: string | undefined;
  let modelId: string | undefined;

  try {
    ({
      templateId,
      backgroundInfo,
      jobDescription,
      promptContent,
      contextContent,
      modelId,
    } = await request.json());
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  if (!templateId?.trim()) {
    return NextResponse.json({ message: "A template must be selected" }, { status: 400 });
  }
  if (!backgroundInfo?.trim()) {
    return NextResponse.json({ message: "Background info is required" }, { status: 400 });
  }
  if (!jobDescription?.trim()) {
    return NextResponse.json({ message: "Job description is required" }, { status: 400 });
  }

  const { data: job, error } = await supabase
    .from("resume_jobs")
    .insert({
      status: "queued",
      job_description: jobDescription.trim(),
      prompt_content: promptContent ?? null,
      context_content: contextContent ?? null,
      model_id: modelId ?? null,
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
        templateId: templateId.trim(),
        backgroundInfo: backgroundInfo.trim(),
        jobDescription: jobDescription.trim(),
        promptContent,
        contextContent,
        modelId,
      },
    });
  } catch (err) {
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
