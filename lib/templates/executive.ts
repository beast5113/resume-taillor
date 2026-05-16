import {
  Document, Packer, Paragraph, TextRun,
  AlignmentType, TabStopType, LevelFormat, BorderStyle,
} from "docx";
import { ResumeDocData } from "./types";

const PAGE_W  = 12240;
const PAGE_H  = 15840;
const MARGIN  = 1296;  // 0.9 in — slightly wider margins for formal look
const CONTENT_W = PAGE_W - MARGIN * 2;

function header(name: string, title: string, contact: string) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    border: { bottom: { style: BorderStyle.DOUBLE, size: 6, color: "000000", space: 6 } },
    spacing: { before: 0, after: 160, line: 276, lineRule: "auto" },
    children: [
      new TextRun({ text: name, size: 40, bold: true }),
      new TextRun({ text: "", break: 1 }),
      new TextRun({ text: title, size: 22, italics: true }),
      new TextRun({ text: "", break: 1 }),
      new TextRun({ text: contact, size: 20 }),
    ],
  });
}

function sectionHeader(text: string) {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.THICK, size: 8, color: "000000", space: 2 } },
    spacing: { before: 260, after: 0 },
    children: [new TextRun({ text, bold: true, allCaps: true, size: 22 })],
  });
}

function skillLine(category: string, items: string) {
  return new Paragraph({
    spacing: { before: 60, after: 0 },
    children: [
      new TextRun({ text: category + ": ", bold: true, size: 21 }),
      new TextRun({ text: items, size: 21 }),
    ],
  });
}

function jobHeaderLine(company: string, location: string, start: string, end: string) {
  return new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W }],
    spacing: { before: 120, after: 0 },
    children: [
      new TextRun({ text: company, bold: true, size: 22 }),
      new TextRun({ text: `  ·  ${location}`, size: 21 }),
      new TextRun({ text: "\t", size: 21 }),
      new TextRun({ text: `${start} – ${end}`, size: 21 }),
    ],
  });
}

function jobTitleLine(title: string) {
  return new Paragraph({
    spacing: { before: 0, after: 0 },
    children: [new TextRun({ text: title, italics: true, size: 21 })],
  });
}

function bullet(text: string) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { before: 0, after: 40 },
    children: [new TextRun({ text, size: 21 })],
  });
}

function eduEntry(degree: string, school: string, start: string, end: string, gpa?: string) {
  const gradeRun = gpa ? [new TextRun({ text: `  GPA: ${gpa}`, size: 21 })] : [];
  return [
    new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W }],
      spacing: { before: 100, after: 0 },
      children: [
        new TextRun({ text: degree, size: 21 }),
        new TextRun({ text: "\t", size: 21 }),
        new TextRun({ text: `${start} – ${end}`, size: 21 }),
      ],
    }),
    new Paragraph({
      spacing: { before: 0, after: 0 },
      children: [new TextRun({ text: school, bold: true, size: 21 }), ...gradeRun],
    }),
  ];
}

export async function buildExecutive(data: ResumeDocData): Promise<Buffer> {
  const children: Paragraph[] = [];
  children.push(header(data.name, data.title, data.contact));
  children.push(sectionHeader("Summary"));
  children.push(new Paragraph({ spacing: { before: 80, after: 60 }, children: [new TextRun({ text: data.summary, size: 21 })] }));
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
    numbering: { config: [{ reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "–", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 360 } } } }] }] },
    sections: [{ properties: { page: { size: { width: PAGE_W, height: PAGE_H }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } }, children }],
  })));
}
