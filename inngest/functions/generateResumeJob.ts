import { inngest } from "../client";
import { generateFromTemplate } from "@/lib/generateResume";
import { supabase } from "@/lib/supabase";

type EventData = {
  jobId: string;
  templateId: string;
  backgroundInfo: string;
  jobDescription: string;
  promptContent?: string;
  contextContent?: string;
  modelId?: string;
};

type JobStatus = "queued" | "generating" | "completed" | "failed";

async function setStatus(jobId: string, status: JobStatus, extra: Record<string, unknown> = {}) {
  await supabase
    .from("resume_jobs")
    .update({ status, updated_at: new Date().toISOString(), ...extra })
    .eq("id", jobId);
}

export const generateResumeJob = inngest.createFunction(
  {
    id: "generate-resume",
    triggers: [{ event: "resume/generate" }],
    concurrency: { limit: 5 },
    retries: 2,
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async ({ event, step }: { event: { data: EventData }; step: any }) => {
    const { jobId, templateId, backgroundInfo, jobDescription, promptContent, contextContent, modelId } =
      event.data;

    await step.run("set-generating", () => setStatus(jobId, "generating"));

    const result = await step.run("generate-resume", () =>
      generateFromTemplate(templateId, backgroundInfo, jobDescription, {
        promptContent,
        contextContent,
        modelId,
      })
    );

    await step.run("set-completed", () =>
      setStatus(jobId, "completed", { file_name: result.filename })
    );

    return { jobId, filename: result.filename };
  }
);
