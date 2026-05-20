export type { ResumeDocData } from "./templates/types";
import type { ResumeDocData } from "./templates/types";
import { buildClassic } from "./templates/classic";

export async function buildResumeBuffer(data: ResumeDocData): Promise<Buffer> {
  return buildClassic(data);
}
