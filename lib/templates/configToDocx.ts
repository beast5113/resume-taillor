import {
  Document, Packer, Paragraph, TextRun,
  AlignmentType, TabStopType, LevelFormat, BorderStyle,
} from "docx";
import type { ResumeDocData } from "./types";
import type { TemplateConfig, BorderStyleValue, AlignValue } from "./config";

function hp(pt: number) { return Math.round(pt * 2); }
function dxa(inches: number) { return Math.round(inches * 1440); }
function twips(pt: number) { return Math.round(pt * 20); }
function eighth(pt: number) { return Math.round(pt * 8); }
function lineSpace(mult: number) { return Math.round(mult * 240); }

function bStyle(s: BorderStyleValue) {
  switch (s) {
    case "single": return BorderStyle.SINGLE;
    case "double": return BorderStyle.DOUBLE;
    case "thick":  return BorderStyle.THICK;
    default:       return undefined;
  }
}

function docxAlign(a: AlignValue) {
  switch (a) {
    case "center": return AlignmentType.CENTER;
    case "right":  return AlignmentType.RIGHT;
    default:       return AlignmentType.LEFT;
  }
}

function buildHeaderParagraph(cfg: TemplateConfig, name: string, title: string, contact: string) {
  const h = cfg.header;
  const borderBottom = h.borderStyle !== "none"
    ? { bottom: { style: bStyle(h.borderStyle)!, size: eighth(h.borderSizePt), color: h.borderColor, space: 6 } }
    : {};

  return new Paragraph({
    alignment: docxAlign(h.align),
    border: borderBottom,
    spacing: { before: 0, after: twips(h.spacingAfterPt), line: lineSpace(cfg.body.lineMultiplier), lineRule: "auto" },
    children: [
      new TextRun({ text: name, font: h.nameFont, size: hp(h.namePt), bold: h.nameBold, color: h.nameColor }),
      new TextRun({ text: "", break: 1 }),
      new TextRun({ text: title, font: h.titleFont, size: hp(h.titlePt), italics: h.titleItalic, bold: h.titleBold, color: h.titleColor }),
      new TextRun({ text: "", break: 1 }),
      new TextRun({ text: contact, font: h.titleFont, size: hp(h.contactPt), color: h.contactColor }),
    ],
  });
}

function buildSectionHeader(cfg: TemplateConfig, text: string) {
  const s = cfg.sectionHeader;
  const borderBottom = s.borderBottomStyle !== "none"
    ? { bottom: { style: bStyle(s.borderBottomStyle)!, size: eighth(s.borderBottomSizePt), color: s.borderBottomColor, space: 2 } }
    : {};
  const borderLeft = s.borderLeftStyle !== "none"
    ? { left: { style: bStyle(s.borderLeftStyle)!, size: eighth(s.borderLeftSizePt), color: s.borderLeftColor, space: 8 } }
    : {};
  const indent = s.indentLeftIn > 0 ? { left: dxa(s.indentLeftIn) } : undefined;

  const borders = { ...borderBottom, ...borderLeft };
  return new Paragraph({
    ...(Object.keys(borders).length > 0 ? { border: borders } : {}),
    ...(indent ? { indent } : {}),
    spacing: { before: twips(s.spacingBeforePt), after: twips(s.spacingAfterPt) },
    children: [
      new TextRun({ text, font: s.font, size: hp(s.sizePt), bold: s.bold, allCaps: s.allCaps, color: s.color }),
    ],
  });
}

function buildSkillLine(cfg: TemplateConfig, category: string, items: string) {
  const sk = cfg.skills;
  return new Paragraph({
    spacing: { before: twips(sk.spacingBeforePt), after: 0 },
    children: [
      new TextRun({ text: category + ": ", font: cfg.body.font, size: hp(sk.sizePt), bold: sk.categoryBold, color: sk.categoryColor }),
      new TextRun({ text: items, font: cfg.body.font, size: hp(sk.sizePt), color: sk.valueColor }),
    ],
  });
}

function buildJobHeader(cfg: TemplateConfig, contentW: number, company: string, location: string, start: string, end: string) {
  const j = cfg.job;
  return new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: contentW }],
    spacing: { before: twips(j.spacingBeforePt), after: 0 },
    children: [
      new TextRun({ text: company, font: j.companyFont, size: hp(j.companyPt), bold: j.companyBold, color: j.companyColor }),
      new TextRun({ text: `${j.separator}${location}`, font: j.companyFont, size: hp(j.datePt), bold: j.locationBold, italics: j.locationItalic, color: j.locationColor }),
      new TextRun({ text: "\t", size: hp(j.datePt) }),
      new TextRun({ text: `${start} – ${end}`, font: j.companyFont, size: hp(j.datePt), bold: j.dateBold, italics: j.dateItalic, color: j.dateColor }),
    ],
  });
}

function buildJobTitle(cfg: TemplateConfig, title: string) {
  const j = cfg.job;
  return new Paragraph({
    spacing: { before: 0, after: 0 },
    children: [
      new TextRun({ text: title, font: j.titleFont, size: hp(j.titlePt), italics: j.titleItalic, bold: j.titleBold, color: j.titleColor }),
    ],
  });
}

function buildBullet(cfg: TemplateConfig, text: string) {
  const b = cfg.bullet;
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { before: 0, after: twips(b.spacingAfterPt) },
    children: [new TextRun({ text, font: cfg.body.font, size: hp(b.sizePt), color: b.color })],
  });
}

function buildEduEntry(cfg: TemplateConfig, contentW: number, degree: string, school: string, start: string, end: string, gpa?: string) {
  const e = cfg.education;
  const gradeRun = gpa ? [new TextRun({ text: `  GPA: ${gpa}`, font: cfg.body.font, size: hp(e.datePt), color: e.gpaColor })] : [];
  return [
    new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: contentW }],
      spacing: { before: twips(e.spacingBeforePt), after: 0 },
      children: [
        new TextRun({ text: degree, font: cfg.body.font, size: hp(e.degreePt), color: e.degreeColor }),
        new TextRun({ text: "\t", size: hp(e.datePt) }),
        new TextRun({ text: `${start} – ${end}`, font: cfg.body.font, size: hp(e.datePt), color: e.dateColor }),
      ],
    }),
    new Paragraph({
      spacing: { before: 0, after: 0 },
      children: [
        new TextRun({ text: school, font: cfg.body.font, size: hp(e.degreePt), bold: e.schoolBold, color: e.schoolColor }),
        ...gradeRun,
      ],
    }),
  ];
}

export async function buildFromConfig(data: ResumeDocData, config: TemplateConfig): Promise<Buffer> {
  const PAGE_W = 12240;
  const PAGE_H = 15840;
  const marginDxa = dxa(config.page.marginLeftIn);
  const contentW = PAGE_W - dxa(config.page.marginLeftIn) - dxa(config.page.marginRightIn);

  const children: Paragraph[] = [];

  children.push(buildHeaderParagraph(config, data.name, data.title, data.contact));

  children.push(buildSectionHeader(config, "SUMMARY"));
  children.push(new Paragraph({
    spacing: { before: twips(config.body.summarySpacingBeforePt), after: twips(config.body.summarySpacingAfterPt) },
    children: [new TextRun({ text: data.summary, font: config.body.font, size: hp(config.body.sizePt), color: config.body.color })],
  }));

  children.push(buildSectionHeader(config, "SKILLS"));
  data.skills.forEach(({ category, items }) => children.push(buildSkillLine(config, category, items)));

  children.push(buildSectionHeader(config, "PROFESSIONAL EXPERIENCE"));
  data.experience.forEach((job) => {
    children.push(buildJobHeader(config, contentW, job.company, job.location, job.startDate, job.endDate));
    children.push(buildJobTitle(config, job.title));
    job.bullets.forEach((b) => children.push(buildBullet(config, b)));
  });

  children.push(buildSectionHeader(config, "EDUCATION"));
  data.education.forEach((edu) =>
    buildEduEntry(config, contentW, edu.degree, edu.school, edu.startDate, edu.endDate, edu.gpa)
      .forEach((p) => children.push(p))
  );

  const b = config.bullet;
  const bulletIndentDxa  = dxa(b.indentLeftIn);
  const bulletHangingDxa = Math.round(bulletIndentDxa * 0.55);

  return Buffer.from(await Packer.toBuffer(new Document({
    numbering: {
      config: [{
        reference: "bullets",
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: b.char,
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: bulletIndentDxa, hanging: bulletHangingDxa } } },
        }],
      }],
    },
    sections: [{
      properties: {
        page: {
          size: { width: PAGE_W, height: PAGE_H },
          margin: {
            top: dxa(config.page.marginTopIn),
            bottom: dxa(config.page.marginBottomIn),
            left: marginDxa,
            right: dxa(config.page.marginRightIn),
          },
        },
      },
      children,
    }],
  })));
}
