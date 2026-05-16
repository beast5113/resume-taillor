export type { ResumeDocData } from "./templates/types";
import type { ResumeDocData } from "./templates/types";
import { buildClassic }   from "./templates/classic";
import { buildModern }    from "./templates/modern";
import { buildExecutive } from "./templates/executive";
import { buildMinimal }   from "./templates/minimal";

export async function buildResumeBuffer(data: ResumeDocData, templateId = "classic"): Promise<Buffer> {
  switch (templateId) {
    case "modern":    return buildModern(data);
    case "executive": return buildExecutive(data);
    case "minimal":   return buildMinimal(data);
    default:          return buildClassic(data);
  }
}
