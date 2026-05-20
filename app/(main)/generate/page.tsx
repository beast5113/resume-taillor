"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, Download, Zap, RefreshCw, User, MessageSquare, Layers } from "lucide-react";
import { Profile, Prompt, Context } from "@/lib/types";
import { MODELS, DEFAULT_MODEL } from "@/lib/models";
import { Button } from "@/components/ui/button";

export default function GeneratePage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [contexts, setContexts] = useState<Context[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [profileId, setProfileId] = useState("");
  const [promptId, setPromptId] = useState("");
  const [contextId, setContextId] = useState("");
  const [modelId, setModelId] = useState(DEFAULT_MODEL);
  const [jobDescription, setJobDescription] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<{ type: "idle" | "success" | "error"; message?: string }>({ type: "idle" });
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState("resume.docx");

  useEffect(() => {
    Promise.all([
      fetch("/api/profiles").then((r) => r.json()).catch(() => []),
      fetch("/api/prompts").then((r) => r.json()).catch(() => []),
      fetch("/api/contexts").then((r) => r.json()).catch(() => []),
    ]).then(([p, pr, ctx]) => {
      setProfiles(Array.isArray(p) ? p : []);
      setPrompts(Array.isArray(pr) ? pr : []);
      setContexts(Array.isArray(ctx) ? ctx : []);
    }).finally(() => setLoadingData(false));
  }, []);

  const generate = async () => {
    if (!profileId) { setStatus({ type: "error", message: "Please select a profile." }); return; }
    if (!jobDescription.trim()) { setStatus({ type: "error", message: "Please paste a job description." }); return; }

    setIsGenerating(true);
    setStatus({ type: "idle" });
    if (downloadUrl) { URL.revokeObjectURL(downloadUrl); setDownloadUrl(null); }

    let resumeData;
    try {
      const res = await fetch(`/api/profiles/${profileId}`);
      if (!res.ok) throw new Error("Failed to load profile");
      resumeData = (await res.json()).resume_data;
    } catch (err) {
      setStatus({ type: "error", message: err instanceof Error ? err.message : "Failed to load profile" });
      setIsGenerating(false);
      return;
    }

    const { email, location, linkedin } = resumeData;
    const contact = [email, location, linkedin].filter(Boolean).join("  •  ");
    const selectedPrompt = prompts.find((p) => p.id === promptId);
    const selectedContext = contexts.find((c) => c.id === contextId);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeData: { ...resumeData, contact },
          jobDescription,
          promptContent: selectedPrompt?.content,
          contextContent: selectedContext?.content,
          modelId,
          templateId: "classic",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Generation failed" }));
        throw new Error(err.message || "Generation failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const filename = res.headers.get("X-Filename") || "resume.docx";
      setDownloadUrl(url);
      setDownloadName(filename);
      setStatus({ type: "success", message: "Resume tailored and ready!" });
    } catch (err) {
      setStatus({ type: "error", message: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-8 py-6 border-b border-border">
        <h1 className="text-lg font-semibold text-foreground">Generate Tailored Resume</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Select a profile and job description, optionally apply a custom prompt and context.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-3xl space-y-6">
          <div className="section-card space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Configuration</h2>

            {loadingData ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 size={14} className="animate-spin" />
                Loading…
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="field-label">Model</label>
                  <select className="field-input" value={modelId} onChange={(e) => setModelId(e.target.value)}>
                    {MODELS.map((m) => (
                      <option key={m.id} value={m.id}>{m.label} — {m.description}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="field-label">Profile <span className="text-destructive">*</span></label>
                  {profiles.length === 0 ? (
                    <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 px-3 py-2 text-xs text-yellow-400">
                      No profiles yet.{" "}
                      <Link href="/profiles" className="underline hover:text-yellow-300">Create one →</Link>
                    </div>
                  ) : (
                    <select className="field-input" value={profileId} onChange={(e) => setProfileId(e.target.value)}>
                      <option value="">Select profile…</option>
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="field-label">Prompt</label>
                  <select className="field-input" value={promptId} onChange={(e) => setPromptId(e.target.value)}>
                    <option value="">Default AI prompt</option>
                    {prompts.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  {prompts.length === 0 && (
                    <p className="text-[11px] text-muted-foreground/60 mt-1">
                      <Link href="/prompts" className="hover:text-muted-foreground underline">Add custom prompts →</Link>
                    </p>
                  )}
                </div>

                <div>
                  <label className="field-label">Context</label>
                  <select className="field-input" value={contextId} onChange={(e) => setContextId(e.target.value)}>
                    <option value="">None</option>
                    {contexts.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {contexts.length === 0 && (
                    <p className="text-[11px] text-muted-foreground/60 mt-1">
                      <Link href="/contexts" className="hover:text-muted-foreground underline">Add role contexts →</Link>
                    </p>
                  )}
                </div>
              </div>
            )}

            {(profileId || promptId || contextId) && (
              <div className="flex flex-wrap gap-2 pt-1">
                {profileId && (
                  <span className="inline-flex items-center gap-1.5 bg-primary/15 border border-primary/30 rounded-full px-2.5 py-0.5 text-xs text-primary">
                    <User size={11} /> {profiles.find((p) => p.id === profileId)?.name}
                  </span>
                )}
                {promptId && (
                  <span className="inline-flex items-center gap-1.5 bg-violet-500/15 border border-violet-500/30 rounded-full px-2.5 py-0.5 text-xs text-violet-400">
                    <MessageSquare size={11} /> {prompts.find((p) => p.id === promptId)?.name}
                  </span>
                )}
                {contextId && (
                  <span className="inline-flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-2.5 py-0.5 text-xs text-emerald-400">
                    <Layers size={11} /> {contexts.find((c) => c.id === contextId)?.name}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="section-card space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Job Description</h2>
            <textarea
              className="field-textarea font-mono text-xs"
              rows={14}
              placeholder={"Paste the full job description here…\n\nThe AI will analyze requirements and tailor your resume to highlight the most relevant skills and experience."}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {jobDescription.trim()
                ? `${jobDescription.trim().split(/\s+/).length} words`
                : "Tip: include the full posting for best results."}
            </p>
          </div>

          <Button onClick={generate} disabled={isGenerating || loadingData} className="w-full py-3 text-base h-auto">
            {isGenerating ? (
              <><Loader2 size={16} className="animate-spin" /> Tailoring resume…</>
            ) : (
              <><Zap size={16} /> Generate Tailored Resume</>
            )}
          </Button>

          {status.type === "error" && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
              <span className="font-medium">Error: </span>{status.message}
            </div>
          )}

          {status.type === "success" && downloadUrl && (
            <div className="section-card flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {status.message}
              </div>
              <a href={downloadUrl} download={downloadName} className="btn-primary w-full justify-center">
                <Download size={15} /> Download {downloadName}
              </a>
              <button onClick={generate} disabled={isGenerating} className="btn-ghost w-full justify-center">
                <RefreshCw size={13} /> Regenerate
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
