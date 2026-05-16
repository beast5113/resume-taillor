"use client";

import { useRef, useEffect, useState, CSSProperties } from "react";
import type { TemplateConfig, BorderStyleValue } from "@/lib/templates/config";
import type { ResumeDocData } from "@/lib/templates/types";

function cssBorder(style: BorderStyleValue, sizePt: number, color: string): string {
  if (style === "none") return "none";
  const css = style === "double" ? "double" : "solid";
  const width = style === "thick" ? Math.max(sizePt * 1.5, 1.5) : sizePt;
  return `${width}pt ${css} #${color}`;
}

function cssAlign(a: string): CSSProperties["textAlign"] {
  return a as CSSProperties["textAlign"];
}

interface Props {
  config: TemplateConfig;
  data: ResumeDocData;
}

export default function TemplatePreviewPane({ config, data }: Props) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.48);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / 816);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { header: h, sectionHeader: sh, body: b, job: j, bullet: bul, skills: sk, education: edu, page } = config;

  const docStyle: CSSProperties = {
    width: 816,
    minHeight: 1056,
    backgroundColor: "#fff",
    fontFamily: b.font + ", Calibri, Arial, sans-serif",
    fontSize: `${b.sizePt}pt`,
    color: `#${b.color}`,
    paddingTop: `${page.marginTopIn}in`,
    paddingBottom: `${page.marginBottomIn}in`,
    paddingLeft: `${page.marginLeftIn}in`,
    paddingRight: `${page.marginRightIn}in`,
    boxSizing: "border-box",
    lineHeight: String(b.lineMultiplier),
    transformOrigin: "top left",
    transform: `scale(${scale})`,
    position: "absolute",
    top: 0,
    left: 0,
  };

  const headerStyle: CSSProperties = {
    textAlign: cssAlign(h.align),
    borderBottom: cssBorder(h.borderStyle, h.borderSizePt, h.borderColor),
    paddingBottom: h.borderStyle !== "none" ? "6pt" : undefined,
    marginBottom: `${h.spacingAfterPt}pt`,
  };

  const sectionStyle = (first = false): CSSProperties => ({
    borderBottom: cssBorder(sh.borderBottomStyle, sh.borderBottomSizePt, sh.borderBottomColor),
    borderLeft: cssBorder(sh.borderLeftStyle, sh.borderLeftSizePt, sh.borderLeftColor),
    paddingLeft: sh.borderLeftStyle !== "none" ? `${sh.indentLeftIn * 96 + 8}px` : undefined,
    marginLeft: sh.borderLeftStyle !== "none" ? `${sh.indentLeftIn * 96}px` : undefined,
    marginTop: first ? 0 : `${sh.spacingBeforePt}pt`,
    marginBottom: `${sh.spacingAfterPt}pt`,
    paddingBottom: sh.borderBottomStyle !== "none" ? "2pt" : undefined,
    fontFamily: sh.font + ", Calibri, Arial, sans-serif",
    fontSize: `${sh.sizePt}pt`,
    fontWeight: sh.bold ? "bold" : "normal",
    textTransform: sh.allCaps ? "uppercase" : "none",
    color: `#${sh.color}`,
  });

  return (
    <div
      ref={outerRef}
      style={{
        width: "100%",
        height: Math.round(1056 * scale),
        overflow: "hidden",
        position: "relative",
        flexShrink: 0,
      }}
    >
      <div style={docStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ fontFamily: h.nameFont + ", Calibri, Arial, sans-serif", fontSize: `${h.namePt}pt`, fontWeight: h.nameBold ? "bold" : "normal", color: `#${h.nameColor}` }}>
            {data.name}
          </div>
          <div style={{ fontFamily: h.titleFont + ", Calibri, Arial, sans-serif", fontSize: `${h.titlePt}pt`, fontStyle: h.titleItalic ? "italic" : "normal", fontWeight: h.titleBold ? "bold" : "normal", color: `#${h.titleColor}` }}>
            {data.title}
          </div>
          <div style={{ fontFamily: h.titleFont + ", Calibri, Arial, sans-serif", fontSize: `${h.contactPt}pt`, color: `#${h.contactColor}` }}>
            {data.contact}
          </div>
        </div>

        {/* Summary */}
        <div style={sectionStyle(true)}>SUMMARY</div>
        <p style={{ marginTop: `${b.summarySpacingBeforePt}pt`, marginBottom: `${b.summarySpacingAfterPt}pt`, fontSize: `${b.sizePt}pt`, color: `#${b.color}` }}>
          {data.summary}
        </p>

        {/* Skills */}
        <div style={sectionStyle()}>SKILLS</div>
        {data.skills.map((s, i) => (
          <div key={i} style={{ marginTop: `${sk.spacingBeforePt}pt`, fontSize: `${sk.sizePt}pt` }}>
            <span style={{ fontWeight: sk.categoryBold ? "bold" : "normal", color: `#${sk.categoryColor}` }}>{s.category}: </span>
            <span style={{ color: `#${sk.valueColor}` }}>{s.items}</span>
          </div>
        ))}

        {/* Experience */}
        <div style={sectionStyle()}>PROFESSIONAL EXPERIENCE</div>
        {data.experience.map((job, i) => (
          <div key={i}>
            <div style={{ marginTop: `${j.spacingBeforePt}pt`, display: "flex", justifyContent: "space-between" }}>
              <span>
                <span style={{ fontFamily: j.companyFont + ", Calibri, Arial, sans-serif", fontSize: `${j.companyPt}pt`, fontWeight: j.companyBold ? "bold" : "normal", color: `#${j.companyColor}` }}>{job.company}</span>
                <span style={{ fontSize: `${j.datePt}pt`, fontWeight: j.locationBold ? "bold" : "normal", fontStyle: j.locationItalic ? "italic" : "normal", color: `#${j.locationColor}` }}>{j.separator}{job.location}</span>
              </span>
              <span style={{ fontSize: `${j.datePt}pt`, fontWeight: j.dateBold ? "bold" : "normal", fontStyle: j.dateItalic ? "italic" : "normal", color: `#${j.dateColor}` }}>{job.startDate} – {job.endDate}</span>
            </div>
            <div style={{ fontFamily: j.titleFont + ", Calibri, Arial, sans-serif", fontSize: `${j.titlePt}pt`, fontStyle: j.titleItalic ? "italic" : "normal", fontWeight: j.titleBold ? "bold" : "normal", color: `#${j.titleColor}` }}>
              {job.title}
            </div>
            <ul style={{ margin: 0, paddingLeft: `${bul.indentLeftIn}in`, listStyleType: "none" }}>
              {job.bullets.map((bullet, bi) => (
                <li key={bi} style={{ marginBottom: `${bul.spacingAfterPt}pt`, fontSize: `${bul.sizePt}pt`, color: `#${bul.color}` }}>
                  <span style={{ marginRight: "0.25em" }}>{bul.char}</span>{bullet}
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Education */}
        <div style={sectionStyle()}>EDUCATION</div>
        {data.education.map((e, i) => (
          <div key={i} style={{ marginTop: `${edu.spacingBeforePt}pt` }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: `${edu.degreePt}pt`, color: `#${edu.degreeColor}` }}>{e.degree}</span>
              <span style={{ fontSize: `${edu.datePt}pt`, color: `#${edu.dateColor}` }}>{e.startDate} – {e.endDate}</span>
            </div>
            <div>
              <span style={{ fontSize: `${edu.degreePt}pt`, fontWeight: edu.schoolBold ? "bold" : "normal", color: `#${edu.schoolColor}` }}>{e.school}</span>
              {e.gpa && <span style={{ fontSize: `${edu.datePt}pt`, color: `#${edu.gpaColor}`, marginLeft: "0.5em" }}>GPA: {e.gpa}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
