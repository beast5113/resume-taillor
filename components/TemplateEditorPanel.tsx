"use client";

import { useState } from "react";
import type { TemplateConfig, BorderStyleValue, AlignValue } from "@/lib/templates/config";

const FONTS = ["Calibri", "Arial", "Times New Roman", "Georgia", "Montserrat", "Garamond", "Helvetica", "Verdana", "Tahoma"];
const BORDER_STYLES: BorderStyleValue[] = ["none", "single", "double", "thick"];
const ALIGNS: AlignValue[] = ["left", "center", "right"];
const BULLET_CHARS = ["•", "·", "–", "›", "▪", "→", "◦", "-"];
const TABS = ["Page", "Header", "Sections", "Body & Jobs", "Bullets & Skills", "Education"] as const;

interface Props {
  config: TemplateConfig;
  onChange: (c: TemplateConfig) => void;
}

// --- tiny field helpers ---

function Label({ text }: { text: string }) {
  return <span className="text-[11px] text-zinc-400 leading-none">{text}</span>;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <Label text={label} />
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={"#" + value}
          onChange={(e) => onChange(e.target.value.replace("#", ""))}
          className="w-7 h-7 rounded border border-zinc-700 cursor-pointer bg-zinc-900 p-0.5"
        />
        <input
          type="text"
          value={value}
          maxLength={6}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6))}
          className="field-input text-[11px] py-1 px-2 w-20 font-mono"
        />
      </div>
    </div>
  );
}

function NumberField({ label, value, min, max, step, unit, onChange }: { label: string; value: number; min: number; max: number; step: number; unit?: string; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <Label text={label} />
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="field-input text-[11px] py-1 px-2 w-20"
        />
        {unit && <span className="text-[11px] text-zinc-500">{unit}</span>}
      </div>
    </div>
  );
}

function SelectField<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: T[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <Label text={label} />
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className="field-input text-[11px] py-1">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function CheckField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="w-3.5 h-3.5 accent-blue-500" />
      <span className="text-[11px] text-zinc-400">{label}</span>
    </label>
  );
}

function TextField({ label, value, onChange, maxLength }: { label: string; value: string; onChange: (v: string) => void; maxLength?: number }) {
  return (
    <div className="flex flex-col gap-1">
      <Label text={label} />
      <input
        type="text"
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="field-input text-[11px] py-1 px-2"
      />
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="col-span-2 flex items-center gap-2 pt-2 pb-1">
      <div className="h-px flex-1 bg-zinc-700" />
      <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wide">{label}</span>
      <div className="h-px flex-1 bg-zinc-700" />
    </div>
  );
}

// --- tab panels ---

function PageTab({ config, set }: { config: TemplateConfig; set: <K extends keyof TemplateConfig>(section: K, patch: Partial<TemplateConfig[K]>) => void }) {
  const p = config.page;
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
      <NumberField label="Margin Top" value={p.marginTopIn} min={0.3} max={2} step={0.05} unit="in" onChange={(v) => set("page", { marginTopIn: v })} />
      <NumberField label="Margin Bottom" value={p.marginBottomIn} min={0.3} max={2} step={0.05} unit="in" onChange={(v) => set("page", { marginBottomIn: v })} />
      <NumberField label="Margin Left" value={p.marginLeftIn} min={0.3} max={2} step={0.05} unit="in" onChange={(v) => set("page", { marginLeftIn: v })} />
      <NumberField label="Margin Right" value={p.marginRightIn} min={0.3} max={2} step={0.05} unit="in" onChange={(v) => set("page", { marginRightIn: v })} />
    </div>
  );
}

function HeaderTab({ config, set }: { config: TemplateConfig; set: <K extends keyof TemplateConfig>(section: K, patch: Partial<TemplateConfig[K]>) => void }) {
  const h = config.header;
  const s = (p: Partial<typeof h>) => set("header", p);
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
      <SelectField label="Alignment" value={h.align} options={ALIGNS} onChange={(v) => s({ align: v })} />
      <NumberField label="Spacing After" value={h.spacingAfterPt} min={0} max={40} step={0.5} unit="pt" onChange={(v) => s({ spacingAfterPt: v })} />
      <Divider label="Name" />
      <SelectField label="Font" value={h.nameFont} options={FONTS} onChange={(v) => s({ nameFont: v })} />
      <NumberField label="Size" value={h.namePt} min={8} max={36} step={0.5} unit="pt" onChange={(v) => s({ namePt: v })} />
      <CheckField label="Bold" value={h.nameBold} onChange={(v) => s({ nameBold: v })} />
      <ColorField label="Color" value={h.nameColor} onChange={(v) => s({ nameColor: v })} />
      <Divider label="Title" />
      <SelectField label="Font" value={h.titleFont} options={FONTS} onChange={(v) => s({ titleFont: v })} />
      <NumberField label="Size" value={h.titlePt} min={8} max={24} step={0.5} unit="pt" onChange={(v) => s({ titlePt: v })} />
      <CheckField label="Italic" value={h.titleItalic} onChange={(v) => s({ titleItalic: v })} />
      <CheckField label="Bold" value={h.titleBold} onChange={(v) => s({ titleBold: v })} />
      <ColorField label="Color" value={h.titleColor} onChange={(v) => s({ titleColor: v })} />
      <Divider label="Contact" />
      <NumberField label="Size" value={h.contactPt} min={7} max={14} step={0.5} unit="pt" onChange={(v) => s({ contactPt: v })} />
      <ColorField label="Color" value={h.contactColor} onChange={(v) => s({ contactColor: v })} />
      <Divider label="Bottom Border" />
      <SelectField label="Style" value={h.borderStyle} options={BORDER_STYLES} onChange={(v) => s({ borderStyle: v })} />
      <NumberField label="Size" value={h.borderSizePt} min={0.1} max={4} step={0.1} unit="pt" onChange={(v) => s({ borderSizePt: v })} />
      <ColorField label="Color" value={h.borderColor} onChange={(v) => s({ borderColor: v })} />
    </div>
  );
}

function SectionsTab({ config, set }: { config: TemplateConfig; set: <K extends keyof TemplateConfig>(section: K, patch: Partial<TemplateConfig[K]>) => void }) {
  const sh = config.sectionHeader;
  const s = (p: Partial<typeof sh>) => set("sectionHeader", p);
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
      <SelectField label="Font" value={sh.font} options={FONTS} onChange={(v) => s({ font: v })} />
      <NumberField label="Size" value={sh.sizePt} min={7} max={18} step={0.5} unit="pt" onChange={(v) => s({ sizePt: v })} />
      <CheckField label="Bold" value={sh.bold} onChange={(v) => s({ bold: v })} />
      <CheckField label="ALL CAPS" value={sh.allCaps} onChange={(v) => s({ allCaps: v })} />
      <ColorField label="Color" value={sh.color} onChange={(v) => s({ color: v })} />
      <NumberField label="Spacing Before" value={sh.spacingBeforePt} min={0} max={40} step={0.5} unit="pt" onChange={(v) => s({ spacingBeforePt: v })} />
      <NumberField label="Spacing After" value={sh.spacingAfterPt} min={0} max={20} step={0.5} unit="pt" onChange={(v) => s({ spacingAfterPt: v })} />
      <Divider label="Bottom Border" />
      <SelectField label="Style" value={sh.borderBottomStyle} options={BORDER_STYLES} onChange={(v) => s({ borderBottomStyle: v })} />
      <NumberField label="Size" value={sh.borderBottomSizePt} min={0.1} max={4} step={0.1} unit="pt" onChange={(v) => s({ borderBottomSizePt: v })} />
      <ColorField label="Color" value={sh.borderBottomColor} onChange={(v) => s({ borderBottomColor: v })} />
      <Divider label="Left Accent Border" />
      <SelectField label="Style" value={sh.borderLeftStyle} options={BORDER_STYLES} onChange={(v) => s({ borderLeftStyle: v })} />
      <NumberField label="Size" value={sh.borderLeftSizePt} min={0.1} max={8} step={0.1} unit="pt" onChange={(v) => s({ borderLeftSizePt: v })} />
      <ColorField label="Color" value={sh.borderLeftColor} onChange={(v) => s({ borderLeftColor: v })} />
      <NumberField label="Indent Left" value={sh.indentLeftIn} min={0} max={0.5} step={0.01} unit="in" onChange={(v) => s({ indentLeftIn: v })} />
    </div>
  );
}

function BodyJobsTab({ config, set }: { config: TemplateConfig; set: <K extends keyof TemplateConfig>(section: K, patch: Partial<TemplateConfig[K]>) => void }) {
  const bo = config.body;
  const jo = config.job;
  const sb = (p: Partial<typeof bo>) => set("body", p);
  const sj = (p: Partial<typeof jo>) => set("job", p);
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
      <Divider label="Body Text" />
      <SelectField label="Font" value={bo.font} options={FONTS} onChange={(v) => sb({ font: v })} />
      <NumberField label="Size" value={bo.sizePt} min={7} max={16} step={0.5} unit="pt" onChange={(v) => sb({ sizePt: v })} />
      <ColorField label="Color" value={bo.color} onChange={(v) => sb({ color: v })} />
      <NumberField label="Line Height" value={bo.lineMultiplier} min={1} max={3} step={0.05} onChange={(v) => sb({ lineMultiplier: v })} />
      <NumberField label="Summary Before" value={bo.summarySpacingBeforePt} min={0} max={20} step={0.5} unit="pt" onChange={(v) => sb({ summarySpacingBeforePt: v })} />
      <NumberField label="Summary After" value={bo.summarySpacingAfterPt} min={0} max={20} step={0.5} unit="pt" onChange={(v) => sb({ summarySpacingAfterPt: v })} />
      <Divider label="Job Company" />
      <SelectField label="Font" value={jo.companyFont} options={FONTS} onChange={(v) => sj({ companyFont: v })} />
      <NumberField label="Size" value={jo.companyPt} min={7} max={16} step={0.5} unit="pt" onChange={(v) => sj({ companyPt: v })} />
      <CheckField label="Bold" value={jo.companyBold} onChange={(v) => sj({ companyBold: v })} />
      <ColorField label="Color" value={jo.companyColor} onChange={(v) => sj({ companyColor: v })} />
      <TextField label="Separator" value={jo.separator} onChange={(v) => sj({ separator: v })} maxLength={10} />
      <ColorField label="Location Color" value={jo.locationColor} onChange={(v) => sj({ locationColor: v })} />
      <Divider label="Job Title" />
      <SelectField label="Font" value={jo.titleFont} options={FONTS} onChange={(v) => sj({ titleFont: v })} />
      <NumberField label="Size" value={jo.titlePt} min={7} max={16} step={0.5} unit="pt" onChange={(v) => sj({ titlePt: v })} />
      <CheckField label="Italic" value={jo.titleItalic} onChange={(v) => sj({ titleItalic: v })} />
      <CheckField label="Bold" value={jo.titleBold} onChange={(v) => sj({ titleBold: v })} />
      <ColorField label="Color" value={jo.titleColor} onChange={(v) => sj({ titleColor: v })} />
      <Divider label="Date & Spacing" />
      <NumberField label="Date Size" value={jo.datePt} min={7} max={14} step={0.5} unit="pt" onChange={(v) => sj({ datePt: v })} />
      <ColorField label="Date Color" value={jo.dateColor} onChange={(v) => sj({ dateColor: v })} />
      <NumberField label="Job Spacing Before" value={jo.spacingBeforePt} min={0} max={30} step={0.5} unit="pt" onChange={(v) => sj({ spacingBeforePt: v })} />
    </div>
  );
}

function BulletsSkillsTab({ config, set }: { config: TemplateConfig; set: <K extends keyof TemplateConfig>(section: K, patch: Partial<TemplateConfig[K]>) => void }) {
  const bu = config.bullet;
  const sk = config.skills;
  const sbu = (p: Partial<typeof bu>) => set("bullet", p);
  const ssk = (p: Partial<typeof sk>) => set("skills", p);
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
      <Divider label="Bullets" />
      <div className="flex flex-col gap-1">
        <Label text="Character" />
        <div className="flex flex-wrap gap-1">
          {BULLET_CHARS.map((c) => (
            <button
              key={c}
              onClick={() => sbu({ char: c })}
              className={`w-7 h-7 rounded text-sm border transition-colors ${bu.char === c ? "bg-blue-600 border-blue-500 text-white" : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500"}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <TextField label="Custom Char" value={bu.char} onChange={(v) => sbu({ char: v })} maxLength={3} />
      <NumberField label="Size" value={bu.sizePt} min={7} max={14} step={0.5} unit="pt" onChange={(v) => sbu({ sizePt: v })} />
      <ColorField label="Color" value={bu.color} onChange={(v) => sbu({ color: v })} />
      <NumberField label="Indent Left" value={bu.indentLeftIn} min={0.1} max={1} step={0.05} unit="in" onChange={(v) => sbu({ indentLeftIn: v })} />
      <NumberField label="Spacing After" value={bu.spacingAfterPt} min={0} max={20} step={0.5} unit="pt" onChange={(v) => sbu({ spacingAfterPt: v })} />
      <Divider label="Skills" />
      <NumberField label="Size" value={sk.sizePt} min={7} max={14} step={0.5} unit="pt" onChange={(v) => ssk({ sizePt: v })} />
      <NumberField label="Spacing Before" value={sk.spacingBeforePt} min={0} max={20} step={0.5} unit="pt" onChange={(v) => ssk({ spacingBeforePt: v })} />
      <CheckField label="Category Bold" value={sk.categoryBold} onChange={(v) => ssk({ categoryBold: v })} />
      <ColorField label="Category Color" value={sk.categoryColor} onChange={(v) => ssk({ categoryColor: v })} />
      <ColorField label="Value Color" value={sk.valueColor} onChange={(v) => ssk({ valueColor: v })} />
    </div>
  );
}

function EducationTab({ config, set }: { config: TemplateConfig; set: <K extends keyof TemplateConfig>(section: K, patch: Partial<TemplateConfig[K]>) => void }) {
  const e = config.education;
  const se = (p: Partial<typeof e>) => set("education", p);
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
      <NumberField label="Degree Size" value={e.degreePt} min={7} max={14} step={0.5} unit="pt" onChange={(v) => se({ degreePt: v })} />
      <ColorField label="Degree Color" value={e.degreeColor} onChange={(v) => se({ degreeColor: v })} />
      <CheckField label="School Bold" value={e.schoolBold} onChange={(v) => se({ schoolBold: v })} />
      <ColorField label="School Color" value={e.schoolColor} onChange={(v) => se({ schoolColor: v })} />
      <NumberField label="Date Size" value={e.datePt} min={7} max={14} step={0.5} unit="pt" onChange={(v) => se({ datePt: v })} />
      <ColorField label="Date Color" value={e.dateColor} onChange={(v) => se({ dateColor: v })} />
      <ColorField label="GPA Color" value={e.gpaColor} onChange={(v) => se({ gpaColor: v })} />
      <NumberField label="Spacing Before" value={e.spacingBeforePt} min={0} max={20} step={0.5} unit="pt" onChange={(v) => se({ spacingBeforePt: v })} />
    </div>
  );
}

export default function TemplateEditorPanel({ config, onChange }: Props) {
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>("Page");

  function set<K extends keyof TemplateConfig>(section: K, patch: Partial<TemplateConfig[K]>) {
    onChange({ ...config, [section]: { ...(config[section] as object), ...patch } });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex gap-0.5 px-4 pt-4 pb-2 border-b border-zinc-800 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              activeTab === tab
                ? "bg-blue-600 text-white"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {activeTab === "Page"           && <PageTab config={config} set={set} />}
        {activeTab === "Header"         && <HeaderTab config={config} set={set} />}
        {activeTab === "Sections"       && <SectionsTab config={config} set={set} />}
        {activeTab === "Body & Jobs"    && <BodyJobsTab config={config} set={set} />}
        {activeTab === "Bullets & Skills" && <BulletsSkillsTab config={config} set={set} />}
        {activeTab === "Education"      && <EducationTab config={config} set={set} />}
      </div>
    </div>
  );
}
