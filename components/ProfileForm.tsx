"use client";

import { useState, useCallback } from "react";
import {
  ResumeData,
  Experience,
  Education,
  BulletSeed,
  emptyBullet,
  normaliseBullets,
  DEFAULT_BULLET_MAX,
  MAX_BULLETS_PER_JOB,
  MIN_BULLETS_PER_JOB,
} from "@/lib/types";

type Tab = "personal" | "skills" | "experience" | "education";

const MAX_LENGTH_OPTIONS = [
  { value: 0,   label: "No limit" },
  { value: 100, label: "100 chars" },
  { value: 120, label: "120 chars" },
  { value: 150, label: "150 chars" },
  { value: 180, label: "180 chars" },
  { value: 200, label: "200 chars" },
  { value: 250, label: "250 chars" },
];

function PlusIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

// ─── Personal ─────────────────────────────────────────────────────────────────

function PersonalTab({
  data,
  onChange,
}: {
  data: ResumeData;
  onChange: (patch: Partial<ResumeData>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="field-label">Full Name *</label>
        <input
          className="field-input"
          placeholder="Jane Smith"
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">Email</label>
          <input
            className="field-input"
            type="email"
            placeholder="jane@example.com"
            value={data.email}
            onChange={(e) => onChange({ email: e.target.value })}
          />
        </div>
        <div>
          <label className="field-label">Phone</label>
          <input
            className="field-input"
            type="tel"
            placeholder="+1 (312) 555-0100"
            value={data.phone ?? ""}
            onChange={(e) => onChange({ phone: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">Location</label>
          <input
            className="field-input"
            placeholder="Chicago, IL"
            value={data.location}
            onChange={(e) => onChange({ location: e.target.value })}
          />
        </div>
        <div>
          <label className="field-label">LinkedIn URL</label>
          <input
            className="field-input"
            placeholder="linkedin.com/in/janesmith"
            value={data.linkedin}
            onChange={(e) => onChange({ linkedin: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Skills ───────────────────────────────────────────────────────────────────

function SkillsTab({
  basicSkills,
  onChange,
}: {
  basicSkills: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="field-label">Basic Skill Set</label>
        <textarea
          className="field-textarea"
          rows={6}
          placeholder="TypeScript, React, Node.js, PostgreSQL, AWS, Docker, GraphQL, Python, Redis, Kubernetes…"
          value={basicSkills ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
        <p className="text-xs text-muted-foreground mt-1.5">
          Comma-separated raw list. The AI splits these into{" "}
          <span className="text-foreground/70 font-medium">Core Expertise</span> and{" "}
          <span className="text-foreground/70 font-medium">Tools &amp; Technologies</span> based on
          the target job.
        </p>
      </div>
    </div>
  );
}

// ─── Experience ───────────────────────────────────────────────────────────────

function BulletRow({
  bullet,
  index,
  canRemove,
  onChange,
  onRemove,
}: {
  bullet: BulletSeed;
  index: number;
  canRemove: boolean;
  onChange: (patch: Partial<BulletSeed>) => void;
  onRemove: () => void;
}) {
  const lim = bullet.maxLength;
  const len = bullet.text.length;
  const atLimit = lim > 0 && len >= lim;
  const nearLimit = lim > 0 && len >= lim * 0.85;

  return (
    <div className="flex gap-2 items-start">
      {/* Bullet index badge */}
      <div className="w-5 h-5 rounded bg-muted/40 flex items-center justify-center shrink-0 mt-2 text-[10px] font-mono text-muted-foreground select-none">
        {index + 1}
      </div>

      {/* Textarea */}
      <div className="flex-1 relative">
        <textarea
          className="field-textarea w-full"
          rows={2}
          maxLength={lim > 0 ? lim : undefined}
          placeholder="Seed content — AI will rewrite and optimise this…"
          value={bullet.text}
          onChange={(e) => onChange({ text: e.target.value })}
        />
        {lim > 0 && (
          <span
            className={`absolute bottom-2 right-2 text-[10px] tabular-nums pointer-events-none ${
              atLimit
                ? "text-destructive font-medium"
                : nearLimit
                ? "text-yellow-500"
                : "text-muted-foreground/40"
            }`}
          >
            {len}/{lim}
          </span>
        )}
      </div>

      {/* Max length selector */}
      <div className="flex flex-col items-end gap-1 shrink-0 mt-1">
        <select
          value={bullet.maxLength}
          onChange={(e) => onChange({ maxLength: parseInt(e.target.value) })}
          title="Max character limit for the generated bullet"
          className="h-7 w-28 rounded-md border border-input bg-card px-2 text-[11px] text-muted-foreground focus-visible:border-ring outline-none cursor-pointer"
        >
          {MAX_LENGTH_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.value === DEFAULT_BULLET_MAX ? `${o.label} ★` : o.label}
            </option>
          ))}
        </select>
        {canRemove && (
          <button
            onClick={onRemove}
            className="btn-ghost text-red-400 hover:text-red-300 hover:bg-red-900/20 px-1.5 py-1"
            title="Remove bullet"
          >
            <TrashIcon />
          </button>
        )}
      </div>
    </div>
  );
}

function ExperienceTab({
  experience,
  onChange,
}: {
  experience: Experience[];
  onChange: (exp: Experience[]) => void;
}) {
  const updateJob = (i: number, patch: Partial<Experience>) =>
    onChange(experience.map((j, idx) => (idx === i ? { ...j, ...patch } : j)));

  const addJob = () =>
    onChange([
      ...experience,
      {
        company: "",
        location: "",
        startDate: "",
        endDate: "",
        title: "",
        bullets: [emptyBullet(), emptyBullet(), emptyBullet(), emptyBullet()],
      },
    ]);

  const removeJob = (i: number) => onChange(experience.filter((_, idx) => idx !== i));

  // Normalises legacy string[] bullets from DB without causing render-time side effects
  const getBullets = (job: Experience): BulletSeed[] =>
    normaliseBullets(job.bullets as unknown[]);

  const updateBullet = (jobIdx: number, bIdx: number, patch: Partial<BulletSeed>) => {
    const bullets = getBullets(experience[jobIdx]).map((b, i) =>
      i === bIdx ? { ...b, ...patch } : b
    );
    updateJob(jobIdx, { bullets });
  };

  const addBullet = (jobIdx: number) => {
    const bullets = getBullets(experience[jobIdx]);
    if (bullets.length >= MAX_BULLETS_PER_JOB) return;
    updateJob(jobIdx, { bullets: [...bullets, emptyBullet()] });
  };

  const removeBullet = (jobIdx: number, bIdx: number) => {
    const bullets = getBullets(experience[jobIdx]);
    if (bullets.length <= MIN_BULLETS_PER_JOB) return;
    updateJob(jobIdx, { bullets: bullets.filter((_, i) => i !== bIdx) });
  };

  const setBulletCount = (jobIdx: number, count: number) => {
    const clamped = Math.min(MAX_BULLETS_PER_JOB, Math.max(MIN_BULLETS_PER_JOB, count));
    const bullets = getBullets(experience[jobIdx]);
    const current = bullets.length;
    if (clamped === current) return;
    const next =
      clamped > current
        ? [...bullets, ...Array.from({ length: clamped - current }, emptyBullet)]
        : bullets.slice(0, clamped);
    updateJob(jobIdx, { bullets: next });
  };

  return (
    <div className="space-y-5">
      {experience.map((job, i) => {
        // Pure derivation — no side effects during render
        const bullets = getBullets(job);

        return (
          <div
            key={i}
            className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50 space-y-3"
          >
            {/* Job header */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Job {i + 1}
              </span>
              {experience.length > 1 && (
                <button
                  onClick={() => removeJob(i)}
                  className="btn-ghost text-red-400 hover:text-red-300 hover:bg-red-900/20"
                >
                  <TrashIcon /> Remove
                </button>
              )}
            </div>

            {/* Fields */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="field-label">Company</label>
                <input
                  className="field-input"
                  placeholder="Acme Corp"
                  value={job.company}
                  onChange={(e) => updateJob(i, { company: e.target.value })}
                />
              </div>
              <div>
                <label className="field-label">Location</label>
                <input
                  className="field-input"
                  placeholder="San Francisco, CA (Remote)"
                  value={job.location}
                  onChange={(e) => updateJob(i, { location: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="field-label">Job Title</label>
              <input
                className="field-input"
                placeholder="Senior Software Engineer"
                value={job.title}
                onChange={(e) => updateJob(i, { title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="field-label">Start Date</label>
                <input
                  className="field-input"
                  placeholder="03/2023"
                  value={job.startDate}
                  onChange={(e) => updateJob(i, { startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="field-label">End Date</label>
                <input
                  className="field-input"
                  placeholder="Present"
                  value={job.endDate}
                  onChange={(e) => updateJob(i, { endDate: e.target.value })}
                />
              </div>
            </div>

            {/* Bullet section */}
            <div className="space-y-2 pt-1">
              {/* Bullet count row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Bullet Count</span>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => setBulletCount(i, bullets.length - 1)}
                      disabled={bullets.length <= MIN_BULLETS_PER_JOB}
                      className="w-6 h-6 rounded border border-input flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed text-base leading-none"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-mono text-foreground tabular-nums">
                      {bullets.length}
                    </span>
                    <button
                      onClick={() => setBulletCount(i, bullets.length + 1)}
                      disabled={bullets.length >= MAX_BULLETS_PER_JOB}
                      className="w-6 h-6 rounded border border-input flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed text-base leading-none"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-[11px] text-muted-foreground/50">
                    max {MAX_BULLETS_PER_JOB}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground/50">
                  Max limit per bullet →
                </span>
              </div>

              {/* Bullet rows */}
              <div className="space-y-2">
                {bullets.map((bullet, bIdx) => (
                  <BulletRow
                    key={bIdx}
                    bullet={bullet}
                    index={bIdx}
                    canRemove={bullets.length > MIN_BULLETS_PER_JOB}
                    onChange={(patch) => updateBullet(i, bIdx, patch)}
                    onRemove={() => removeBullet(i, bIdx)}
                  />
                ))}
              </div>

              <button onClick={() => addBullet(i)} className="btn-ghost mt-1">
                <PlusIcon /> Add Bullet
              </button>
            </div>
          </div>
        );
      })}
      <button onClick={addJob} className="btn-secondary w-full">
        <PlusIcon /> Add Job
      </button>
    </div>
  );
}

// ─── Education ────────────────────────────────────────────────────────────────

function EducationTab({
  education,
  onChange,
}: {
  education: Education[];
  onChange: (edu: Education[]) => void;
}) {
  const update = (i: number, patch: Partial<Education>) =>
    onChange(education.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  const add = () =>
    onChange([...education, { degree: "", school: "", location: "", startDate: "", endDate: "", gpa: "" }]);
  const remove = (i: number) => onChange(education.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-4">
      {education.map((edu, i) => (
        <div
          key={i}
          className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Education {i + 1}
            </span>
            {education.length > 1 && (
              <button
                onClick={() => remove(i)}
                className="btn-ghost text-red-400 hover:text-red-300 hover:bg-red-900/20"
              >
                <TrashIcon /> Remove
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="field-label">School</label>
              <input
                className="field-input"
                placeholder="University of Chicago"
                value={edu.school}
                onChange={(e) => update(i, { school: e.target.value })}
              />
            </div>
            <div>
              <label className="field-label">Location</label>
              <input
                className="field-input"
                placeholder="Chicago, IL"
                value={edu.location ?? ""}
                onChange={(e) => update(i, { location: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="field-label">Degree</label>
            <input
              className="field-input"
              placeholder="Bachelor's Degree in Computer Science"
              value={edu.degree}
              onChange={(e) => update(i, { degree: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="field-label">Start Date</label>
              <input
                className="field-input"
                placeholder="04/2013"
                value={edu.startDate}
                onChange={(e) => update(i, { startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="field-label">End Date</label>
              <input
                className="field-input"
                placeholder="09/2017"
                value={edu.endDate}
                onChange={(e) => update(i, { endDate: e.target.value })}
              />
            </div>
            <div>
              <label className="field-label">GPA (optional)</label>
              <input
                className="field-input"
                placeholder="3.8/4.0"
                value={edu.gpa ?? ""}
                onChange={(e) => update(i, { gpa: e.target.value })}
              />
            </div>
          </div>
        </div>
      ))}
      <button onClick={add} className="btn-secondary w-full">
        <PlusIcon /> Add Education
      </button>
    </div>
  );
}

// ─── Root form ────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: "personal",   label: "Personal"   },
  { id: "skills",     label: "Skills"     },
  { id: "experience", label: "Experience" },
  { id: "education",  label: "Education"  },
];

interface ProfileFormProps {
  data: ResumeData;
  onChange: (data: ResumeData) => void;
}

export default function ProfileForm({ data, onChange }: ProfileFormProps) {
  const [activeTab, setActiveTab] = useState<Tab>("personal");

  const patch = useCallback(
    (p: Partial<ResumeData>) => onChange({ ...data, ...p }),
    [data, onChange]
  );

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex gap-1 bg-zinc-800/60 rounded-lg p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`tab-btn flex-1 ${
              activeTab === t.id ? "tab-btn-active" : "tab-btn-inactive"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === "personal" && <PersonalTab data={data} onChange={patch} />}
        {activeTab === "skills" && (
          <SkillsTab
            basicSkills={data.basicSkills ?? ""}
            onChange={(v) => patch({ basicSkills: v })}
          />
        )}
        {activeTab === "experience" && (
          <ExperienceTab
            experience={data.experience}
            onChange={(experience) => patch({ experience })}
          />
        )}
        {activeTab === "education" && (
          <EducationTab
            education={data.education}
            onChange={(education) => patch({ education })}
          />
        )}
      </div>
    </div>
  );
}
