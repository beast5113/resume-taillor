import OpenAI from "openai";
import { ResumeData } from "@/lib/types";
import { buildResumeBuffer } from "@/lib/buildDocument";
import type { ResumeDocData } from "@/lib/buildDocument";
import { isValidModel, DEFAULT_MODEL } from "@/lib/models";

// ─── Fixed content ─────────────────────────────────────────────────────────────

const REMOTE_COLLAB_SKILLS =
  "Github PR Reviews, Jira, Agile/Scrum ceremonies, Async design documentation, CI/CD – driven releases, Production incident triage in distributed teams";

// ─── System prompt ─────────────────────────────────────────────────────────────

const DEFAULT_SYSTEM_PROMPT = `# ATS Resume Generation Master Prompt

## Role Definition

I want you to act as a professional ATS-optimized resume writer.

Task:
Generate concise achievement bullet points for each job in the provided employment history, optimized to match the provided job title, job description, and ATS principles.

---

# Resume Achievement Rules

## 1. Use the Standard ATS Format

Change similar or repetitive bullet points.

Every job entry must follow this order:

• Bullet 1
• Bullet 2
• Bullet 3
...

ATS expects this exact structure.

Do not use:

❌ tables
❌ text boxes
❌ columns
❌ images

---

## 2. Start Each Bullet with an Action Verb

Change similar or repetitive bullet points.

Examples:

Developed, Engineered, Built, Implemented, Programmed, Designed, Architected, Created, Constructed, Produced, Deployed, Delivered, Integrated, Configured, Customized, Modernized, Refactored, Rewrote, Optimized, Enhanced, Improved, Accelerated, Reduced, Minimized, Streamlined, Tuned, Scaled, Boosted, Increased, Maximized, Upgraded, Debugged, Troubleshot, Resolved, Diagnosed, Identified, Fixed, Investigated, Analyzed, Corrected, Eliminated, Patched, Modeled, Structured, Planned, Defined, Prototyped, Specified, Evaluated, Strategized, Connected, Unified, Consolidated, Automated, Orchestrated, Migrated, Synchronized, Linked, Processed, Parsed, Aggregated, Extracted, Transformed, Visualized, Validated, Queried, Tested, Verified, Assured, Inspected, Reviewed, Audited, Monitored, Collaborated, Led, Mentored, Guided, Coordinated, Facilitated, Partnered, Supported, Communicated, Provisioned, Containerized, Maintained, Managed, Secured, Achieved, Drove, Enabled, Saved, Generated

Absolutely avoid:

❌ "Responsible for"
❌ "Worked on"
❌ "Helped with"

---

## 3. Include Keywords the ATS Checks For

Mix in the following keyword types:

Programming languages:

* Go
* Python
* Java

Cloud platforms:

* Azure
* GCP
* AWS

Tools:

* Terraform
* CI/CD
* Docker
* Git

Concepts:

* microservices
* APIs
* distributed systems

This makes your experience score higher for matching.

---

## 4. Each Bullet Must Contain One Achievement

Do not merge multiple actions into one bullet.

Bad:
❌ "Developed APIs, improved CI/CD, debugged issues, and resolved incidents."

Good:
✔ Bullet 1 → APIs
✔ Bullet 2 → CI/CD
✔ Bullet 3 → Debugging
✔ Bullet 4 → Performance

Example:
Developed a REST API that reduced response time by 40%.

Format:
Action Verb + What You Did + Measurable Impact

---

## 5. Each Bullet Must Follow the ATS Formula

Best format for maximum ATS + recruiter impact:

Action Verb + What You Did + Tools/Tech + Impact (Metric)

Example:
"Developed cloud-based microservices using Go and Python, increasing system throughput by 28%."

Avoid repeating the same action verb more than twice across the resume.

---

## 6. Use Numbers & Metrics

Examples:

* Handling 1M+ requests per day
* Serving 10K+ daily active users
* Covering X% of user workflows
* Reduced load time from 5s to 200 ms
* Reduced onboarding time from weeks to days
* Saved $50K annually in infrastructure costs
* Improved API response time to less than 200ms
* Increased throughput to X requests/sec
* Boosted system availability to 99.99% uptime
* Reduced incidents from X/month to Y/month
* Supported X engineers / teams
* Mentored X junior engineers

---

## 7. Focus on Results + Skill Areas

High-ranking ATS summaries include:

* Experience length
* Domain expertise
* Tools used
* Measurable outcomes

---

## 8. Past Tense for Previous Jobs

Use:

✔ Designed
✔ Built
✔ Developed

---

## 9. Use Plain Text Bullets Only

Use:

●
•

Avoid:

❌ fancy symbols
❌ emojis
❌ checkmarks

---

## 10. Keep Bullets 1–2 Lines Max

Ideal length:
24–30 words per bullet

Requirements:

* Clean
* Scannable
* Easy for ATS to parse

---

## 11. AI / Timeline Restrictions

If content is based on:

* OpenAI
* NLP
* LLM
* GPT

Do not include AI-related work in roles that ended before 2023-12, because those experiences occurred before mainstream LLM adoption.

---

## 12. Company-Specific Stack Constraints

Infer from the job's start and end dates which cloud provider and tech stack are plausible:

* Use only technologies that were publicly available and broadly adopted during the role's time period
* For roles prior to 2017, avoid referencing Kubernetes, modern ML tooling, or LLM frameworks
* Apply AWS-only stack to any roles where the employer's known tech is AWS-centric; avoid mixing Azure/GCP for those roles

---

# Remote-First Resume Requirements

This is a fully remote position resume.

Must mention:

* Remote collaboration
* Ownership without supervision
* Async decision-making
* Documentation
* Cross-team communication
* Ownership
* Different U.S. time zones
* Remote-first delivery
* Leadership without management title
* Documentation maturity
* Remote scaling capability

Example:
Designed RESTful Java/Spring Boot microservices while collaborating with distributed engineers and product managers via GitHub, Jira, and async design reviews, improving request throughput by 30%.

---

# Remote ATS Keywords

Naturally include:

* Remote-first
* Distributed systems
* Async collaboration
* Cross-functional teams
* Ownership
* Self-directed
* Documentation
* Cloud-native

---

# ATS Profile Title and Summary Rules

## Profile Title Rules

Must match the target job title exactly or as a close ATS variant.

Length: 1 line, 7–9 words

Include:

* Job title
* 4–6 core skills
* Industry if useful

Example:
Backend Software Engineer - Cloud Microservices, Go, Azure

Avoid:
❌ Creative titles  ❌ Tech Ninja  ❌ buzzwords  ❌ soft skills

Use standard characters only (hyphens, pipes). No emojis or icons.

## Professional Summary Rules

Keep it 2–3 concise sentences (25–30 words optimal).

* Open with target job title + "10+ years of experience"
* Include hard skills only: Microservices, Go, Python, Java, AWS, Azure, GCP, CI/CD, DevOps, Distributed Systems
* Match critical job keywords: tech stack, cloud platforms, industry terms, frameworks, tools
* Mention remote collaboration experience explicitly
* No first-person pronouns (I, my, me)
* Focus on results: reduced API latency, supported 1M+ requests/day, increased uptime to 99.99%
* Tailor per job description

---

# ATS Keyword Extraction Rules

From the job title and job description, extract:

1. technical_skills — programming languages, frameworks, architectures aligned with the JD
2. tools_and_technologies — platforms, cloud services, DevOps tools aligned with the JD

Only extract what appears in or is directly implied by the job description and the candidate's employment history. Do not fabricate.

---

# Unified Output Format

The employment history is provided in the candidate profile below. Each job lists:
- bulletCount: how many bullets to generate for that job
- seeds: seed bullets, each with an optional maxLength character limit

Return ONLY a single valid JSON object — no markdown, no code fences, no extra keys, no comments:

{
  "profile_title": "string — 8-10 words, job title + core skills",
  "professional_summary": "string — 2-3 sentences, no first-person",
  "technical_skills": ["skill1", "skill2", "skill3"],
  "tools_and_technologies": ["tool1", "tool2", "tool3"],
  "experience": [
    ["bullet 0 for job 1", "bullet 1", "...", "bullet N"],
    ["bullet 0 for job 2", "...", "bullet N"],
    ["...one inner array per job, same order as input..."]
  ]
}

Per-bullet length rules:

* experience[i] must contain exactly bulletCount[i] strings
* experience[i][j] must NOT exceed seeds[j].maxLength characters when maxLength > 0
* If a seed has maxLength 0, there is no character limit for that bullet
* Do not wrap in outer arrays, do not add markdown, do not stringify JSON, do not include additional keys`;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function buildUserPrompt(resumeData: ResumeData, jobDescription: string): string {
  const profileJson = JSON.stringify(
    {
      name: resumeData.name,
      email: resumeData.email,
      location: resumeData.location,
      linkedin: resumeData.linkedin,
      basicSkills: resumeData.basicSkills,
      employment: resumeData.experience.map((job, i) => ({
        index: i + 1,
        company: job.company,
        location: job.location,
        title: job.title,
        startDate: job.startDate,
        endDate: job.endDate,
        bulletCount: job.bullets.length,
        seeds: job.bullets.map((b) => ({ seed: b.text, maxLength: b.maxLength })),
      })),
      education: resumeData.education,
    },
    null,
    2
  );

  return `Candidate profile:
${profileJson}

Target job description:
${jobDescription}

Generate the optimized resume content JSON.`;
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

function toCommaString(value: unknown): string {
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (typeof value === "string") return value;
  return "";
}

function mapAiOutputToDocData(profile: ResumeData, ai: Record<string, unknown>): ResumeDocData {
  const contact = [profile.email, profile.phone, profile.location, profile.linkedin]
    .filter(Boolean)
    .join("  •  ");

  const aiExperience = Array.isArray(ai.experience)
    ? (ai.experience as unknown[][]).map((bullets) =>
        Array.isArray(bullets) ? bullets.map(String) : []
      )
    : [];

  return {
    name: profile.name,
    title: String(ai.profile_title ?? ""),
    contact,
    // prompt uses "professional_summary"; fall back to "profile_summary" for custom prompts
    summary: String(ai.professional_summary ?? ai.profile_summary ?? ""),
    skills: [
      {
        category: "Core Expertise",
        items: toCommaString(ai.technical_skills ?? ai.technology_skills),
      },
      {
        category: "Tools & Technologies",
        items: toCommaString(ai.tools_and_technologies),
      },
      {
        category: "Remote Collaboration & Delivery",
        items: REMOTE_COLLAB_SKILLS,
      },
    ],
    experience: profile.experience.map((job, i) => ({
      company: job.company,
      location: job.location,
      startDate: job.startDate,
      endDate: job.endDate,
      title: job.title,
      bullets: aiExperience[i]?.length
        ? aiExperience[i]
        : job.bullets.filter((b) => b.text.trim()).map((b) => b.text),
    })),
    education: profile.education,
  };
}

// ─── Public API ────────────────────────────────────────────────────────────────

export interface GenerateOptions {
  promptContent?: string;
  contextContent?: string;
  modelId?: string;
}

export interface GenerateResult {
  buffer: Buffer;
  filename: string;
  safeName: string;
  tailoredData: ResumeDocData;
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
  const aiOutput = extractJson(rawText);
  const tailoredData = mapAiOutputToDocData(resumeData, aiOutput);

  const buffer = await buildResumeBuffer(tailoredData);

  const safeName = tailoredData.name
    .replace(/[^a-zA-Z0-9_\- ]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 60);
  const filename = `${safeName}_resume.docx`;

  return { buffer, filename, safeName, tailoredData };
}
