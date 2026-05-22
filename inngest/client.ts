import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "resume-tailor",
  isDev: process.env.INNGEST_DEV === "1",
});
