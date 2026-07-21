import { supabase } from "@/lib/supabase";
import { extractTemplateVariables } from "@/lib/docxTemplater";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/defaultSystemPrompt";

/**
 * Shared prompt-building + answer-parsing helpers used by every code path that
 * turns an application + a docx template into a ChatGPT/OpenAI prompt, or turns
 * an LLM reply back into JSON:
 *   - app/api/batch-builder/[id]/prompt (the "Copy Prompt" button)
 *   - lib/generateResume.ts (the in-app OpenAI generation)
 *   - app/api/autogen/* (the AutoGen extension backend)
 *
 * Keeping these in one place means all three stay in sync - the prompt AutoGen
 * pastes into ChatGPT is byte-for-byte the same as the one the app builds.
 */

/** Builds the user-prompt body from the template's variables + job context. */
export function buildUserPrompt(
  variables: string[],
  backgroundInfo: string,
  jobDescription: string
): string {
  const expCount = variables.filter((v) => /^experience-bullet-group-\d+$/.test(v)).length || 3;
  return `[Target Job Description]
${jobDescription.trim()}

[Resume Template and Candidate Context]
${backgroundInfo.trim() || "(not provided — infer reasonable content from the job description)"}

Template note: generate exactly ${expCount} entries in the experience array (one per job slot).

Return the JSON object now.`;
}

/**
 * Tolerantly extracts a JSON object from an LLM reply, coping with markdown
 * fences or surrounding prose by falling back to the first `{` .. last `}` span.
 */
export function extractJsonAnswer(text: string): Record<string, unknown> {
  const trimmed = String(text ?? "").trim();
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

export interface PromptApplication {
  id: string;
  job_description?: string | null;
  profile_id?: string | null;
}

export interface AssembledPrompt {
  systemPrompt: string;
  userPrompt: string;
  fullPrompt: string;
}

/**
 * Loads `templateId`'s variables (re-extracting from the .docx if the column is
 * empty), resolves the application's profile name, and returns the full
 * system + user prompt (same shape as app/api/batch-builder/[id]/prompt).
 *
 * Returns `null` when the prompt can't be produced - missing template, or the
 * application has no job description - so callers can skip/release cleanly
 * instead of throwing.
 */
export async function assembleFullPrompt(
  templateId: string,
  app: PromptApplication
): Promise<AssembledPrompt | null> {
  if (!templateId || !app.job_description?.trim()) return null;

  const { data: tpl, error: tplError } = await supabase
    .from("docx_templates")
    .select("name, storage_path, variables")
    .eq("id", templateId)
    .single();

  if (tplError || !tpl) return null;

  let variables: string[] =
    Array.isArray(tpl.variables) && tpl.variables.length > 0 ? tpl.variables : [];

  if (variables.length === 0) {
    const { data: fileBlob } = await supabase.storage
      .from("docx-templates")
      .download(tpl.storage_path);
    if (fileBlob) {
      variables = extractTemplateVariables(Buffer.from(await fileBlob.arrayBuffer()));
    }
  }

  let profileName = "";
  if (app.profile_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", app.profile_id)
      .single();
    if (profile) profileName = profile.name ?? "";
  }

  const backgroundInfo = profileName ? `Name: ${profileName}` : "";
  const userPrompt = buildUserPrompt(variables, backgroundInfo, app.job_description);

  const templateContext =
    variables.length > 0 ? `\n[Template Variables]\n${variables.join(", ")}\n` : "";

  const fullPrompt = [
    "========== SYSTEM PROMPT ==========",
    DEFAULT_SYSTEM_PROMPT,
    "",
    "========== USER PROMPT ==========",
    templateContext,
    userPrompt,
  ].join("\n");

  return { systemPrompt: DEFAULT_SYSTEM_PROMPT, userPrompt, fullPrompt };
}
