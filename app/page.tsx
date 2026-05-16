"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Profile, Prompt, Context } from "@/lib/types";
import { MODELS, DEFAULT_MODEL } from "@/lib/models";
import TemplateSelector from "@/components/TemplateSelector";

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

export default function GeneratePage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [contexts, setContexts] = useState<Context[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [profileId, setProfileId] = useState("");
  const [promptId, setPromptId] = useState("");
  const [contextId, setContextId] = useState("");
  const [modelId, setModelId] = useState(DEFAULT_MODEL);
  const [templateId, setTemplateId] = useState("classic");
  const [jobDescription, setJobDescription] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<{ type: "idle" | "success" | "error"; message?: string }>({ type: "idle" });
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState("resume.docx");

  useEffect(() => {
    Promise.all([
      fetch("/api/profiles").then((r) => r.json()),
      fetch("/api/prompts").then((r) => r.json()),
      fetch("/api/contexts").then((r) => r.json()),
    ])
      .then(([p, pr, ctx]) => {
        setProfiles(Array.isArray(p) ? p : []);
        setPrompts(Array.isArray(pr) ? pr : []);
        setContexts(Array.isArray(ctx) ? ctx : []);
      })
      .finally(() => setLoadingData(false));
  }, []);

  const generate = async () => {
    if (!profileId) {
      setStatus({ type: "error", message: "Please select a profile." });
      return;
    }
    if (!jobDescription.trim()) {
      setStatus({ type: "error", message: "Please paste a job description." });
      return;
    }

    setIsGenerating(true);
    setStatus({ type: "idle" });
    if (downloadUrl) { URL.revokeObjectURL(downloadUrl); setDownloadUrl(null); }

    // Fetch the full profile data (resume_data)
    let resumeData;
    try {
      const res = await fetch(`/api/profiles/${profileId}`);
      if (!res.ok) throw new Error("Failed to load profile");
      const profile = await res.json();
      resumeData = profile.resume_data;
    } catch (err) {
      setStatus({ type: "error", message: err instanceof Error ? err.message : "Failed to load profile" });
      setIsGenerating(false);
      return;
    }

    // Resolve contact string
    const { email, location, linkedin } = resumeData;
    const contact = [email, location, linkedin].filter(Boolean).join("  •  ");

    // Resolve optional prompt/context content
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
          templateId,
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

  const hasProfiles = profiles.length > 0;

  return (
    <div className="h-full flex flex-col">
      {/* Page header */}
      <div className="px-8 py-6 border-b border-zinc-800">
        <h1 className="text-lg font-semibold text-zinc-100">Generate Tailored Resume</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Select a profile and job description, optionally apply a custom prompt and context.</p>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-3xl space-y-6">

          {/* Selectors */}
          <div className="section-card space-y-4">
            <h2 className="text-sm font-semibold text-zinc-200">Configuration</h2>

            {loadingData ? (
              <div className="flex items-center gap-2 text-sm text-zinc-500 py-2">
                <Spinner /> Loading profiles, prompts &amp; contexts…
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Model */}
                <div>
                  <label className="field-label">Model</label>
                  <select
                    className="field-input"
                    value={modelId}
                    onChange={(e) => setModelId(e.target.value)}
                  >
                    {MODELS.map((m) => (
                      <option key={m.id} value={m.id}>{m.label} — {m.description}</option>
                    ))}
                  </select>
                </div>

                {/* Profile */}
                <div>
                  <label className="field-label">
                    Profile <span className="text-red-400">*</span>
                  </label>
                  {!hasProfiles ? (
                    <div className="rounded-md bg-yellow-900/20 border border-yellow-700/40 px-3 py-2 text-xs text-yellow-400">
                      No profiles yet.{" "}
                      <Link href="/profiles" className="underline hover:text-yellow-300">Create one →</Link>
                    </div>
                  ) : (
                    <select
                      className="field-input"
                      value={profileId}
                      onChange={(e) => setProfileId(e.target.value)}
                    >
                      <option value="">Select profile…</option>
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Prompt */}
                <div>
                  <label className="field-label">Prompt</label>
                  <select
                    className="field-input"
                    value={promptId}
                    onChange={(e) => setPromptId(e.target.value)}
                  >
                    <option value="">Default AI prompt</option>
                    {prompts.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  {prompts.length === 0 && (
                    <p className="text-[11px] text-zinc-600 mt-1">
                      <Link href="/prompts" className="hover:text-zinc-400 underline">Add custom prompts →</Link>
                    </p>
                  )}
                </div>

                {/* Context */}
                <div>
                  <label className="field-label">Context</label>
                  <select
                    className="field-input"
                    value={contextId}
                    onChange={(e) => setContextId(e.target.value)}
                  >
                    <option value="">None</option>
                    {contexts.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {contexts.length === 0 && (
                    <p className="text-[11px] text-zinc-600 mt-1">
                      <Link href="/contexts" className="hover:text-zinc-400 underline">Add role contexts →</Link>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Template selector */}
            <TemplateSelector value={templateId} onChange={setTemplateId} />

            {/* Selected combination hint */}
            {(profileId || promptId || contextId) && (
              <div className="flex flex-wrap gap-2 pt-1">
                {profileId && (
                  <span className="inline-flex items-center gap-1.5 bg-blue-900/30 border border-blue-700/40 rounded-full px-2.5 py-0.5 text-xs text-blue-300">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {profiles.find((p) => p.id === profileId)?.name}
                  </span>
                )}
                {promptId && (
                  <span className="inline-flex items-center gap-1.5 bg-violet-900/30 border border-violet-700/40 rounded-full px-2.5 py-0.5 text-xs text-violet-300">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    {prompts.find((p) => p.id === promptId)?.name}
                  </span>
                )}
                {contextId && (
                  <span className="inline-flex items-center gap-1.5 bg-emerald-900/30 border border-emerald-700/40 rounded-full px-2.5 py-0.5 text-xs text-emerald-300">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    {contexts.find((c) => c.id === contextId)?.name}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Job description */}
          <div className="section-card space-y-3">
            <h2 className="text-sm font-semibold text-zinc-200">Job Description</h2>
            <textarea
              className="field-textarea"
              rows={14}
              placeholder={"Paste the full job description here…\n\nThe AI will analyze requirements and tailor your resume to highlight the most relevant skills and experience."}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
            <p className="text-xs text-zinc-500">
              {jobDescription.trim()
                ? `${jobDescription.trim().split(/\s+/).length} words`
                : "Tip: include the full posting for best results."}
            </p>
          </div>

          {/* Generate button */}
          <button
            onClick={generate}
            disabled={isGenerating || loadingData}
            className="btn-primary w-full py-3 text-base"
          >
            {isGenerating ? (
              <><Spinner /> Tailoring resume…</>
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate Tailored Resume
              </>
            )}
          </button>

          {/* Error */}
          {status.type === "error" && (
            <div className="rounded-lg bg-red-900/30 border border-red-700/50 px-4 py-3 text-sm text-red-300">
              <span className="font-medium">Error: </span>{status.message}
            </div>
          )}

          {/* Success + download */}
          {status.type === "success" && downloadUrl && (
            <div className="rounded-lg bg-green-900/30 border border-green-700/50 px-4 py-4 flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 text-green-300">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium">{status.message}</span>
              </div>
              <a href={downloadUrl} download={downloadName} className="btn-primary w-full justify-center">
                <DownloadIcon /> Download {downloadName}
              </a>
              <button onClick={generate} disabled={isGenerating} className="btn-ghost w-full justify-center text-zinc-400">
                Regenerate
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
