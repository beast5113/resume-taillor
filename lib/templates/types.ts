export interface ResumeDocData {
  name: string;
  title: string;
  contact: string;
  summary: string;
  skills: { category: string; items: string }[];
  experience: {
    company: string;
    location: string;
    startDate: string;
    endDate: string;
    title: string;
    bullets: string[];
  }[];
  education: {
    degree: string;
    school: string;
    startDate: string;
    endDate: string;
    gpa?: string;
  }[];
}

export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
}

export const TEMPLATES: TemplateInfo[] = [
  { id: "classic", name: "Classic", description: "Centered header · Montserrat headers · traditional" },
];
