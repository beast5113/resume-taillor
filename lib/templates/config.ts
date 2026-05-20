export type BorderStyleValue = "none" | "single" | "double" | "thick";
export type AlignValue = "left" | "center" | "right";

export interface TemplateConfig {
  id?: string;
  name: string;
  baseId: "classic";

  page: {
    marginTopIn: number;
    marginBottomIn: number;
    marginLeftIn: number;
    marginRightIn: number;
  };

  header: {
    align: AlignValue;
    nameFont: string;
    namePt: number;
    nameBold: boolean;
    nameColor: string;
    titleFont: string;
    titlePt: number;
    titleItalic: boolean;
    titleBold: boolean;
    titleColor: string;
    contactPt: number;
    contactColor: string;
    borderStyle: BorderStyleValue;
    borderColor: string;
    borderSizePt: number;
    spacingAfterPt: number;
  };

  sectionHeader: {
    font: string;
    sizePt: number;
    bold: boolean;
    allCaps: boolean;
    color: string;
    borderBottomStyle: BorderStyleValue;
    borderBottomColor: string;
    borderBottomSizePt: number;
    borderLeftStyle: BorderStyleValue;
    borderLeftColor: string;
    borderLeftSizePt: number;
    indentLeftIn: number;
    spacingBeforePt: number;
    spacingAfterPt: number;
  };

  body: {
    font: string;
    sizePt: number;
    color: string;
    lineMultiplier: number;
    summarySpacingBeforePt: number;
    summarySpacingAfterPt: number;
  };

  job: {
    companyFont: string;
    companyPt: number;
    companyBold: boolean;
    companyColor: string;
    separator: string;
    titleFont: string;
    titlePt: number;
    titleItalic: boolean;
    titleBold: boolean;
    titleColor: string;
    datePt: number;
    dateBold: boolean;
    dateItalic: boolean;
    dateColor: string;
    locationColor: string;
    locationBold: boolean;
    locationItalic: boolean;
    spacingBeforePt: number;
  };

  bullet: {
    char: string;
    indentLeftIn: number;
    sizePt: number;
    color: string;
    spacingAfterPt: number;
  };

  skills: {
    categoryBold: boolean;
    categoryColor: string;
    valueColor: string;
    sizePt: number;
    spacingBeforePt: number;
  };

  education: {
    degreePt: number;
    degreeColor: string;
    schoolBold: boolean;
    schoolColor: string;
    datePt: number;
    dateColor: string;
    gpaColor: string;
    spacingBeforePt: number;
  };
}

export const CLASSIC_CONFIG: TemplateConfig = {
  name: "Classic",
  baseId: "classic",
  // Measured from template.docx: 0.60in top/bottom, 0.35in left/right
  page: { marginTopIn: 0.6, marginBottomIn: 0.6, marginLeftIn: 0.35, marginRightIn: 0.35 },
  header: {
    align: "center",
    nameFont: "Calibri",
    namePt: 16,
    nameBold: false,
    nameColor: "000000",
    titleFont: "Calibri",
    titlePt: 12,
    titleItalic: false,
    titleBold: false,
    titleColor: "000000",
    contactPt: 10,
    contactColor: "000000",
    borderStyle: "none",
    borderColor: "000000",
    borderSizePt: 0.5,
    spacingAfterPt: 0,
  },
  sectionHeader: {
    font: "Montserrat",
    sizePt: 10.5,
    bold: true,
    allCaps: false,
    color: "000000",
    borderBottomStyle: "single",
    borderBottomColor: "000000",
    borderBottomSizePt: 0.5,
    borderLeftStyle: "none",
    borderLeftColor: "000000",
    borderLeftSizePt: 0,
    indentLeftIn: 0,
    spacingBeforePt: 8,
    spacingAfterPt: 0,
  },
  body: {
    font: "Calibri",
    sizePt: 10.5,
    color: "000000",
    lineMultiplier: 1.15,
    summarySpacingBeforePt: 3,
    summarySpacingAfterPt: 0,
  },
  job: {
    companyFont: "Calibri",
    companyPt: 12,
    companyBold: true,
    companyColor: "000000",
    separator: " | ",
    titleFont: "Calibri",
    titlePt: 12,
    titleItalic: false,
    titleBold: true,
    titleColor: "000000",
    datePt: 12,
    dateBold: false,
    dateItalic: false,
    dateColor: "000000",
    locationColor: "000000",
    locationBold: true,
    locationItalic: false,
    spacingBeforePt: 6,
  },
  // indentLeftIn 0.22in ≈ 317 DXA (measured from template.docx)
  bullet: { char: "•", indentLeftIn: 0.22, sizePt: 10.5, color: "000000", spacingAfterPt: 0 },
  skills: { categoryBold: true, categoryColor: "000000", valueColor: "000000", sizePt: 10.5, spacingBeforePt: 3 },
  education: {
    degreePt: 10.5,
    degreeColor: "000000",
    schoolBold: true,
    schoolColor: "000000",
    datePt: 10.5,
    dateColor: "000000",
    gpaColor: "000000",
    spacingBeforePt: 3,
  },
};

