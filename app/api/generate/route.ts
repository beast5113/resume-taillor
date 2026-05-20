import { NextRequest, NextResponse } from "next/server";
import { ResumeData } from "@/lib/types";
import { generateTailoredResume } from "@/lib/generateResume";

export async function POST(request: NextRequest) {
  let resumeData: ResumeData;
  let jobDescription: string;
  let promptContent: string | undefined;
  let contextContent: string | undefined;
  let modelId: string | undefined;
  let templateId: string | undefined;

  try {
    ({ resumeData, jobDescription, promptContent, contextContent, modelId, templateId } =
      await request.json());
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  if (!resumeData?.name?.trim()) {
    return NextResponse.json({ message: "Name is required" }, { status: 400 });
  }
  if (!jobDescription?.trim()) {
    return NextResponse.json({ message: "Job description is required" }, { status: 400 });
  }

  let buffer: Buffer;
  let filename: string;

  try {
    ({ buffer, filename } = await generateTailoredResume(resumeData, jobDescription, {
      promptContent,
      contextContent,
      modelId,
    }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = msg.includes("OPENAI_API_KEY") ? 500 : msg.includes("OpenAI") ? 502 : 500;
    return NextResponse.json({ message: msg }, { status });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Filename": filename,
    },
  });
}
