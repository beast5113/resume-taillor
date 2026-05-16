"use client";

import { useState, useCallback } from "react";
import { ResumeData, Experience, Education, SkillCategory } from "@/lib/types";

type Tab = "personal" | "skills" | "experience" | "education";

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

function PersonalTab({ data, onChange }: { data: ResumeData; onChange: (patch: Partial<ResumeData>) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">Full Name *</label>
          <input className="field-input" placeholder="Jane Smith" value={data.name} onChange={(e) => onChange({ name: e.target.value })} />
        </div>
        <div>
          <label className="field-label">Professional Title</label>
          <input className="field-input" placeholder="Senior Software Engineer" value={data.title} onChange={(e) => onChange({ title: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">Email</label>
          <input className="field-input" type="email" placeholder="jane@example.com" value={data.email} onChange={(e) => onChange({ email: e.target.value })} />
        </div>
        <div>
          <label className="field-label">Location</label>
          <input className="field-input" placeholder="San Francisco, CA" value={data.location} onChange={(e) => onChange({ location: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="field-label">LinkedIn URL</label>
        <input className="field-input" placeholder="linkedin.com/in/janesmith" value={data.linkedin} onChange={(e) => onChange({ linkedin: e.target.value })} />
      </div>
      <div>
        <label className="field-label">Professional Summary</label>
        <textarea className="field-textarea" rows={4} placeholder="Brief overview of your background and expertise..." value={data.summary} onChange={(e) => onChange({ summary: e.target.value })} />
        <p className="text-xs text-zinc-500 mt-1">The AI will tailor this for the specific job.</p>
      </div>
    </div>
  );
}

function SkillsTab({ skills, onChange }: { skills: SkillCategory[]; onChange: (skills: SkillCategory[]) => void }) {
  const update = (i: number, patch: Partial<SkillCategory>) =>
    onChange(skills.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const add = () => onChange([...skills, { category: "", items: "" }]);
  const remove = (i: number) => onChange(skills.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      {skills.map((skill, i) => (
        <div key={i} className="flex gap-2 items-start">
          <div className="flex-1 grid grid-cols-2 gap-2">
            <div>
              <label className="field-label">Category</label>
              <input className="field-input" placeholder="Frontend" value={skill.category} onChange={(e) => update(i, { category: e.target.value })} />
            </div>
            <div>
              <label className="field-label">Skills (comma-separated)</label>
              <input className="field-input" placeholder="React, TypeScript, Next.js" value={skill.items} onChange={(e) => update(i, { items: e.target.value })} />
            </div>
          </div>
          {skills.length > 1 && (
            <button onClick={() => remove(i)} className="btn-ghost mt-5 text-red-400 hover:text-red-300 hover:bg-red-900/20" title="Remove">
              <TrashIcon />
            </button>
          )}
        </div>
      ))}
      <button onClick={add} className="btn-ghost"><PlusIcon /> Add Category</button>
    </div>
  );
}

function ExperienceTab({ experience, onChange }: { experience: Experience[]; onChange: (exp: Experience[]) => void }) {
  const updateJob = (i: number, patch: Partial<Experience>) =>
    onChange(experience.map((j, idx) => (idx === i ? { ...j, ...patch } : j)));
  const addJob = () =>
    onChange([...experience, { company: "", location: "", startDate: "", endDate: "", title: "", bullets: [""] }]);
  const removeJob = (i: number) => onChange(experience.filter((_, idx) => idx !== i));

  const updateBullet = (jobIdx: number, bIdx: number, val: string) => {
    const bullets = experience[jobIdx].bullets.map((b, i) => (i === bIdx ? val : b));
    updateJob(jobIdx, { bullets });
  };
  const addBullet = (jobIdx: number) =>
    updateJob(jobIdx, { bullets: [...experience[jobIdx].bullets, ""] });
  const removeBullet = (jobIdx: number, bIdx: number) =>
    updateJob(jobIdx, { bullets: experience[jobIdx].bullets.filter((_, i) => i !== bIdx) });

  return (
    <div className="space-y-5">
      {experience.map((job, i) => (
        <div key={i} className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Job {i + 1}</span>
            {experience.length > 1 && (
              <button onClick={() => removeJob(i)} className="btn-ghost text-red-400 hover:text-red-300 hover:bg-red-900/20">
                <TrashIcon /> Remove
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="field-label">Company</label>
              <input className="field-input" placeholder="Acme Corp" value={job.company} onChange={(e) => updateJob(i, { company: e.target.value })} />
            </div>
            <div>
              <label className="field-label">Location</label>
              <input className="field-input" placeholder="San Francisco, CA (Remote)" value={job.location} onChange={(e) => updateJob(i, { location: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="field-label">Job Title</label>
            <input className="field-input" placeholder="Senior Software Engineer" value={job.title} onChange={(e) => updateJob(i, { title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="field-label">Start Date</label>
              <input className="field-input" placeholder="06/2021" value={job.startDate} onChange={(e) => updateJob(i, { startDate: e.target.value })} />
            </div>
            <div>
              <label className="field-label">End Date</label>
              <input className="field-input" placeholder="Present" value={job.endDate} onChange={(e) => updateJob(i, { endDate: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="field-label">Bullet Points</label>
            <div className="space-y-2">
              {job.bullets.map((bullet, bIdx) => (
                <div key={bIdx} className="flex gap-2 items-start">
                  <textarea className="field-textarea flex-1" rows={2} placeholder="Led redesign of checkout flow, reducing drop-off by 18%..." value={bullet} onChange={(e) => updateBullet(i, bIdx, e.target.value)} />
                  {job.bullets.length > 1 && (
                    <button onClick={() => removeBullet(i, bIdx)} className="btn-ghost text-red-400 hover:text-red-300 hover:bg-red-900/20 mt-1" title="Remove bullet">
                      <TrashIcon />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => addBullet(i)} className="btn-ghost"><PlusIcon /> Add Bullet</button>
            </div>
          </div>
        </div>
      ))}
      <button onClick={addJob} className="btn-secondary w-full"><PlusIcon /> Add Job</button>
    </div>
  );
}

function EducationTab({ education, onChange }: { education: Education[]; onChange: (edu: Education[]) => void }) {
  const update = (i: number, patch: Partial<Education>) =>
    onChange(education.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  const add = () => onChange([...education, { degree: "", school: "", startDate: "", endDate: "", gpa: "" }]);
  const remove = (i: number) => onChange(education.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-4">
      {education.map((edu, i) => (
        <div key={i} className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Education {i + 1}</span>
            {education.length > 1 && (
              <button onClick={() => remove(i)} className="btn-ghost text-red-400 hover:text-red-300 hover:bg-red-900/20">
                <TrashIcon /> Remove
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="field-label">Degree</label>
              <input className="field-input" placeholder="B.S. Computer Science" value={edu.degree} onChange={(e) => update(i, { degree: e.target.value })} />
            </div>
            <div>
              <label className="field-label">School</label>
              <input className="field-input" placeholder="Stanford University" value={edu.school} onChange={(e) => update(i, { school: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="field-label">Start Date</label>
              <input className="field-input" placeholder="09/2013" value={edu.startDate} onChange={(e) => update(i, { startDate: e.target.value })} />
            </div>
            <div>
              <label className="field-label">End Date</label>
              <input className="field-input" placeholder="06/2017" value={edu.endDate} onChange={(e) => update(i, { endDate: e.target.value })} />
            </div>
            <div>
              <label className="field-label">GPA (optional)</label>
              <input className="field-input" placeholder="3.9/4.0" value={edu.gpa ?? ""} onChange={(e) => update(i, { gpa: e.target.value })} />
            </div>
          </div>
        </div>
      ))}
      <button onClick={add} className="btn-secondary w-full"><PlusIcon /> Add Education</button>
    </div>
  );
}

const TABS: { id: Tab; label: string }[] = [
  { id: "personal", label: "Personal" },
  { id: "skills", label: "Skills" },
  { id: "experience", label: "Experience" },
  { id: "education", label: "Education" },
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
            className={`tab-btn flex-1 ${activeTab === t.id ? "tab-btn-active" : "tab-btn-inactive"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === "personal" && <PersonalTab data={data} onChange={patch} />}
        {activeTab === "skills" && (
          <SkillsTab skills={data.skills} onChange={(skills) => patch({ skills })} />
        )}
        {activeTab === "experience" && (
          <ExperienceTab experience={data.experience} onChange={(experience) => patch({ experience })} />
        )}
        {activeTab === "education" && (
          <EducationTab education={data.education} onChange={(education) => patch({ education })} />
        )}
      </div>
    </div>
  );
}
