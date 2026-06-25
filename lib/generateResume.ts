import OpenAI from "openai";
import { supabase } from "@/lib/supabase";
import {
  renderDocxTemplate,
  renderDocxTemplateStructured,
  extractTemplateVariables,
  isStructuredOutput,
  mapStructuredToFlat,
  type StructuredAIOutput,
} from "@/lib/docxTemplater";
import { isValidModel, DEFAULT_MODEL } from "@/lib/models";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/defaultSystemPrompt";


function buildUserPrompt(
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
}

export async function generateFromTemplate(
  templateId: string,
  backgroundInfo: string,
  jobDescription: string,
  options: GenerateOptions = {}
): Promise<GenerateResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "your_key_here") {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  // Fetch template metadata + file from Supabase
  const { data: tpl, error: tplError } = await supabase
    .from("docx_templates")
    .select("name, storage_path, variables")
    .eq("id", templateId)
    .single();

  if (tplError || !tpl) throw new Error(`Template not found: ${templateId}`);

  const { data: fileBlob, error: dlError } = await supabase.storage
    .from("docx-templates")
    .download(tpl.storage_path);

  if (dlError || !fileBlob) throw new Error("Failed to download DOCX template from storage");

  const templateBuffer = Buffer.from(await fileBlob.arrayBuffer());

  // Use stored variables, or re-extract if column is empty
  const variables: string[] =
    Array.isArray(tpl.variables) && tpl.variables.length > 0
      ? tpl.variables
      : extractTemplateVariables(templateBuffer);

  if (variables.length === 0) throw new Error("No <<variable>> placeholders found in template");

  const { promptContent, contextContent, modelId } = options;
  const systemPrompt = promptContent?.trim() || DEFAULT_SYSTEM_PROMPT;
  const baseUserPrompt = buildUserPrompt(variables, backgroundInfo, jobDescription);
  const userPrompt = contextContent?.trim()
    ? `Additional context:\n${contextContent.trim()}\n\n${baseUserPrompt}`
    : baseUserPrompt;

  const model =
    (modelId && isValidModel(modelId) ? modelId : null) ??
    process.env.OPENAI_MODEL ??
    DEFAULT_MODEL;
  const isReasoningModel = /^o\d|thinking/i.test(model);
  const reasoningEffort = process.env.REASONING_EFFORT || "medium";

  const openai = new OpenAI({ apiKey });
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
  const aiValues = extractJson(rawText);

  let buffer: Buffer;
  let nameForFile: string;

  if (isStructuredOutput(aiValues)) {
    const structured = aiValues as unknown as StructuredAIOutput;
    const flatData = mapStructuredToFlat(structured);
    buffer = renderDocxTemplateStructured(templateBuffer, structured, flatData);
    nameForFile = tpl.name;
  } else {
    const flatValues = aiValues as Record<string, string>;
    buffer = renderDocxTemplate(templateBuffer, flatValues);
    nameForFile = String(aiValues["name"] ?? tpl.name);
  }

  const safeName = nameForFile
    .replace(/[^a-zA-Z0-9_\- ]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 60);

  return { buffer, filename: `${safeName}_resume.docx` };
}
