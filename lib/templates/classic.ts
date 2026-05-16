import { buildFromConfig } from "./configToDocx";
import { CLASSIC_CONFIG } from "./config";
import type { ResumeDocData } from "./types";

export async function buildClassic(data: ResumeDocData): Promise<Buffer> {
  return buildFromConfig(data, CLASSIC_CONFIG);
}
