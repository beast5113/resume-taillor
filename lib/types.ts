export interface SkillCategory {
  category: string;
  items: string;
}

export interface Experience {
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  title: string;
  bullets: string[];
}

export interface Education {
  degree: string;
  school: string;
  startDate: string;
  endDate: string;
  gpa?: string;
}

export interface ResumeData {
  name: string;
  title: string;
  email: string;
  location: string;
  linkedin: string;
  contact: string;
  summary: string;
  skills: SkillCategory[];
  experience: Experience[];
  education: Education[];
}

export interface Profile {
  id: string;
  name: string;
  resume_data: ResumeData;
  created_at: string;
  updated_at: string;
}

export interface Prompt {
  id: string;
  name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Context {
  id: string;
  name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface TemplatePreset {
  id: string;
  name: string;
  baseId: string;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_RESUME_DATA: ResumeData = {
  name: "",
  title: "",
  email: "",
  location: "",
  linkedin: "",
  contact: "",
  summary: "",
  skills: [{ category: "", items: "" }],
  experience: [
    {
      company: "",
      location: "",
      startDate: "",
      endDate: "",
      title: "",
      bullets: [""],
    },
  ],
  education: [
    {
      degree: "",
      school: "",
      startDate: "",
      endDate: "",
      gpa: "",
    },
  ],
};
