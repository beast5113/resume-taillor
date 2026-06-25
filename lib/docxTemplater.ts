// eslint-disable-next-line @typescript-eslint/no-require-imports
const PizZip = require("pizzip");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Docxtemplater = require("docxtemplater");

// ─── Structured AI output types ──────────────────────────────────────────────

export interface SkillGroup {
  category: string;
  items: string[];
}

export interface ExperienceEntry {
  role_title: string;
  role_summary?: string;
  key_technologies?: string[];
  bullet_points: string[];
  bold_words: string[];
}

export interface StructuredAIOutput {
  profile_title: string;
  profile_summary: string;
  skills: SkillGroup[];
  experience: ExperienceEntry[];
}

// ─── XML helpers for structured rendering ────────────────────────────────────

function xmlEscape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paraPlainText(paraXml: string): string {
  return paraXml
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"');
}

function getParagraphPr(paraXml: string): string {
  return paraXml.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)?.[0] ?? "";
}

function getFirstRunPr(paraXml: string): string {
  for (const r of paraXml.matchAll(/<w:r\b[^>]*>[\s\S]*?<\/w:r>/g)) {
    const m = r[0].match(/<w:rPr>([\s\S]*?)<\/w:rPr>/);
    if (m) return m[0];
  }
  return "";
}

function buildRun(text: string, bold: boolean, baseRPr: string): string {
  if (!text) return "";
  let inner = baseRPr.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/)?.[1] ?? "";
  inner = inner.replace(/<w:b\s*\/>/g, "").replace(/<w:bCs\s*\/>/g, "");
  if (bold) inner = `<w:b/><w:bCs/>${inner}`;
  const rPrXml = inner ? `<w:rPr>${inner}</w:rPr>` : "";
  const needsSpace = text.startsWith(" ") || text.endsWith(" ");
  return `<w:r>${rPrXml}<w:t${needsSpace ? ' xml:space="preserve"' : ""}>${xmlEscape(text)}</w:t></w:r>`;
}

function buildBoldRuns(text: string, boldWords: string[], rPr: string): string {
  if (!boldWords?.length) return buildRun(text, false, rPr);
  const sorted = [...boldWords].sort((a, b) => b.length - a.length);
  const pattern = sorted.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const boldSet = new Set(boldWords.map((w) => w.toLowerCase()));
  return text
    .split(new RegExp(`(${pattern})`, "gi"))
    .filter(Boolean)
    .map((part) => buildRun(part, boldSet.has(part.toLowerCase()), rPr))
    .join("");
}

export function isStructuredOutput(obj: Record<string, unknown>): boolean {
  return Array.isArray(obj["skills"]) && Array.isArray(obj["experience"]);
}

export function mapStructuredToFlat(structured: StructuredAIOutput): Record<string, string> {
  const flat: Record<string, string> = {};
  if (structured.profile_title) flat["profile-title"] = structured.profile_title;
  if (structured.profile_summary) flat["profile-summary"] = structured.profile_summary;
  structured.experience?.forEach((exp, i) => {
    flat[`role-title-${i + 1}`] = exp.role_title ?? "";
  });
  return flat;
}

/**
 * Returns the set of template variable names that are covered by a parsed JSON value,
 * handling both the new structured format and the legacy flat format.
 */
export function getJsonCoveredVars(parsed: Record<string, unknown>): Set<string> {
  if (!isStructuredOutput(parsed)) {
    return new Set(Object.keys(parsed));
  }
  const s = parsed as unknown as StructuredAIOutput;
  const covered = new Set<string>();
  if (s.profile_title) covered.add("profile-title");
  if (s.profile_summary) covered.add("profile-summary");
  if (s.skills?.length) {
    covered.add("skills-group-category");
    covered.add("skillset-list");
  }
  s.experience?.forEach((exp, i) => {
    if (exp.role_title) covered.add(`role-title-${i + 1}`);
    if (exp.bullet_points?.length) covered.add(`experience-bullet-group-${i + 1}`);
  });
  return covered;
}

function expandParagraphInXml(
  xml: string,
  placeholder: string,
  build: (pPr: string, rPr: string) => string
): string {
  for (const m of xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)) {
    if (paraPlainText(m[0]).includes(`<<${placeholder}>>`)) {
      const expanded = build(getParagraphPr(m[0]), getFirstRunPr(m[0]));
      return xml.slice(0, m.index) + expanded + xml.slice((m.index ?? 0) + m[0].length);
    }
  }
  return xml;
}

/**
 * Extracts all <<variable>> placeholder names from a DOCX buffer.
 * In DOCX XML, angle brackets are stored as &lt;&lt;name&gt;&gt;.
 */
export function extractTemplateVariables(buffer: Buffer): string[] {
  const zip = new PizZip(buffer);
  const variables = new Set<string>();

  for (const [filename, file] of Object.entries(zip.files) as [string, { asText(): string }][]) {
    if (filename.startsWith("word/") && filename.endsWith(".xml") && !filename.includes("_rels")) {
      const xml = file.asText();
      // Strip XML tags so variables split across multiple <w:r> runs become contiguous text
      const text = xml.replace(/<[^>]+>/g, "");
      // Angle brackets are stored as &lt;&lt;name&gt;&gt; in DOCX XML
      // &lt;&lt; = 8 chars, &gt;&gt; = 8 chars
      const matches = text.match(/&lt;&lt;([^&<>\s]+)&gt;&gt;/g) ?? [];
      for (const m of matches) {
        variables.add(m.slice(8, -8));
      }
    }
  }

  return [...variables].sort();
}

/**
 * Renders a DOCX template using structured AI output.
 * - Skills: the row containing <<skills-group-category>> is duplicated for each
 *   skill group, with the category bold and items plain.
 * - Bullet groups: each <<experience-bullet-group-N>> paragraph is expanded into
 *   one paragraph per bullet, with bold_words bolded inside the text.
 * - All remaining flat variables are filled via docxtemplater.
 */
export function renderDocxTemplateStructured(
  templateBuffer: Buffer,
  structured: StructuredAIOutput,
  flatData: Record<string, string>
): Buffer {
  const zip = new PizZip(templateBuffer);
  let xml = (zip.files["word/document.xml"] as { asText(): string }).asText();

  // Expand skills rows
  if (structured.skills?.length) {
    xml = expandParagraphInXml(xml, "skills-group-category", (pPr, rPr) =>
      structured.skills
        .map(
          (s) =>
            `<w:p>${pPr}${buildRun(s.category + ": ", true, rPr)}${buildRun(
              s.items.join(", "),
              false,
              rPr
            )}</w:p>`
        )
        .join("")
    );
  }

  // Expand bullet groups
  structured.experience?.forEach((exp, i) => {
    if (exp.bullet_points?.length) {
      xml = expandParagraphInXml(xml, `experience-bullet-group-${i + 1}`, (pPr, rPr) =>
        exp.bullet_points
          .map((b) => `<w:p>${pPr}${buildBoldRuns(b, exp.bold_words ?? [], rPr)}</w:p>`)
          .join("")
      );
    }
  });

  zip.file("word/document.xml", xml);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "<<", end: ">>" },
    nullGetter: () => "",
    parser: (tag: string) => ({
      get(scope: Record<string, unknown>) {
        return tag === "." ? scope : String(scope[tag] ?? "");
      },
    }),
  });
  doc.render(flatData);

  return doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" }) as Buffer;
}

/**
 * Fills a DOCX template using <<variable>> placeholders with docxtemplater.
 * Uses a direct property-lookup parser so variable names with hyphens and
 * numbers (e.g. <<experience-1-3>>) work correctly.
 */
export function renderDocxTemplate(
  templateBuffer: Buffer,
  data: Record<string, string>
): Buffer {
  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "<<", end: ">>" },
    nullGetter: () => "",
    parser: (tag: string) => ({
      get(scope: Record<string, unknown>) {
        if (tag === ".") return scope;
        return String(scope[tag] ?? "");
      },
    }),
  });

  doc.render(data);

  return doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" }) as Buffer;
}
