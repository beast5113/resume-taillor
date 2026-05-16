import {
  Document, Packer, Paragraph, TextRun,
  AlignmentType, TabStopType, LevelFormat, BorderStyle,
} from "docx";
import { ResumeDocData } from "./types";

const PAGE_W = 12240;
const PAGE_H = 15840;
const MARGIN = 1080;
const CONTENT_W = PAGE_W - MARGIN * 2;
const ACCENT = "1D4ED8";   // blue-700
const MUTED   = "6B7280";  // gray-500

function header(name: string, title: string, contact: string) {
  return new Paragraph({
    spacing: { before: 0, after: 120, line: 276, lineRule: "auto" },
    children: [
      new TextRun({ text: name, bold: true, size: 36, font: "Calibri" }),
      new TextRun({ text: "", break: 1 }),
      new TextRun({ text: title, size: 21, font: "Calibri", color: "374151" }),
      new TextRun({ text: "   |   ", size: 21, font: "Calibri", color: "D1D5DB" }),
      new TextRun({ text: contact, size: 20, font: "Calibri", color: MUTED }),
    ],
  });
}

function sectionHeader(text: string) {
  return new Paragraph({
    border: { left: { style: BorderStyle.THICK, size: 24, color: ACCENT, space: 8 } },
    indent: { left: 120 },
    spacing: { before: 240, after: 60 },
    children: [new TextRun({ text, font: "Calibri", bold: true, allCaps: true, size: 19, color: ACCENT })],
  });
}

function skillLine(category: string, items: string) {
  return new Paragraph({
    spacing: { before: 40, after: 0 },
    children: [
      new TextRun({ text: category + ": ", bold: true, size: 20, font: "Calibri", color: "111827" }),
      new TextRun({ text: items, size: 20, font: "Calibri", color: "374151" }),
    ],
  });
}

function jobHeaderLine(company: string, location: string, start: string, end: string) {
  return new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W }],
    spacing: { before: 120, after: 0 },
    children: [
      new TextRun({ text: company, bold: true, size: 21, font: "Calibri" }),
      new TextRun({ text: ` · ${location}`, size: 20, font: "Calibri", color: MUTED }),
      new TextRun({ text: "\t", size: 20, font: "Calibri" }),
      new TextRun({ text: `${start} – ${end}`, size: 20, font: "Calibri", color: MUTED }),
    ],
  });
}

function jobTitleLine(title: string) {
  return new Paragraph({
    spacing: { before: 0, after: 0 },
    children: [new TextRun({ text: title, italics: true, size: 20, font: "Calibri", color: ACCENT })],
  });
}

function bullet(text: string) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { before: 0, after: 40 },
    children: [new TextRun({ text, size: 20, font: "Calibri" })],
  });
}

function eduEntry(degree: string, school: string, start: string, end: string, gpa?: string) {
  const gradeRun = gpa ? [new TextRun({ text: `  GPA: ${gpa}`, size: 20, font: "Calibri", color: MUTED })] : [];
  return [
    new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W }],
      spacing: { before: 80, after: 0 },
      children: [
        new TextRun({ text: degree, size: 20, font: "Calibri" }),
        new TextRun({ text: "\t", size: 20 }),
        new TextRun({ text: `${start} – ${end}`, size: 20, font: "Calibri", color: MUTED }),
      ],
    }),
    new Paragraph({
      spacing: { before: 0, after: 0 },
      children: [new TextRun({ text: school, bold: true, size: 20, font: "Calibri" }), ...gradeRun],
    }),
  ];
}

export async function buildModern(data: ResumeDocData): Promise<Buffer> {
  const children: Paragraph[] = [];
  children.push(header(data.name, data.title, data.contact));
  children.push(sectionHeader("Summary"));
  children.push(new Paragraph({ spacing: { before: 40, after: 60 }, children: [new TextRun({ text: data.summary, size: 20, font: "Calibri" })] }));
  children.push(sectionHeader("Skills"));
  data.skills.forEach(({ category, items }) => children.push(skillLine(category, items)));
  children.push(sectionHeader("Professional Experience"));
  data.experience.forEach((job) => {
    children.push(jobHeaderLine(job.company, job.location, job.startDate, job.endDate));
    children.push(jobTitleLine(job.title));
    job.bullets.forEach((b) => children.push(bullet(b)));
  });
  children.push(sectionHeader("Education"));
  data.education.forEach((edu) => eduEntry(edu.degree, edu.school, edu.startDate, edu.endDate, edu.gpa).forEach((p) => children.push(p)));

  return Buffer.from(await Packer.toBuffer(new Document({
    numbering: { config: [{ reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "›", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 360 } } } }] }] },
    sections: [{ properties: { page: { size: { width: PAGE_W, height: PAGE_H }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } }, children }],
  })));
}
