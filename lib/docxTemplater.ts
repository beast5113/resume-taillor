// eslint-disable-next-line @typescript-eslint/no-require-imports
const PizZip = require("pizzip");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Docxtemplater = require("docxtemplater");

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
