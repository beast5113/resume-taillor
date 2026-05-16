import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { ResumeData } from "@/lib/types";
import { buildResumeBuffer, ResumeDocData } from "@/lib/buildDocument";
import { buildFromConfig } from "@/lib/templates/configToDocx";
import { isValidModel, DEFAULT_MODEL } from "@/lib/models";
import { supabase } from "@/lib/supabase";

const DEFAULT_SYSTEM_PROMPT = `You are a senior resume writer and ATS optimization specialist. Your task is to receive a candidate's structured resume data as JSON and a target job description, then return a fully rewritten ATS-optimized version of that resume as JSON, tailored to the job.

## Structural Preservation — Non-Negotiable

You MUST preserve exactly:
- The candidate's full name and contact string (copy verbatim, do not alter)
- Every employer, company name, and location
- Every job title (minor ATS refinement of wording is allowed if it improves keyword match without misrepresenting the role)
- All employment date ranges (startDate, endDate) — copy exactly
- The same number of experience entries in the same order
- The same approximate number of bullet points per role (±1 is acceptable)
- All education entries: degree, school, dates, GPA — copy exactly
- Do NOT invent employers, certifications, degrees, or projects
- Do NOT create or remove employment gaps

## ATS Optimization

Extract and naturally integrate these keyword types from the job description:
- Required and preferred technical skills
- Frameworks, tools, platforms, cloud services
- Methodologies (Agile, CI/CD, etc.)
- Architecture and infrastructure terminology
- Domain-specific language and exact acronyms
- Seniority signals (led, architected, owned, scaled)

Distribute keywords across: title, summary, skills section, and experience bullets — especially in the most recent roles.

## Timeline Realism

Technologies must only appear in roles where their usage is historically plausible. Apply GA+3 month realism: do not reference tools, platforms, or frameworks before they were publicly available and broadly adopted. If uncertain, favor older stable technologies. Seniority language must match the experience level for each time period.

## Bullet Writing Quality

Rewrite every experience bullet to be:
- Concise, impact-first, and technically credible
- Free of first-person language and filler phrases
- Varied in action verbs (avoid repeating the same verb across bullets)
- Emphasizing: scalability, performance, reliability, automation, architecture, cloud infrastructure, CI/CD, distributed systems, observability, and production impact where relevant

At least 80% of bullets must contain a measurable or concrete impact: scale numbers, latency/throughput improvements, cost savings, deployment velocity, uptime, team size, user scale, or business outcomes. Metrics must be believable given the company and role — do not exaggerate. Prefer operational and business context over vague percentages.

## Summary

Rewrite to 2–3 tight sentences that:
- Open with the candidate's core identity and years of experience
- Connect their strongest technical background to the target role's key requirements
- Close with a concrete differentiator or impact signal

## Skills Section

- Reorder categories so the most job-relevant appear first
- Within each category, list the most relevant items first
- Only include technologies that appear in the candidate's experience timeline or are clearly aligned with the job requirements
- Do not fabricate skills not supported by the resume

## Writing Tone

Modern senior-engineer resume voice: concise, technical, metric-driven, recruiter-readable, and ATS-friendly. No pronouns, no first-person, no buzzword padding, no paragraphs longer than the original.

## Output Format

Return ONLY a valid JSON object — no markdown, no code fences, no commentary, no explanation. The JSON must match this exact structure:
{
  "name": "Full Name (copy verbatim from input)",
  "title": "Professional Title optimized for target role",
  "contact": "copy verbatim from input",
  "summary": "2–3 sentence tailored summary",
  "skills": [
    { "category": "Category Name", "items": "skill1, skill2, skill3" }
  ],
  "experience": [
    {
      "company": "Company Name (copy verbatim)",
      "location": "City, ST (Remote/Hybrid/On-site) (copy verbatim)",
      "startDate": "MM/YYYY (copy verbatim)",
      "endDate": "MM/YYYY or Present (copy verbatim)",
      "title": "Job Title",
      "bullets": [
        "Strong action verb + achievement + measurable impact",
        "Strong action verb + achievement + measurable impact"
      ]
    }
  ],
  "education": [
    {
      "degree": "Degree Type, Field of Study (copy verbatim)",
      "school": "Institution Name (copy verbatim)",
      "startDate": "MM/YYYY (copy verbatim)",
      "endDate": "MM/YYYY (copy verbatim)",
      "gpa": "X.X/4.0 (copy verbatim if present)"
    }
  ]
}`;

function buildUserPrompt(resumeData: ResumeData, jobDescription: string): string {
  const resumeJson = JSON.stringify(
    {
      name: resumeData.name,
      title: resumeData.title,
      contact: resumeData.contact,
      summary: resumeData.summary,
      skills: resumeData.skills,
      experience: resumeData.experience,
      education: resumeData.education,
    },
    null,
    2
  );

  return `Here is the candidate's current resume data:
${resumeJson}

Here is the job description to tailor for:
${jobDescription}

Tailor the resume to best match this specific job. Return the tailored resume as JSON.`;
}

function extractJson(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Could not parse JSON from model response");
  }
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "your_key_here") {
    return NextResponse.json(
      { message: "OPENAI_API_KEY is not configured in .env.local" },
      { status: 500 }
    );
  }

  let resumeData: ResumeData;
  let jobDescription: string;
  let promptContent: string | undefined;
  let contextContent: string | undefined;
  let modelId: string | undefined;
  let templateId: string | undefined;

  try {
    ({ resumeData, jobDescription, promptContent, contextContent, modelId, templateId } = await request.json());
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  if (!resumeData?.name?.trim()) {
    return NextResponse.json({ message: "Name is required" }, { status: 400 });
  }
  if (!jobDescription?.trim()) {
    return NextResponse.json({ message: "Job description is required" }, { status: 400 });
  }

  const systemPrompt = promptContent?.trim() || DEFAULT_SYSTEM_PROMPT;
  const userPrompt = contextContent?.trim()
    ? `Additional context about the target role:\n${contextContent.trim()}\n\n${buildUserPrompt(resumeData, jobDescription)}`
    : buildUserPrompt(resumeData, jobDescription);

  const openai = new OpenAI({ apiKey });
  const model = (modelId && isValidModel(modelId) ? modelId : null)
    ?? process.env.OPENAI_MODEL
    ?? DEFAULT_MODEL;
  const reasoningEffort = process.env.REASONING_EFFORT || "medium";

  let rawText: string;
  try {
    const isReasoningModel = /^o\d|thinking/i.test(model);

    const messages: Parameters<typeof openai.chat.completions.create>[0]["messages"] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    const response = await (isReasoningModel
      ? openai.chat.completions.create({
          model,
          messages,
          // @ts-expect-error reasoning_effort is valid on reasoning models
          reasoning_effort: reasoningEffort,
        })
      : openai.chat.completions.create({
          model,
          messages,
          response_format: { type: "json_object" },
        }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rawText = (response as any).choices?.[0]?.message?.content ?? "";
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ message: `OpenAI error: ${msg}` }, { status: 502 });
  }

  let tailoredData: Record<string, unknown>;
  try {
    tailoredData = extractJson(rawText);
  } catch {
    return NextResponse.json(
      { message: "Model returned invalid JSON. Try again." },
      { status: 502 }
    );
  }

  let buffer: Buffer;
  try {
    const isCustomTemplate = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(templateId ?? "");
    if (isCustomTemplate) {
      const { data: tmpl, error } = await supabase.from("templates").select("config").eq("id", templateId).single();
      if (error || !tmpl) throw new Error("Custom template not found");
      buffer = await buildFromConfig(tailoredData as unknown as ResumeDocData, tmpl.config);
    } else {
      buffer = await buildResumeBuffer(tailoredData as unknown as ResumeDocData, templateId);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ message: `DOCX generation error: ${msg}` }, { status: 500 });
  }

  const safeName = String(tailoredData.name ?? "resume")
    .replace(/[^a-zA-Z0-9_\- ]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 60);
  const filename = `${safeName}_resume.docx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Filename": filename,
    },
  });
}
