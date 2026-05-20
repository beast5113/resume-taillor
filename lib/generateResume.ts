import OpenAI from "openai";
import { ResumeData } from "@/lib/types";
import { buildResumeBuffer, ResumeDocData } from "@/lib/buildDocument";
import { isValidModel, DEFAULT_MODEL } from "@/lib/models";

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

export interface GenerateOptions {
  promptContent?: string;
  contextContent?: string;
  modelId?: string;
}

export interface GenerateResult {
  buffer: Buffer;
  filename: string;
  safeName: string;
  tailoredData: Record<string, unknown>;
}

export async function generateTailoredResume(
  resumeData: ResumeData,
  jobDescription: string,
  options: GenerateOptions = {}
): Promise<GenerateResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "your_key_here") {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const { promptContent, contextContent, modelId } = options;

  const systemPrompt = promptContent?.trim() || DEFAULT_SYSTEM_PROMPT;
  const userPrompt = contextContent?.trim()
    ? `Additional context about the target role:\n${contextContent.trim()}\n\n${buildUserPrompt(resumeData, jobDescription)}`
    : buildUserPrompt(resumeData, jobDescription);

  const openai = new OpenAI({ apiKey });
  const model =
    (modelId && isValidModel(modelId) ? modelId : null) ??
    process.env.OPENAI_MODEL ??
    DEFAULT_MODEL;
  const reasoningEffort = process.env.REASONING_EFFORT || "medium";

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
  const rawText = (response as any).choices?.[0]?.message?.content ?? "";

  const tailoredData = extractJson(rawText);

  const buffer = await buildResumeBuffer(tailoredData as unknown as ResumeDocData);

  const safeName = String(tailoredData.name ?? "resume")
    .replace(/[^a-zA-Z0-9_\- ]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 60);
  const filename = `${safeName}_resume.docx`;

  return { buffer, filename, safeName, tailoredData };
}
