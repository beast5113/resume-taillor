import {
  Document, Packer, Paragraph, TextRun,
  AlignmentType, TabStopType, LevelFormat, BorderStyle,
} from "docx";
import { ResumeDocData } from "./types";

const PAGE_W   = 12240;
const PAGE_H   = 15840;
const MARGIN   = 1080;
const CONTENT_W = PAGE_W - MARGIN * 2;
const GRAY_DIM  = "9CA3AF";
const GRAY_MED  = "4B5563";
const GRAY_RULE = "E5E7EB";

function header(name: string, title: string, contact: string) {
  return new Paragraph({
    spacing: { before: 0, after: 140, line: 276, lineRule: "auto" },
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: GRAY_RULE, space: 8 } },
    children: [
      new TextRun({ text: name, bold: true, size: 30 }),
      new TextRun({ text: "", break: 1 }),
      new TextRun({ text: title, size: 20, italics: true, color: GRAY_MED }),
      new TextRun({ text: "", break: 1 }),
      new TextRun({ text: contact, size: 18, color: GRAY_DIM }),
    ],
  });
}

function sectionHeader(text: string) {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: GRAY_RULE, space: 4 } },
    spacing: { before: 220, after: 60 },
    children: [new TextRun({ text, bold: true, size: 18, allCaps: true, color: GRAY_MED })],
  });
}

function skillLine(category: string, items: string) {
  return new Paragraph({
    spacing: { before: 50, after: 0 },
    children: [
      new TextRun({ text: category + ": ", bold: true, size: 19, color: "1F2937" }),
      new TextRun({ text: items, size: 19, color: GRAY_MED }),
    ],
  });
}

function jobHeaderLine(company: string, location: string, start: string, end: string) {
  return new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W }],
    spacing: { before: 120, after: 0 },
    children: [
      new TextRun({ text: company, bold: true, size: 20 }),
      new TextRun({ text: `  ${location}`, size: 19, color: GRAY_DIM }),
      new TextRun({ text: "\t", size: 19 }),
      new TextRun({ text: `${start} – ${end}`, size: 18, color: GRAY_DIM }),
    ],
  });
}

function jobTitleLine(title: string) {
  return new Paragraph({
    spacing: { before: 0, after: 0 },
    children: [new TextRun({ text: title, italics: true, size: 19, color: GRAY_MED })],
  });
}

function bullet(text: string) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { before: 0, after: 50 },
    children: [new TextRun({ text, size: 19, color: "1F2937" })],
  });
}

function eduEntry(degree: string, school: string, start: string, end: string, gpa?: string) {
  const gradeRun = gpa ? [new TextRun({ text: `  GPA: ${gpa}`, size: 19, color: GRAY_DIM })] : [];
  return [
    new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W }],
      spacing: { before: 80, after: 0 },
      children: [
        new TextRun({ text: degree, size: 19 }),
        new TextRun({ text: "\t", size: 19 }),
        new TextRun({ text: `${start} – ${end}`, size: 18, color: GRAY_DIM }),
      ],
    }),
    new Paragraph({
      spacing: { before: 0, after: 0 },
      children: [new TextRun({ text: school, bold: true, size: 19, color: GRAY_MED }), ...gradeRun],
    }),
  ];
}

export async function buildMinimal(data: ResumeDocData): Promise<Buffer> {
  const children: Paragraph[] = [];
  children.push(header(data.name, data.title, data.contact));
  children.push(sectionHeader("Summary"));
  children.push(new Paragraph({ spacing: { before: 40, after: 80 }, children: [new TextRun({ text: data.summary, size: 19, color: GRAY_MED })] }));
  children.push(sectionHeader("Skills"));
  data.skills.forEach(({ category, items }) => children.push(skillLine(category, items)));
  children.push(sectionHeader("Experience"));
  data.experience.forEach((job) => {
    children.push(jobHeaderLine(job.company, job.location, job.startDate, job.endDate));
    children.push(jobTitleLine(job.title));
    job.bullets.forEach((b) => children.push(bullet(b)));
  });
  children.push(sectionHeader("Education"));
  data.education.forEach((edu) => eduEntry(edu.degree, edu.school, edu.startDate, edu.endDate, edu.gpa).forEach((p) => children.push(p)));

  return Buffer.from(await Packer.toBuffer(new Document({
    numbering: { config: [{ reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "·", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 300, hanging: 300 } } } }] }] },
    sections: [{ properties: { page: { size: { width: PAGE_W, height: PAGE_H }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } }, children }],
  })));
}
