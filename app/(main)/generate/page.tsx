"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Loader2, ExternalLink, Zap, RefreshCw, User,
  MessageSquare, Layers, CheckCircle2, AlertCircle,
  Clock, Cpu, Upload,
} from "lucide-react";
import { Profile, Prompt, Context } from "@/lib/types";
import { MODELS, DEFAULT_MODEL } from "@/lib/models";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

type JobStatus = "queued" | "generating" | "uploading" | "completed" | "failed";

interface ResumeJob {
  id: string;
  status: JobStatus;
  file_name: string | null;
  google_drive_link: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Status step UI ───────────────────────────────────────────────────────────

const STEPS: { key: JobStatus; label: string; icon: React.ReactNode }[] = [
  { key: "queued",     label: "Queued",     icon: <Clock     size={14} /> },
  { key: "generating", label: "Generating", icon: <Cpu       size={14} /> },
  { key: "uploading",  label: "Uploading",  icon: <Upload    size={14} /> },
  { key: "completed",  label: "Completed",  icon: <CheckCircle2 size={14} /> },
];

const STEP_ORDER: JobStatus[] = ["queued", "generating", "uploading", "completed"];

function StatusStepper({ status }: { status: JobStatus }) {
  const currentIdx = STEP_ORDER.indexOf(status === "failed" ? "queued" : status);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {STEPS.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx && status !== "failed";
        const cls = done
          ? "text-emerald-400"
          : active
          ? "text-primary"
          : "text-muted-foreground/40";

        return (
          <div key={step.key} className="flex items-center gap-2">
            <span className={`flex items-center gap-1 text-xs font-medium ${cls}`}>
              {active && <Loader2 size={12} className="animate-spin" />}
              {done && <CheckCircle2 size={12} />}
              {!active && !done && step.icon}
              {step.label}
            </span>
            {i < STEPS.length - 1 && (
              <span className={`text-xs ${done ? "text-emerald-400/50" : "text-muted-foreground/20"}`}>
                →
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeJob, setActiveJob] = useState<ResumeJob | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Clean up polling on unmount
  useEffect(() => () => { if (pollRef.current) clearTimeout(pollRef.current); }, []);

  const pollJob = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`/api/resume-jobs/${jobId}`);
      if (!res.ok) return;
      const job: ResumeJob = await res.json();
      setActiveJob(job);

      if (job.status !== "completed" && job.status !== "failed") {
        pollRef.current = setTimeout(() => pollJob(jobId), 2000);
      } else {
        setIsSubmitting(false);
      }
    } catch {
      pollRef.current = setTimeout(() => pollJob(jobId), 3000);
    }
  }, []);

  const generate = async () => {
    if (!profileId) { setSubmitError("Please select a profile."); return; }
    if (!jobDescription.trim()) { setSubmitError("Please paste a job description."); return; }

    if (pollRef.current) clearTimeout(pollRef.current);
    setIsSubmitting(true);
    setSubmitError(null);
    setActiveJob(null);

    let resumeData;
    try {
      const res = await fetch(`/api/profiles/${profileId}`);
      if (!res.ok) throw new Error("Failed to load profile");
      resumeData = (await res.json()).resume_data;
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to load profile");
      setIsSubmitting(false);
      return;
    }

    const selectedPrompt = prompts.find((p) => p.id === promptId);
    const selectedContext = contexts.find((c) => c.id === contextId);

    try {
      const res = await fetch("/api/resume-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeData,
          jobDescription,
          profileId,
          promptContent: selectedPrompt?.content,
          contextContent: selectedContext?.content,
          modelId,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to queue job" }));
        throw new Error(err.message || "Failed to queue job");
      }

      const { jobId } = await res.json();

      // Seed the job state immediately so the UI shows "queued"
      setActiveJob({
        id: jobId,
        status: "queued",
        file_name: null,
        google_drive_link: null,
        error_message: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Start polling after a short delay
      pollRef.current = setTimeout(() => pollJob(jobId), 1500);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Unknown error");
      setIsSubmitting(false);
    }
  };

  const isProcessing =
    isSubmitting ||
    (activeJob !== null &&
      activeJob.status !== "completed" &&
      activeJob.status !== "failed");

  return (
    <div className="h-full flex flex-col">
      <div className="px-8 py-6 border-b border-border">
        <h1 className="text-lg font-semibold text-foreground">Generate Tailored Resume</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Jobs run in the background — up to 10 concurrently. You get a live status update
          and a Google Drive link when ready.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-3xl space-y-6">

          {/* Configuration */}
          <div className="section-card space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Configuration</h2>

            {loadingData ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 size={14} className="animate-spin" /> Loading…
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                <div>
                  <label className="field-label">
                    Profile <span className="text-destructive">*</span>
                  </label>
                  {profiles.length === 0 ? (
                    <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 px-3 py-2 text-xs text-yellow-400">
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
                    <p className="text-[11px] text-muted-foreground/60 mt-1">
                      <Link href="/prompts" className="hover:text-muted-foreground underline">
                        Add custom prompts →
                      </Link>
                    </p>
                  )}
                </div>

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
                    <p className="text-[11px] text-muted-foreground/60 mt-1">
                      <Link href="/contexts" className="hover:text-muted-foreground underline">
                        Add role contexts →
                      </Link>
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

          {/* Job Description */}
          <div className="section-card space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Job Description</h2>
            <textarea
              className="field-textarea font-mono text-xs"
              rows={14}
              placeholder={
                "Paste the full job description here…\n\nThe AI will analyze requirements and tailor your resume to highlight the most relevant skills and experience."
              }
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {jobDescription.trim()
                ? `${jobDescription.trim().split(/\s+/).length} words`
                : "Tip: include the full posting for best results."}
            </p>
          </div>

          {/* Submit */}
          <Button
            onClick={generate}
            disabled={isProcessing || loadingData}
            className="w-full py-3 text-base h-auto"
          >
            {isProcessing ? (
              <><Loader2 size={16} className="animate-spin" /> Processing…</>
            ) : (
              <><Zap size={16} /> Generate Tailored Resume</>
            )}
          </Button>

          {/* Submit error */}
          {submitError && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive flex items-start gap-2">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Active job status card */}
          {activeJob && (
            <div className="section-card space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Job Progress</h2>
                <span className="text-[11px] font-mono text-muted-foreground/50">
                  {activeJob.id.slice(0, 8)}…
                </span>
              </div>

              <StatusStepper status={activeJob.status} />

              {/* Failed state */}
              {activeJob.status === "failed" && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive flex items-start gap-2">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Generation failed</p>
                    {activeJob.error_message && (
                      <p className="mt-1 text-xs opacity-80">{activeJob.error_message}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Completed state */}
              {activeJob.status === "completed" && activeJob.google_drive_link && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Resume tailored and ready!
                  </div>
                  <a
                    href={activeJob.google_drive_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary w-full justify-center"
                  >
                    <ExternalLink size={15} />
                    Open in Google Drive
                    {activeJob.file_name && (
                      <span className="text-xs opacity-70 ml-1">({activeJob.file_name})</span>
                    )}
                  </a>
                  <button
                    onClick={generate}
                    disabled={isProcessing}
                    className="btn-ghost w-full justify-center"
                  >
                    <RefreshCw size={13} /> Regenerate
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
