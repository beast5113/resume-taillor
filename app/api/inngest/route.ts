import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { generateResumeJob } from "@/inngest/functions/generateResumeJob";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateResumeJob],
});
