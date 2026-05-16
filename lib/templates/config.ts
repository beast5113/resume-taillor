export type BorderStyleValue = "none" | "single" | "double" | "thick";
export type AlignValue = "left" | "center" | "right";

export interface TemplateConfig {
  id?: string;
  name: string;
  baseId: "classic" | "modern" | "executive" | "minimal";

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

export const MODERN_CONFIG: TemplateConfig = {
  name: "Modern",
  baseId: "modern",
  page: { marginTopIn: 0.75, marginBottomIn: 0.75, marginLeftIn: 0.75, marginRightIn: 0.75 },
  header: {
    align: "left",
    nameFont: "Calibri",
    namePt: 18,
    nameBold: true,
    nameColor: "000000",
    titleFont: "Calibri",
    titlePt: 10.5,
    titleItalic: false,
    titleBold: false,
    titleColor: "374151",
    contactPt: 10,
    contactColor: "6B7280",
    borderStyle: "none",
    borderColor: "000000",
    borderSizePt: 0.5,
    spacingAfterPt: 6,
  },
  sectionHeader: {
    font: "Calibri",
    sizePt: 9.5,
    bold: true,
    allCaps: true,
    color: "1D4ED8",
    borderBottomStyle: "none",
    borderBottomColor: "1D4ED8",
    borderBottomSizePt: 0.5,
    borderLeftStyle: "thick",
    borderLeftColor: "1D4ED8",
    borderLeftSizePt: 3,
    indentLeftIn: 0.083,
    spacingBeforePt: 12,
    spacingAfterPt: 3,
  },
  body: {
    font: "Calibri",
    sizePt: 10,
    color: "374151",
    lineMultiplier: 1.15,
    summarySpacingBeforePt: 2,
    summarySpacingAfterPt: 3,
  },
  job: {
    companyFont: "Calibri",
    companyPt: 10.5,
    companyBold: true,
    companyColor: "000000",
    separator: " · ",
    titleFont: "Calibri",
    titlePt: 10,
    titleItalic: true,
    titleBold: false,
    titleColor: "1D4ED8",
    datePt: 10,
    dateBold: false,
    dateItalic: false,
    dateColor: "6B7280",
    locationColor: "6B7280",
    locationBold: false,
    locationItalic: false,
    spacingBeforePt: 6,
  },
  bullet: { char: "›", indentLeftIn: 0.25, sizePt: 10, color: "374151", spacingAfterPt: 2 },
  skills: { categoryBold: true, categoryColor: "111827", valueColor: "374151", sizePt: 10, spacingBeforePt: 2 },
  education: {
    degreePt: 10,
    degreeColor: "374151",
    schoolBold: true,
    schoolColor: "000000",
    datePt: 10,
    dateColor: "6B7280",
    gpaColor: "6B7280",
    spacingBeforePt: 4,
  },
};

export const EXECUTIVE_CONFIG: TemplateConfig = {
  name: "Executive",
  baseId: "executive",
  page: { marginTopIn: 0.9, marginBottomIn: 0.9, marginLeftIn: 0.9, marginRightIn: 0.9 },
  header: {
    align: "center",
    nameFont: "Calibri",
    namePt: 20,
    nameBold: true,
    nameColor: "000000",
    titleFont: "Calibri",
    titlePt: 11,
    titleItalic: true,
    titleBold: false,
    titleColor: "000000",
    contactPt: 10,
    contactColor: "000000",
    borderStyle: "double",
    borderColor: "000000",
    borderSizePt: 0.75,
    spacingAfterPt: 8,
  },
  sectionHeader: {
    font: "Calibri",
    sizePt: 11,
    bold: true,
    allCaps: true,
    color: "000000",
    borderBottomStyle: "thick",
    borderBottomColor: "000000",
    borderBottomSizePt: 1,
    borderLeftStyle: "none",
    borderLeftColor: "000000",
    borderLeftSizePt: 0,
    indentLeftIn: 0,
    spacingBeforePt: 13,
    spacingAfterPt: 0,
  },
  body: {
    font: "Calibri",
    sizePt: 10.5,
    color: "000000",
    lineMultiplier: 1.15,
    summarySpacingBeforePt: 4,
    summarySpacingAfterPt: 3,
  },
  job: {
    companyFont: "Calibri",
    companyPt: 11,
    companyBold: true,
    companyColor: "000000",
    separator: "  ·  ",
    titleFont: "Calibri",
    titlePt: 10.5,
    titleItalic: true,
    titleBold: false,
    titleColor: "000000",
    datePt: 10.5,
    dateBold: false,
    dateItalic: false,
    dateColor: "000000",
    locationColor: "000000",
    locationBold: false,
    locationItalic: false,
    spacingBeforePt: 6,
  },
  bullet: { char: "–", indentLeftIn: 0.25, sizePt: 10.5, color: "000000", spacingAfterPt: 2 },
  skills: { categoryBold: true, categoryColor: "000000", valueColor: "000000", sizePt: 10.5, spacingBeforePt: 3 },
  education: {
    degreePt: 10.5,
    degreeColor: "000000",
    schoolBold: true,
    schoolColor: "000000",
    datePt: 10.5,
    dateColor: "000000",
    gpaColor: "000000",
    spacingBeforePt: 5,
  },
};

export const MINIMAL_CONFIG: TemplateConfig = {
  name: "Minimal",
  baseId: "minimal",
  page: { marginTopIn: 0.75, marginBottomIn: 0.75, marginLeftIn: 0.75, marginRightIn: 0.75 },
  header: {
    align: "left",
    nameFont: "Calibri",
    namePt: 15,
    nameBold: true,
    nameColor: "1F2937",
    titleFont: "Calibri",
    titlePt: 10,
    titleItalic: true,
    titleBold: false,
    titleColor: "4B5563",
    contactPt: 9,
    contactColor: "9CA3AF",
    borderStyle: "single",
    borderColor: "E5E7EB",
    borderSizePt: 0.25,
    spacingAfterPt: 7,
  },
  sectionHeader: {
    font: "Calibri",
    sizePt: 9,
    bold: true,
    allCaps: true,
    color: "4B5563",
    borderBottomStyle: "single",
    borderBottomColor: "E5E7EB",
    borderBottomSizePt: 0.25,
    borderLeftStyle: "none",
    borderLeftColor: "000000",
    borderLeftSizePt: 0,
    indentLeftIn: 0,
    spacingBeforePt: 11,
    spacingAfterPt: 3,
  },
  body: {
    font: "Calibri",
    sizePt: 9.5,
    color: "4B5563",
    lineMultiplier: 1.15,
    summarySpacingBeforePt: 2,
    summarySpacingAfterPt: 4,
  },
  job: {
    companyFont: "Calibri",
    companyPt: 10,
    companyBold: true,
    companyColor: "1F2937",
    separator: "  ",
    titleFont: "Calibri",
    titlePt: 9.5,
    titleItalic: true,
    titleBold: false,
    titleColor: "4B5563",
    datePt: 9,
    dateBold: false,
    dateItalic: false,
    dateColor: "9CA3AF",
    locationColor: "9CA3AF",
    locationBold: false,
    locationItalic: false,
    spacingBeforePt: 6,
  },
  bullet: { char: "·", indentLeftIn: 0.25, sizePt: 9.5, color: "1F2937", spacingAfterPt: 2.5 },
  skills: { categoryBold: true, categoryColor: "1F2937", valueColor: "4B5563", sizePt: 9.5, spacingBeforePt: 2.5 },
  education: {
    degreePt: 9.5,
    degreeColor: "1F2937",
    schoolBold: true,
    schoolColor: "4B5563",
    datePt: 9,
    dateColor: "9CA3AF",
    gpaColor: "9CA3AF",
    spacingBeforePt: 4,
  },
};

export const BASE_CONFIGS: Record<string, TemplateConfig> = {
  classic:   CLASSIC_CONFIG,
  modern:    MODERN_CONFIG,
  executive: EXECUTIVE_CONFIG,
  minimal:   MINIMAL_CONFIG,
};
