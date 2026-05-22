import { inngest } from "../client";
import { generateTailoredResume } from "@/lib/generateResume";
import { uploadResumeToDrive } from "@/lib/googleDrive";
import { supabase } from "@/lib/supabase";
import type { ResumeData } from "@/lib/types";

type EventData = {
  jobId: string;
  resumeData: ResumeData;
  jobDescription: string;
  promptContent?: string;
  contextContent?: string;
  modelId?: string;
};

type JobStatus = "queued" | "generating" | "uploading" | "completed" | "failed";

async function setStatus(
  jobId: string,
  status: JobStatus,
  extra: Record<string, unknown> = {}
) {
  await supabase
    .from("resume_jobs")
    .update({ status, updated_at: new Date().toISOString(), ...extra })
    .eq("id", jobId);
}

export const generateResumeJob = inngest.createFunction(
  {
    id: "generate-resume",
    triggers: [{ event: "resume/generate" }],
    concurrency: { limit: 10 },
    retries: 2,
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async ({ event, step }: { event: { data: EventData }; step: any }) => {
    const { jobId, resumeData, jobDescription, promptContent, contextContent, modelId } =
      event.data;

    await step.run("set-generating", () => setStatus(jobId, "generating"));

    const result = await step.run("generate-resume", () =>
      generateTailoredResume(resumeData, jobDescription, {
        promptContent,
        contextContent,
        modelId,
      })
    );

    await step.run("set-uploading", () => setStatus(jobId, "uploading"));

    const { fileId, driveLink } = await step.run("upload-to-drive", () =>
      uploadResumeToDrive(result.buffer, result.filename)
    );

    await step.run("set-completed", () =>
      setStatus(jobId, "completed", {
        google_drive_file_id: fileId,
        google_drive_link: driveLink,
        file_name: result.filename,
      })
    );

    return { jobId, fileId, driveLink };
  }
);
