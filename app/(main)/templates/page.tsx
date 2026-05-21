"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Loader2, Star, LayoutTemplate, Check } from "lucide-react";
import {
  TemplateConfig,
  CLASSIC_CONFIG,
  BorderStyleValue,
  AlignValue,
} from "@/lib/templates/config";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

type StoredTemplate = {
  id: string;
  name: string;
  config: TemplateConfig;
  created_at: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cssBorder(style: BorderStyleValue, color: string, sizePt: number): string {
  if (style === "none") return "none";
  const s = style === "double" ? "double" : "solid";
  const w = style === "thick" ? `${sizePt * 2}pt` : `${Math.max(sizePt, 0.5)}pt`;
  return `${w} ${s} #${color}`;
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ─── Field components ─────────────────────────────────────────────────────────

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 min-h-7">
      <span className="text-xs text-muted-foreground flex-1 leading-tight">{label}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        <input
          type="color"
          value={`#${value}`}
          onChange={(e) => onChange(e.target.value.slice(1))}
          className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
        />
        <code className="text-[10px] font-mono text-muted-foreground/70 w-14">#{value}</code>
      </div>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  step = 0.5,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
}) {
  return (
    <div className="flex items-center gap-2 min-h-7">
      <span className="text-xs text-muted-foreground flex-1 leading-tight">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) onChange(v);
        }}
        step={step}
        min={min}
        className="w-20 h-7 rounded-md border border-input bg-transparent px-2 text-xs text-foreground text-right focus-visible:border-ring outline-none"
      />
    </div>
  );
}

function BoolField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2 min-h-7">
      <span className="text-xs text-muted-foreground flex-1 leading-tight">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`w-8 h-4 rounded-full transition-colors relative shrink-0 ${
          value ? "bg-primary" : "bg-input"
        }`}
      >
        <span
          className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${
            value ? "left-4" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  wide,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  wide?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 min-h-7">
      <span className="text-xs text-muted-foreground flex-1 leading-tight">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={`h-7 rounded-md border border-input bg-card px-2 text-xs text-foreground focus-visible:border-ring outline-none ${
          wide ? "w-36" : "w-28"
        }`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
}) {
  return (
    <div className="flex items-center gap-2 min-h-7">
      <span className="text-xs text-muted-foreground flex-1 leading-tight">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        className="w-28 h-7 rounded-md border border-input bg-transparent px-2 text-xs text-foreground focus-visible:border-ring outline-none"
      />
    </div>
  );
}

// ─── Config editor ────────────────────────────────────────────────────────────

const BORDER_OPTS: { value: BorderStyleValue; label: string }[] = [
  { value: "none", label: "None" },
  { value: "single", label: "Single" },
  { value: "double", label: "Double" },
  { value: "thick", label: "Thick" },
];

const ALIGN_OPTS: { value: AlignValue; label: string }[] = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
];

const FONT_OPTS = [
  "Calibri",
  "Arial",
  "Helvetica Neue",
  "Times New Roman",
  "Georgia",
  "Garamond",
  "Montserrat",
  "Roboto",
  "Open Sans",
];

function FontField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const opts = Array.from(new Set([...FONT_OPTS, value]));
  return (
    <div className="flex items-center gap-2 min-h-7">
      <span className="text-xs text-muted-foreground flex-1 leading-tight">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-36 h-7 rounded-md border border-input bg-card px-2 text-xs text-foreground focus-visible:border-ring outline-none"
      >
        {opts.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>
    </div>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 pt-2 pb-2 border-b border-border/50 mb-3">
      <span className="text-[11px] font-semibold text-foreground uppercase tracking-widest">
        {title}
      </span>
    </div>
  );
}

function ConfigEditor({
  cfg,
  onChange,
}: {
  cfg: TemplateConfig;
  onChange: <K extends keyof TemplateConfig>(
    section: K,
    update: Partial<TemplateConfig[K]>
  ) => void;
}) {
  const upd =
    <K extends keyof TemplateConfig>(section: K) =>
    (update: Partial<TemplateConfig[K]>) =>
      onChange(section, update);

  const p = cfg.page;
  const h = cfg.header;
  const sh = cfg.sectionHeader;
  const b = cfg.body;
  const j = cfg.job;
  const bu = cfg.bullet;
  const sk = cfg.skills;
  const ed = cfg.education;

  return (
    <div className="space-y-7 pb-6">
      {/* Page */}
      <section>
        <SectionHeading title="Page" />
        <div className="space-y-1.5">
          <NumField
            label="Top margin (in)"
            value={p.marginTopIn}
            onChange={(v) => upd("page")({ marginTopIn: v })}
            step={0.05}
          />
          <NumField
            label="Bottom margin (in)"
            value={p.marginBottomIn}
            onChange={(v) => upd("page")({ marginBottomIn: v })}
            step={0.05}
          />
          <NumField
            label="Left margin (in)"
            value={p.marginLeftIn}
            onChange={(v) => upd("page")({ marginLeftIn: v })}
            step={0.05}
          />
          <NumField
            label="Right margin (in)"
            value={p.marginRightIn}
            onChange={(v) => upd("page")({ marginRightIn: v })}
            step={0.05}
          />
        </div>
      </section>

      {/* Header */}
      <section>
        <SectionHeading title="Header" />
        <div className="space-y-1.5">
          <SelectField
            label="Alignment"
            value={h.align}
            onChange={(v) => upd("header")({ align: v })}
            options={ALIGN_OPTS}
          />
          <FontField
            label="Name font"
            value={h.nameFont}
            onChange={(v) => upd("header")({ nameFont: v })}
          />
          <NumField
            label="Name size (pt)"
            value={h.namePt}
            onChange={(v) => upd("header")({ namePt: v })}
          />
          <BoolField
            label="Name bold"
            value={h.nameBold}
            onChange={(v) => upd("header")({ nameBold: v })}
          />
          <ColorField
            label="Name color"
            value={h.nameColor}
            onChange={(v) => upd("header")({ nameColor: v })}
          />
          <FontField
            label="Title font"
            value={h.titleFont}
            onChange={(v) => upd("header")({ titleFont: v })}
          />
          <NumField
            label="Title size (pt)"
            value={h.titlePt}
            onChange={(v) => upd("header")({ titlePt: v })}
          />
          <BoolField
            label="Title bold"
            value={h.titleBold}
            onChange={(v) => upd("header")({ titleBold: v })}
          />
          <BoolField
            label="Title italic"
            value={h.titleItalic}
            onChange={(v) => upd("header")({ titleItalic: v })}
          />
          <ColorField
            label="Title color"
            value={h.titleColor}
            onChange={(v) => upd("header")({ titleColor: v })}
          />
          <NumField
            label="Contact size (pt)"
            value={h.contactPt}
            onChange={(v) => upd("header")({ contactPt: v })}
          />
          <ColorField
            label="Contact color"
            value={h.contactColor}
            onChange={(v) => upd("header")({ contactColor: v })}
          />
          <SelectField
            label="Border style"
            value={h.borderStyle}
            onChange={(v) => upd("header")({ borderStyle: v })}
            options={BORDER_OPTS}
          />
          <ColorField
            label="Border color"
            value={h.borderColor}
            onChange={(v) => upd("header")({ borderColor: v })}
          />
          <NumField
            label="Border size (pt)"
            value={h.borderSizePt}
            onChange={(v) => upd("header")({ borderSizePt: v })}
            step={0.25}
          />
          <NumField
            label="Spacing after (pt)"
            value={h.spacingAfterPt}
            onChange={(v) => upd("header")({ spacingAfterPt: v })}
            step={1}
          />
        </div>
      </section>

      {/* Section Headers */}
      <section>
        <SectionHeading title="Section Headers" />
        <div className="space-y-1.5">
          <FontField
            label="Font"
            value={sh.font}
            onChange={(v) => upd("sectionHeader")({ font: v })}
          />
          <NumField
            label="Size (pt)"
            value={sh.sizePt}
            onChange={(v) => upd("sectionHeader")({ sizePt: v })}
          />
          <BoolField
            label="Bold"
            value={sh.bold}
            onChange={(v) => upd("sectionHeader")({ bold: v })}
          />
          <BoolField
            label="All caps"
            value={sh.allCaps}
            onChange={(v) => upd("sectionHeader")({ allCaps: v })}
          />
          <ColorField
            label="Text color"
            value={sh.color}
            onChange={(v) => upd("sectionHeader")({ color: v })}
          />
          <SelectField
            label="Bottom border"
            value={sh.borderBottomStyle}
            onChange={(v) => upd("sectionHeader")({ borderBottomStyle: v })}
            options={BORDER_OPTS}
          />
          <ColorField
            label="Bottom border color"
            value={sh.borderBottomColor}
            onChange={(v) => upd("sectionHeader")({ borderBottomColor: v })}
          />
          <NumField
            label="Bottom border size (pt)"
            value={sh.borderBottomSizePt}
            onChange={(v) => upd("sectionHeader")({ borderBottomSizePt: v })}
            step={0.25}
          />
          <SelectField
            label="Left border"
            value={sh.borderLeftStyle}
            onChange={(v) => upd("sectionHeader")({ borderLeftStyle: v })}
            options={BORDER_OPTS}
          />
          <ColorField
            label="Left border color"
            value={sh.borderLeftColor}
            onChange={(v) => upd("sectionHeader")({ borderLeftColor: v })}
          />
          <NumField
            label="Left border size (pt)"
            value={sh.borderLeftSizePt}
            onChange={(v) => upd("sectionHeader")({ borderLeftSizePt: v })}
            step={0.25}
          />
          <NumField
            label="Indent left (in)"
            value={sh.indentLeftIn}
            onChange={(v) => upd("sectionHeader")({ indentLeftIn: v })}
            step={0.05}
          />
          <NumField
            label="Spacing before (pt)"
            value={sh.spacingBeforePt}
            onChange={(v) => upd("sectionHeader")({ spacingBeforePt: v })}
            step={1}
          />
          <NumField
            label="Spacing after (pt)"
            value={sh.spacingAfterPt}
            onChange={(v) => upd("sectionHeader")({ spacingAfterPt: v })}
            step={1}
          />
        </div>
      </section>

      {/* Body */}
      <section>
        <SectionHeading title="Body Text" />
        <div className="space-y-1.5">
          <FontField label="Font" value={b.font} onChange={(v) => upd("body")({ font: v })} />
          <NumField
            label="Size (pt)"
            value={b.sizePt}
            onChange={(v) => upd("body")({ sizePt: v })}
          />
          <ColorField
            label="Color"
            value={b.color}
            onChange={(v) => upd("body")({ color: v })}
          />
          <NumField
            label="Line spacing"
            value={b.lineMultiplier}
            onChange={(v) => upd("body")({ lineMultiplier: v })}
            step={0.05}
          />
          <NumField
            label="Summary spacing before (pt)"
            value={b.summarySpacingBeforePt}
            onChange={(v) => upd("body")({ summarySpacingBeforePt: v })}
            step={1}
          />
          <NumField
            label="Summary spacing after (pt)"
            value={b.summarySpacingAfterPt}
            onChange={(v) => upd("body")({ summarySpacingAfterPt: v })}
            step={1}
          />
        </div>
      </section>

      {/* Job Entries */}
      <section>
        <SectionHeading title="Job Entries" />
        <div className="space-y-1.5">
          <FontField
            label="Company font"
            value={j.companyFont}
            onChange={(v) => upd("job")({ companyFont: v })}
          />
          <NumField
            label="Company size (pt)"
            value={j.companyPt}
            onChange={(v) => upd("job")({ companyPt: v })}
          />
          <BoolField
            label="Company bold"
            value={j.companyBold}
            onChange={(v) => upd("job")({ companyBold: v })}
          />
          <ColorField
            label="Company color"
            value={j.companyColor}
            onChange={(v) => upd("job")({ companyColor: v })}
          />
          <TextField
            label="Separator"
            value={j.separator}
            onChange={(v) => upd("job")({ separator: v })}
            maxLength={10}
          />
          <FontField
            label="Title font"
            value={j.titleFont}
            onChange={(v) => upd("job")({ titleFont: v })}
          />
          <NumField
            label="Title size (pt)"
            value={j.titlePt}
            onChange={(v) => upd("job")({ titlePt: v })}
          />
          <BoolField
            label="Title bold"
            value={j.titleBold}
            onChange={(v) => upd("job")({ titleBold: v })}
          />
          <BoolField
            label="Title italic"
            value={j.titleItalic}
            onChange={(v) => upd("job")({ titleItalic: v })}
          />
          <ColorField
            label="Title color"
            value={j.titleColor}
            onChange={(v) => upd("job")({ titleColor: v })}
          />
          <NumField
            label="Date size (pt)"
            value={j.datePt}
            onChange={(v) => upd("job")({ datePt: v })}
          />
          <BoolField
            label="Date bold"
            value={j.dateBold}
            onChange={(v) => upd("job")({ dateBold: v })}
          />
          <BoolField
            label="Date italic"
            value={j.dateItalic}
            onChange={(v) => upd("job")({ dateItalic: v })}
          />
          <ColorField
            label="Date color"
            value={j.dateColor}
            onChange={(v) => upd("job")({ dateColor: v })}
          />
          <ColorField
            label="Location color"
            value={j.locationColor}
            onChange={(v) => upd("job")({ locationColor: v })}
          />
          <BoolField
            label="Location bold"
            value={j.locationBold}
            onChange={(v) => upd("job")({ locationBold: v })}
          />
          <BoolField
            label="Location italic"
            value={j.locationItalic}
            onChange={(v) => upd("job")({ locationItalic: v })}
          />
          <NumField
            label="Spacing before (pt)"
            value={j.spacingBeforePt}
            onChange={(v) => upd("job")({ spacingBeforePt: v })}
            step={1}
          />
        </div>
      </section>

      {/* Bullets */}
      <section>
        <SectionHeading title="Bullets" />
        <div className="space-y-1.5">
          <TextField
            label="Bullet character"
            value={bu.char}
            onChange={(v) => upd("bullet")({ char: v })}
            maxLength={3}
          />
          <NumField
            label="Indent left (in)"
            value={bu.indentLeftIn}
            onChange={(v) => upd("bullet")({ indentLeftIn: v })}
            step={0.01}
          />
          <NumField
            label="Size (pt)"
            value={bu.sizePt}
            onChange={(v) => upd("bullet")({ sizePt: v })}
          />
          <ColorField
            label="Color"
            value={bu.color}
            onChange={(v) => upd("bullet")({ color: v })}
          />
          <NumField
            label="Spacing after (pt)"
            value={bu.spacingAfterPt}
            onChange={(v) => upd("bullet")({ spacingAfterPt: v })}
            step={1}
          />
        </div>
      </section>

      {/* Skills */}
      <section>
        <SectionHeading title="Skills" />
        <div className="space-y-1.5">
          <BoolField
            label="Category bold"
            value={sk.categoryBold}
            onChange={(v) => upd("skills")({ categoryBold: v })}
          />
          <ColorField
            label="Category color"
            value={sk.categoryColor}
            onChange={(v) => upd("skills")({ categoryColor: v })}
          />
          <ColorField
            label="Value color"
            value={sk.valueColor}
            onChange={(v) => upd("skills")({ valueColor: v })}
          />
          <NumField
            label="Size (pt)"
            value={sk.sizePt}
            onChange={(v) => upd("skills")({ sizePt: v })}
          />
          <NumField
            label="Spacing before (pt)"
            value={sk.spacingBeforePt}
            onChange={(v) => upd("skills")({ spacingBeforePt: v })}
            step={1}
          />
        </div>
      </section>

      {/* Education */}
      <section>
        <SectionHeading title="Education" />
        <div className="space-y-1.5">
          <NumField
            label="Degree size (pt)"
            value={ed.degreePt}
            onChange={(v) => upd("education")({ degreePt: v })}
          />
          <ColorField
            label="Degree color"
            value={ed.degreeColor}
            onChange={(v) => upd("education")({ degreeColor: v })}
          />
          <BoolField
            label="School bold"
            value={ed.schoolBold}
            onChange={(v) => upd("education")({ schoolBold: v })}
          />
          <ColorField
            label="School color"
            value={ed.schoolColor}
            onChange={(v) => upd("education")({ schoolColor: v })}
          />
          <NumField
            label="Date size (pt)"
            value={ed.datePt}
            onChange={(v) => upd("education")({ datePt: v })}
          />
          <ColorField
            label="Date color"
            value={ed.dateColor}
            onChange={(v) => upd("education")({ dateColor: v })}
          />
          <ColorField
            label="GPA color"
            value={ed.gpaColor}
            onChange={(v) => upd("education")({ gpaColor: v })}
          />
          <NumField
            label="Spacing before (pt)"
            value={ed.spacingBeforePt}
            onChange={(v) => upd("education")({ spacingBeforePt: v })}
            step={1}
          />
        </div>
      </section>
    </div>
  );
}

// ─── Resume Preview ───────────────────────────────────────────────────────────

function ResumePreview({ cfg }: { cfg: TemplateConfig }) {
  const SCALE = 0.55;
  const PAGE_W = 816; // 8.5" × 96dpi
  const PAGE_H = 1056; // 11" × 96dpi

  const ml = cfg.page.marginLeftIn * 96;
  const mr = cfg.page.marginRightIn * 96;
  const mt = cfg.page.marginTopIn * 96;

  const shBorderBottom = cssBorder(
    cfg.sectionHeader.borderBottomStyle,
    cfg.sectionHeader.borderBottomColor,
    cfg.sectionHeader.borderBottomSizePt
  );
  const shBorderLeft = cssBorder(
    cfg.sectionHeader.borderLeftStyle,
    cfg.sectionHeader.borderLeftColor,
    cfg.sectionHeader.borderLeftSizePt
  );
  const hdrBorder = cssBorder(
    cfg.header.borderStyle,
    cfg.header.borderColor,
    cfg.header.borderSizePt
  );

  const shStyle: React.CSSProperties = {
    fontFamily: `"${cfg.sectionHeader.font}", Arial, sans-serif`,
    fontSize: `${cfg.sectionHeader.sizePt}pt`,
    fontWeight: cfg.sectionHeader.bold ? "bold" : "normal",
    textTransform: cfg.sectionHeader.allCaps ? "uppercase" : "none",
    color: `#${cfg.sectionHeader.color}`,
    borderBottom: shBorderBottom,
    borderLeft: shBorderLeft,
    paddingLeft:
      cfg.sectionHeader.indentLeftIn > 0
        ? `${cfg.sectionHeader.indentLeftIn * 96}px`
        : "2px",
    marginTop: `${cfg.sectionHeader.spacingBeforePt}pt`,
    marginBottom: `${Math.max(cfg.sectionHeader.spacingAfterPt, 2)}pt`,
  };

  const Bullets = ({ texts }: { texts: string[] }) => (
    <>
      {texts.map((text, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: "5px",
            paddingLeft: `${cfg.bullet.indentLeftIn * 96}px`,
            fontSize: `${cfg.bullet.sizePt}pt`,
            color: `#${cfg.bullet.color}`,
            marginBottom:
              cfg.bullet.spacingAfterPt > 0 ? `${cfg.bullet.spacingAfterPt}pt` : "1px",
          }}
        >
          <span style={{ flexShrink: 0 }}>{cfg.bullet.char}</span>
          <span>{text}</span>
        </div>
      ))}
    </>
  );

  const JobEntry = ({
    company,
    title,
    date,
    location,
  }: {
    company: string;
    title: string;
    date: string;
    location: string;
  }) => (
    <div style={{ marginTop: `${cfg.job.spacingBeforePt}pt` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <span
            style={{
              fontFamily: `"${cfg.job.companyFont}", Arial, sans-serif`,
              fontSize: `${cfg.job.companyPt}pt`,
              fontWeight: cfg.job.companyBold ? "bold" : "normal",
              color: `#${cfg.job.companyColor}`,
            }}
          >
            {company}
          </span>
          <span style={{ fontSize: `${cfg.job.companyPt}pt` }}>{cfg.job.separator}</span>
          <span
            style={{
              fontFamily: `"${cfg.job.titleFont}", Arial, sans-serif`,
              fontSize: `${cfg.job.titlePt}pt`,
              fontStyle: cfg.job.titleItalic ? "italic" : "normal",
              fontWeight: cfg.job.titleBold ? "bold" : "normal",
              color: `#${cfg.job.titleColor}`,
            }}
          >
            {title}
          </span>
        </div>
        <span
          style={{
            fontSize: `${cfg.job.datePt}pt`,
            fontWeight: cfg.job.dateBold ? "bold" : "normal",
            fontStyle: cfg.job.dateItalic ? "italic" : "normal",
            color: `#${cfg.job.dateColor}`,
          }}
        >
          {date}
        </span>
      </div>
      <div
        style={{
          fontSize: `${cfg.body.sizePt}pt`,
          fontWeight: cfg.job.locationBold ? "bold" : "normal",
          fontStyle: cfg.job.locationItalic ? "italic" : "normal",
          color: `#${cfg.job.locationColor}`,
        }}
      >
        {location}
      </div>
    </div>
  );

  return (
    <div
      style={{
        width: PAGE_W * SCALE,
        height: PAGE_H * SCALE,
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 4px 32px rgba(0,0,0,0.5)",
        borderRadius: "2px",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: PAGE_W,
          height: PAGE_H,
          background: "white",
          transform: `scale(${SCALE})`,
          transformOrigin: "top left",
          position: "absolute",
          top: 0,
          left: 0,
          paddingTop: mt,
          paddingLeft: ml,
          paddingRight: mr,
          paddingBottom: 40,
          boxSizing: "border-box",
          fontFamily: `"${cfg.body.font}", Arial, sans-serif`,
          fontSize: `${cfg.body.sizePt}pt`,
          color: `#${cfg.body.color}`,
          lineHeight: cfg.body.lineMultiplier,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            textAlign: cfg.header.align,
            borderBottom: hdrBorder,
            paddingBottom:
              cfg.header.spacingAfterPt > 0 ? `${cfg.header.spacingAfterPt}pt` : "0",
            marginBottom: "6px",
          }}
        >
          <div
            style={{
              fontFamily: `"${cfg.header.nameFont}", Arial, sans-serif`,
              fontSize: `${cfg.header.namePt}pt`,
              fontWeight: cfg.header.nameBold ? "bold" : "normal",
              color: `#${cfg.header.nameColor}`,
              lineHeight: 1.2,
            }}
          >
            John Anderson
          </div>
          <div
            style={{
              fontFamily: `"${cfg.header.titleFont}", Arial, sans-serif`,
              fontSize: `${cfg.header.titlePt}pt`,
              fontStyle: cfg.header.titleItalic ? "italic" : "normal",
              fontWeight: cfg.header.titleBold ? "bold" : "normal",
              color: `#${cfg.header.titleColor}`,
              lineHeight: 1.3,
            }}
          >
            Senior Software Engineer
          </div>
          <div
            style={{
              fontSize: `${cfg.header.contactPt}pt`,
              color: `#${cfg.header.contactColor}`,
            }}
          >
            john@example.com&nbsp;&nbsp;•&nbsp;&nbsp;New York, NY&nbsp;&nbsp;•&nbsp;&nbsp;linkedin.com/in/janderson
          </div>
        </div>

        {/* Experience */}
        <div style={shStyle}>Experience</div>
        <JobEntry
          company="TechCorp Inc"
          title="Senior Software Engineer"
          date="2021 – Present"
          location="New York, NY"
        />
        <Bullets
          texts={[
            "Built microservices handling 50K+ daily requests",
            "Led migration from monolith to distributed architecture",
          ]}
        />
        <JobEntry
          company="StartupXYZ"
          title="Software Engineer"
          date="2019 – 2021"
          location="San Francisco, CA"
        />
        <Bullets texts={["Developed React frontend serving 100K monthly active users"]} />

        {/* Skills */}
        <div style={shStyle}>Skills</div>
        {[
          { cat: "Languages", val: "TypeScript, Python, Go, SQL" },
          { cat: "Frameworks", val: "Next.js, React, FastAPI" },
        ].map(({ cat, val }, i) => (
          <div
            key={i}
            style={{ fontSize: `${cfg.skills.sizePt}pt`, marginBottom: `${cfg.skills.spacingBeforePt}pt` }}
          >
            <span
              style={{
                fontWeight: cfg.skills.categoryBold ? "bold" : "normal",
                color: `#${cfg.skills.categoryColor}`,
              }}
            >
              {cat}:{" "}
            </span>
            <span style={{ color: `#${cfg.skills.valueColor}` }}>{val}</span>
          </div>
        ))}

        {/* Education */}
        <div style={shStyle}>Education</div>
        <div style={{ marginTop: `${cfg.education.spacingBeforePt}pt` }}>
          {/* Row 1: School (bold, left) | Location (right) */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span
              style={{
                fontSize: `${cfg.education.degreePt}pt`,
                fontWeight: cfg.education.schoolBold ? "bold" : "normal",
                color: `#${cfg.education.schoolColor}`,
              }}
            >
              University of Technology
            </span>
            <span
              style={{
                fontSize: `${cfg.education.degreePt}pt`,
                color: `#${cfg.education.schoolColor}`,
              }}
            >
              Shanghai, China
            </span>
          </div>
          {/* Row 2: Degree (left) | Start – End (right) */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span
              style={{
                fontSize: `${cfg.education.degreePt}pt`,
                color: `#${cfg.education.degreeColor}`,
              }}
            >
              B.S. Computer Science
            </span>
            <span
              style={{
                fontSize: `${cfg.education.datePt}pt`,
                color: `#${cfg.education.dateColor}`,
              }}
            >
              2016 – 2020
            </span>
          </div>
          {/* Row 3: GPA (optional) */}
          <div
            style={{
              fontSize: `${cfg.education.datePt}pt`,
              color: `#${cfg.education.gpaColor}`,
            }}
          >
            GPA: 3.8
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<StoredTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>("classic");
  const [workingConfig, setWorkingConfig] = useState<TemplateConfig>(deepClone(CLASSIC_CONFIG));
  const [tab, setTab] = useState<"preview" | "edit">("preview");
  const [saveName, setSaveName] = useState("Classic");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selectTemplate = (id: string) => {
    setSelectedId(id);
    setSaveStatus("idle");
    if (id === "classic") {
      setWorkingConfig(deepClone(CLASSIC_CONFIG));
      setSaveName("Classic");
    } else {
      const t = templates.find((t) => t.id === id);
      if (t) {
        setWorkingConfig(deepClone(t.config));
        setSaveName(t.name);
      }
    }
  };

  const updateSection = <K extends keyof TemplateConfig>(
    section: K,
    update: Partial<TemplateConfig[K]>
  ) => {
    setWorkingConfig((prev) => ({
      ...prev,
      [section]: { ...(prev[section] as object), ...update } as TemplateConfig[K],
    }));
    setSaveStatus("idle");
  };

  const handleSaveNew = async () => {
    const name = saveName.trim();
    if (!name) {
      setSaveError("Template name is required");
      setSaveStatus("error");
      return;
    }
    setSaving(true);
    setSaveStatus("idle");
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, config: { ...workingConfig, name } }),
      });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to save");
      const newT: StoredTemplate = await res.json();
      setTemplates((prev) => [...prev, newT]);
      setSelectedId(newT.id);
      setSaveStatus("success");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save");
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (selectedId === "classic") return;
    const name = saveName.trim();
    if (!name) {
      setSaveError("Template name is required");
      setSaveStatus("error");
      return;
    }
    setSaving(true);
    setSaveStatus("idle");
    try {
      const res = await fetch(`/api/templates/${selectedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, config: { ...workingConfig, name } }),
      });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to update");
      const updated: StoredTemplate = await res.json();
      setTemplates((prev) => prev.map((t) => (t.id === selectedId ? updated : t)));
      setSaveStatus("success");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to update");
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template? This cannot be undone.")) return;
    try {
      await fetch(`/api/templates/${id}`, { method: "DELETE" });
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      if (selectedId === id) {
        setSelectedId("classic");
        setWorkingConfig(deepClone(CLASSIC_CONFIG));
        setSaveName("Classic");
      }
    } catch {}
  };

  const isBuiltIn = selectedId === "classic";

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-8 py-6 border-b border-border shrink-0">
        <h1 className="text-lg font-semibold text-foreground">Templates</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Preview and customize resume templates. Edit settings then save as a new template.
        </p>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel — template list */}
        <div className="w-56 shrink-0 border-r border-border flex flex-col overflow-y-auto">
          <div className="p-3 space-y-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/50 px-3 pt-1 pb-1.5">
              Built-in
            </p>

            <button
              onClick={() => selectTemplate("classic")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                selectedId === "classic"
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <Star size={13} className="shrink-0" />
              <span className="truncate">Classic</span>
            </button>

            {(templates.length > 0 || loading) && (
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/50 px-3 pt-3 pb-1.5">
                Saved
              </p>
            )}

            {loading && (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                <Loader2 size={11} className="animate-spin" />
                Loading…
              </div>
            )}

            {templates.map((t) => (
              <div key={t.id} className="group flex items-center gap-0.5">
                <button
                  onClick={() => selectTemplate(t.id)}
                  className={`flex-1 flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors min-w-0 ${
                    selectedId === t.id
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  <LayoutTemplate size={13} className="shrink-0" />
                  <span className="truncate">{t.name}</span>
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-muted-foreground/50 hover:text-destructive transition-all shrink-0"
                  title="Delete template"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="px-6 pt-3 pb-0 border-b border-border flex items-center gap-1 shrink-0">
            <button
              onClick={() => setTab("preview")}
              className={`tab-btn ${tab === "preview" ? "tab-btn-active" : "tab-btn-inactive"}`}
            >
              Preview
            </button>
            <button
              onClick={() => setTab("edit")}
              className={`tab-btn ${tab === "edit" ? "tab-btn-active" : "tab-btn-inactive"}`}
            >
              Edit Settings
            </button>
            {tab === "edit" && (
              <span className="ml-2 text-[11px] text-muted-foreground/50">
                Switch to Preview to see changes live
              </span>
            )}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {tab === "preview" ? (
              <div className="flex justify-center items-start p-10 bg-muted/10 min-h-full">
                <ResumePreview cfg={workingConfig} />
              </div>
            ) : (
              <div className="max-w-md mx-auto px-6 py-6">
                <ConfigEditor cfg={workingConfig} onChange={updateSection} />
              </div>
            )}
          </div>

          {/* Save footer */}
          <div className="shrink-0 border-t border-border px-6 py-4 bg-card/30">
            <div className="flex items-center gap-3 max-w-md">
              <input
                type="text"
                value={saveName}
                onChange={(e) => {
                  setSaveName(e.target.value);
                  setSaveStatus("idle");
                }}
                placeholder="Template name…"
                className="field-input flex-1 h-9 text-sm"
              />
              {!isBuiltIn && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleUpdate}
                  disabled={saving}
                  className="shrink-0 gap-1.5"
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : null}
                  Update
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleSaveNew}
                disabled={saving}
                className="shrink-0 gap-1.5"
              >
                {saving ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Plus size={13} />
                )}
                Save as New
              </Button>
            </div>
            {saveStatus === "success" && (
              <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                <Check size={11} /> Template saved successfully.
              </p>
            )}
            {saveStatus === "error" && (
              <p className="text-xs text-destructive mt-2">{saveError}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
