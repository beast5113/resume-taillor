export interface SkillCategory {
  category: string;
  items: string;
}

export interface BulletSeed {
  text: string;
  /** Max chars for the AI-generated bullet. 0 = no limit. */
  maxLength: number;
}

export interface Experience {
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  title: string;
  bullets: BulletSeed[];
}

export interface Education {
  degree: string;
  school: string;
  location: string;
  startDate: string;
  endDate: string;
  gpa?: string;
}

export interface ResumeData {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  /** Raw comma-separated skills; AI categorises into technical_skills and tools_and_technologies */
  basicSkills: string;
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

export const DEFAULT_BULLET_MAX = 150;
export const MAX_BULLETS_PER_JOB = 15;
export const MIN_BULLETS_PER_JOB = 1;

export function emptyBullet(): BulletSeed {
  return { text: "", maxLength: DEFAULT_BULLET_MAX };
}

/** Normalises legacy string[] bullets (stored in DB before this change) to BulletSeed[]. */
export function normaliseBullets(raw: unknown[]): BulletSeed[] {
  return raw.map((b) =>
    typeof b === "string"
      ? { text: b, maxLength: DEFAULT_BULLET_MAX }
      : (b as BulletSeed)
  );
}

export const DEFAULT_RESUME_DATA: ResumeData = {
  name: "",
  email: "",
  phone: "",
  location: "",
  linkedin: "",
  basicSkills: "",
  experience: [
    {
      company: "",
      location: "",
      startDate: "",
      endDate: "",
      title: "",
      bullets: [emptyBullet(), emptyBullet(), emptyBullet(), emptyBullet()],
    },
  ],
  education: [
    {
      degree: "",
      school: "",
      location: "",
      startDate: "",
      endDate: "",
      gpa: "",
    },
  ],
};
