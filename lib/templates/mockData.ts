import type { ResumeDocData } from "./types";

export const MOCK_RESUME: ResumeDocData = {
  name: "Alexandra Chen",
  title: "Senior Software Engineer",
  contact: "alex.chen@email.com  •  San Francisco, CA  •  linkedin.com/in/alexchen",
  summary:
    "Full-stack engineer with 8+ years building high-performance distributed systems and developer tools at scale. Passionate about clean architecture, developer experience, and shipping products that delight users. Led teams of 4–6 engineers across 3 major platform rebuilds.",
  skills: [
    { category: "Languages", items: "TypeScript, Python, Go, Rust, SQL" },
    { category: "Frontend", items: "React, Next.js, Tailwind CSS, GraphQL" },
    { category: "Backend", items: "Node.js, FastAPI, PostgreSQL, Redis, Kafka" },
    { category: "Infrastructure", items: "AWS, Kubernetes, Docker, Terraform, CI/CD" },
  ],
  experience: [
    {
      company: "Stripe",
      location: "San Francisco, CA (Hybrid)",
      startDate: "03/2021",
      endDate: "Present",
      title: "Staff Software Engineer",
      bullets: [
        "Architected and led the migration of Stripe's payment routing engine from a monolith to microservices, reducing p99 latency by 42% and enabling 3× throughput growth.",
        "Designed a real-time fraud detection pipeline processing 120K events/second using Kafka and ML inference, preventing $18M in annual fraud losses.",
        "Mentored 6 senior engineers and established the team's technical roadmap, resulting in 2 promotions and a 95% team retention rate over 18 months.",
      ],
    },
    {
      company: "Airbnb",
      location: "San Francisco, CA (Remote)",
      startDate: "06/2018",
      endDate: "02/2021",
      title: "Senior Software Engineer",
      bullets: [
        "Built the infrastructure for Airbnb's dynamic pricing engine, processing 50M+ listings globally and improving host revenue by an average of 12%.",
        "Reduced front-end bundle size by 38% through code-splitting and lazy loading, improving Core Web Vitals scores from 62 to 91.",
        "Led a 4-person team to rebuild the host onboarding flow, increasing listing completion rates from 54% to 78% over 6 months.",
      ],
    },
    {
      company: "Dropbox",
      location: "San Francisco, CA (On-site)",
      startDate: "07/2016",
      endDate: "05/2018",
      title: "Software Engineer",
      bullets: [
        "Developed core features for Dropbox Paper's collaborative editing engine, supporting 2M+ daily active users with <100ms sync latency.",
        "Improved test coverage from 41% to 87% and introduced contract testing, reducing production incidents by 60%.",
      ],
    },
  ],
  education: [
    {
      degree: "B.S., Computer Science",
      school: "University of California, Berkeley",
      startDate: "08/2012",
      endDate: "05/2016",
      gpa: "3.8/4.0",
    },
  ],
};
