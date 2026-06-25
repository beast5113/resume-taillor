"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Loader2, Download, Check, X, Copy, Zap, Code2,
  ChevronLeft, ChevronRight, PackageCheck, AlertTriangle,
  RefreshCw, Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog } from "@base-ui/react/dialog";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Application {
  id: string;
  seq: number;
  role: string;
  company_name: string;
  job_board: string | null;
  profile_id: string | null;
  profile_name: string | null;
  status: string;
  pipeline_status: string;
  created_at: string;
}

interface DocxTemplate { id: string; name: string; }
interface Profile { id: string; name: string; }

type CardPhase =
  | "idle"
  | "generating"
  | "building"
  | "ready"
  | "copying"
  | "uploading"
  | "done"
  | "error";

interface CardState {
  phase: CardPhase;
  file: { data: ArrayBuffer; filename: string } | null;
  error: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PAGE_SIZE = 8;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── JSON Modal ────────────────────────────────────────────────────────────────

function JsonModal({
  open,
  onClose,
  onBuild,
  building,
}: {
  open: boolean;
  onClose: () => void;
  onBuild: (json: string) => void;
  building: boolean;
}) {
  const [value, setValue] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setValue(""); setJsonError(null); }
  }, [open]);

  const validate = () => {
    try {
      JSON.parse(value.trim());
      setJsonError(null);
      return true;
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : "Invalid JSON");
      return false;
    }
  };

  const handleBuild = () => {
    if (validate()) onBuild(value.trim());
  };

  return (
    <Dialog.Root open={open} onOpenChange={open => { if (!open && !building) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 duration-150" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-2xl bg-card rounded-xl ring-1 ring-foreground/10 shadow-xl flex flex-col data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 duration-150">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <Dialog.Title className="text-sm font-semibold text-foreground">Manual JSON Input</Dialog.Title>
              <Dialog.Description className="text-xs text-muted-foreground mt-0.5">
                Paste your JSON object (from ChatGPT or other sources) to build the resume
              </Dialog.Description>
            </div>
            <Dialog.Close render={
              <button disabled={building} className="size-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40">
                <X size={14} />
              </button>
            } />
          </div>
          <div className="px-5 py-4 space-y-3">
            <textarea
              className="field-input w-full font-mono text-xs px-3 py-2 resize-none rounded-lg min-h-72"
              placeholder={'{\n  "profile_title": "...",\n  "profile_summary": "...",\n  "skills": [...],\n  "experience": [...]\n}'}
              value={value}
              onChange={e => { setValue(e.target.value); setJsonError(null); }}
              disabled={building}
              spellCheck={false}
            />
            {jsonError && (
              <p className="text-xs text-destructive flex items-center gap-1.5">
                <AlertTriangle size={12} />{jsonError}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 px-5 pb-5">
            <Dialog.Close render={<Button variant="outline" size="sm" disabled={building}>Cancel</Button>} />
            <Button size="sm" variant="outline" onClick={validate} disabled={building || !value.trim()}>
              Validate
            </Button>
            <Button size="sm" onClick={handleBuild} disabled={building || !value.trim()}>
              {building ? <><Loader2 size={13} className="animate-spin" />Building…</> : "Build Resume"}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ── Application Card ──────────────────────────────────────────────────────────

function AppCard({
  app,
  templateId,
  profiles,
  state,
  onGenerate,
  onBuildJson,
  onCopyPrompt,
  onDownload,
  onComplete,
}: {
  app: Application;
  templateId: string;
  profiles: Profile[];
  state: CardState;
  onGenerate: () => void;
  onBuildJson: (json: string) => void;
  onCopyPrompt: () => void;
  onDownload: () => void;
  onComplete: (profileId: string) => void;
}) {
  const [jsonModalOpen, setJsonModalOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState(app.profile_id ?? "");
  const [copied, setCopied] = useState(false);

  const effectiveProfileId = app.profile_id ?? selectedProfileId;

  const handleCopyPrompt = async () => {
    await onCopyPrompt();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const { phase, error } = state;
  const busy = phase === "generating" || phase === "building" || phase === "uploading" || phase === "copying";

  if (phase === "done") {
    return (
      <div className="bg-card rounded-xl ring-1 ring-green-500/30 p-4 flex flex-col items-center justify-center gap-2 min-h-44 text-center">
        <div className="size-10 rounded-full bg-green-500/10 flex items-center justify-center">
          <Check size={20} className="text-green-500" />
        </div>
        <p className="text-sm font-medium text-foreground">{app.company_name}</p>
        <p className="text-xs text-muted-foreground">Uploaded to Drive</p>
      </div>
    );
  }

  return (
    <>
      <div className={`bg-card rounded-xl ring-1 p-4 flex flex-col gap-3 ${error ? "ring-destructive/30" : "ring-foreground/10"}`}>
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-muted-foreground tabular-nums">#{app.seq}</span>
              <span className="font-semibold text-foreground text-sm truncate">{app.company_name}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate" title={app.role}>{app.role}</p>
            {app.profile_name && (
              <p className="text-[11px] text-muted-foreground/60 truncate">{app.profile_name}</p>
            )}
          </div>
          <div className="shrink-0 flex flex-col items-end gap-1">
            <Badge variant="secondary" className="capitalize text-[10px] gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              pending
            </Badge>
            <span className="text-[10px] text-muted-foreground">{formatDate(app.created_at)}</span>
          </div>
        </div>

        {/* Profile override (if app has no profile) */}
        {!app.profile_id && profiles.length > 0 && (
          <Select value={selectedProfileId || "_none"} onValueChange={v => setSelectedProfileId(v === "_none" ? "" : (v ?? ""))}>
            <SelectTrigger className="h-7 text-xs w-full">
              <SelectValue placeholder="Select profile for filename…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none" className="text-xs text-muted-foreground">No profile</SelectItem>
              {profiles.map(p => <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {/* Status line */}
        {phase === "generating" && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 size={12} className="animate-spin" />Generating with AI…
          </div>
        )}
        {phase === "building" && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 size={12} className="animate-spin" />Building from JSON…
          </div>
        )}
        {phase === "copying" && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 size={12} className="animate-spin" />Copying prompt…
          </div>
        )}
        {phase === "uploading" && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 size={12} className="animate-spin" />Uploading to Drive…
          </div>
        )}
        {phase === "ready" && state.file && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-500/10 text-xs text-green-600 dark:text-green-400">
            <Check size={11} />
            <span className="font-mono truncate">{state.file.filename}</span>
          </div>
        )}
        {error && (
          <p className="text-xs text-destructive flex items-start gap-1.5">
            <AlertTriangle size={12} className="shrink-0 mt-0.5" />{error}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-1.5 mt-auto pt-1 border-t border-border">
          {(phase === "idle" || phase === "error") && (
            <>
              <button
                onClick={onGenerate}
                disabled={!templateId || busy}
                title={!templateId ? "Select a template first" : "Generate resume with AI"}
                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/80 transition-all disabled:opacity-40 disabled:pointer-events-none"
              >
                <Zap size={11} />AI
              </button>
              <button
                onClick={() => setJsonModalOpen(true)}
                disabled={!templateId || busy}
                title={!templateId ? "Select a template first" : "Build from JSON"}
                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-input bg-transparent text-muted-foreground hover:text-foreground hover:bg-accent text-xs font-medium transition-all disabled:opacity-40 disabled:pointer-events-none"
              >
                <Code2 size={11} />JSON
              </button>
              <button
                onClick={handleCopyPrompt}
                disabled={!templateId || busy}
                title={!templateId ? "Select a template first" : "Copy full prompt"}
                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-input bg-transparent text-muted-foreground hover:text-foreground hover:bg-accent text-xs font-medium transition-all disabled:opacity-40 disabled:pointer-events-none"
              >
                {copied ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
                {copied ? "Copied!" : "Prompt"}
              </button>
            </>
          )}

          {phase === "ready" && (
            <>
              <button
                onClick={onDownload}
                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/80 transition-all"
              >
                <Download size={11} />Download
              </button>
              <button
                onClick={() => onComplete(effectiveProfileId)}
                disabled={!effectiveProfileId}
                title={!effectiveProfileId ? "Select a profile for filename" : "Upload to Google Drive and mark complete"}
                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-green-500/50 text-green-600 dark:text-green-400 bg-green-500/10 hover:bg-green-500/20 text-xs font-medium transition-all disabled:opacity-40 disabled:pointer-events-none"
              >
                <Upload size={11} />Complete
              </button>
              <button
                onClick={handleCopyPrompt}
                disabled={!templateId || busy}
                title="Copy full prompt"
                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-input bg-transparent text-muted-foreground hover:text-foreground hover:bg-accent text-xs font-medium transition-all disabled:opacity-40 disabled:pointer-events-none"
              >
                {copied ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
                Prompt
              </button>
              <button
                onClick={onGenerate}
                disabled={!templateId}
                title="Regenerate with AI"
                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-input bg-transparent text-muted-foreground hover:text-foreground hover:bg-accent text-xs font-medium transition-all disabled:opacity-40 disabled:pointer-events-none"
              >
                <RefreshCw size={11} />Regen
              </button>
            </>
          )}
        </div>
      </div>

      <JsonModal
        open={jsonModalOpen}
        onClose={() => setJsonModalOpen(false)}
        onBuild={json => { setJsonModalOpen(false); onBuildJson(json); }}
        building={phase === "building"}
      />
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function BatchBuilderPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [total, setTotal]               = useState(0);
  const [loading, setLoading]           = useState(true);
  const [page, setPage]                 = useState(1);
  const [refreshKey, setRefreshKey]     = useState(0);

  const [templates, setTemplates]   = useState<DocxTemplate[]>([]);
  const [profiles, setProfiles]     = useState<Profile[]>([]);
  const [templateId, setTemplateId] = useState("");

  const [cardStates, setCardStates] = useState<Record<string, CardState>>({});
  const fileBuffers = useRef<Record<string, { data: ArrayBuffer; filename: string }>>({});

  // Init/meta fetch
  useEffect(() => {
    Promise.all([
      fetch("/api/docx-templates").then(r => r.ok ? r.json() : []),
      fetch("/api/profiles").then(r => r.ok ? r.json() : []),
    ]).then(([tpls, profs]) => {
      setTemplates(Array.isArray(tpls) ? tpls : []);
      setProfiles(Array.isArray(profs) ? profs : []);
    });
  }, []);

  // Fetch pending apps
  useEffect(() => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), status: "pending" });
    fetch(`/api/applications?${p}`)
      .then(r => r.ok ? r.json() : null)
      .then(result => {
        if (!result) return;
        setApplications(result.data);
        setTotal(result.total);
      })
      .finally(() => setLoading(false));
  }, [page, refreshKey]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const setCardPhase = useCallback((id: string, phase: CardPhase, extra?: Partial<Omit<CardState, "phase">>) => {
    setCardStates(prev => ({ ...prev, [id]: { phase, file: prev[id]?.file ?? null, error: null, ...extra } }));
  }, []);

  const getCard = (id: string): CardState =>
    cardStates[id] ?? { phase: "idle", file: null, error: null };

  const handleGenerate = async (app: Application) => {
    if (!templateId) return;
    setCardPhase(app.id, "generating");
    try {
      const res = await fetch(`/api/batch-builder/${app.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setCardPhase(app.id, "error", { error: data.message ?? "Generation failed" });
        return;
      }
      const filename = res.headers.get("X-Filename") ?? "resume.docx";
      const buffer = await res.arrayBuffer();
      fileBuffers.current[app.id] = { data: buffer, filename };
      setCardPhase(app.id, "ready", { file: { data: buffer, filename } });
    } catch (e) {
      setCardPhase(app.id, "error", { error: e instanceof Error ? e.message : "Network error" });
    }
  };

  const handleBuildJson = async (app: Application, jsonStr: string) => {
    if (!templateId) return;
    setCardPhase(app.id, "building");
    try {
      const jsonData = JSON.parse(jsonStr);
      const res = await fetch(`/api/batch-builder/${app.id}/generate-from-json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, jsonData }),
      });
      if (!res.ok) {
        const data = await res.json();
        setCardPhase(app.id, "error", { error: data.message ?? "Build failed" });
        return;
      }
      const filename = res.headers.get("X-Filename") ?? "resume.docx";
      const buffer = await res.arrayBuffer();
      fileBuffers.current[app.id] = { data: buffer, filename };
      setCardPhase(app.id, "ready", { file: { data: buffer, filename } });
    } catch (e) {
      setCardPhase(app.id, "error", { error: e instanceof Error ? e.message : "Build error" });
    }
  };

  const handleCopyPrompt = async (app: Application) => {
    if (!templateId) return;
    setCardPhase(app.id, "copying");
    try {
      const res = await fetch(`/api/batch-builder/${app.id}/prompt?templateId=${templateId}`);
      if (!res.ok) {
        const data = await res.json();
        const hasFile = !!fileBuffers.current[app.id];
        setCardPhase(app.id, hasFile ? "ready" : "error", { error: data.message ?? "Failed to get prompt" });
        return;
      }
      const { fullPrompt } = await res.json();
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullPrompt);
      } else {
        const ta = document.createElement("textarea");
        ta.value = fullPrompt;
        ta.style.cssText = "position:fixed;opacity:0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      const hasFile = !!fileBuffers.current[app.id];
      setCardPhase(app.id, hasFile ? "ready" : "idle");
    } catch (e) {
      const hasFile = !!fileBuffers.current[app.id];
      setCardPhase(app.id, hasFile ? "ready" : "error", {
        error: e instanceof Error ? e.message : "Copy failed",
      });
    }
  };

  const handleDownload = (app: Application) => {
    const f = fileBuffers.current[app.id];
    if (!f) return;
    const blob = new Blob([f.data], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = f.filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const handleComplete = async (app: Application, profileId: string) => {
    const f = fileBuffers.current[app.id];
    if (!f || !profileId) return;
    setCardPhase(app.id, "uploading");
    try {
      const formData = new FormData();
      const blob = new Blob([f.data], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      formData.append("file", blob, f.filename);
      formData.append("profileId", profileId);
      const res = await fetch(`/api/applications/${app.id}/upload`, { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json();
        setCardPhase(app.id, "error", { error: data.message ?? "Upload failed" });
        return;
      }
      delete fileBuffers.current[app.id];
      setCardPhase(app.id, "done");
      // Remove from list after brief animation
      setTimeout(() => {
        setApplications(prev => prev.filter(a => a.id !== app.id));
        setTotal(t => t - 1);
      }, 1200);
    } catch (e) {
      setCardPhase(app.id, "error", { error: e instanceof Error ? e.message : "Upload failed" });
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-border flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <PackageCheck size={18} className="text-primary shrink-0" />
            <h1 className="text-base sm:text-lg font-semibold text-foreground">Batch Builder</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
            Process pending applications — generate resumes and upload to Google Drive
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex flex-col gap-0.5">
            <Select value={templateId || "_none"} onValueChange={v => setTemplateId(v === "_none" ? "" : (v ?? ""))}>
              <SelectTrigger className="h-8 text-sm w-auto min-w-44">
                <SelectValue placeholder="Select template…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none" className="text-xs text-muted-foreground">Select template…</SelectItem>
                {templates.map(t => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground/60 pl-1">Template (all cards)</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setRefreshKey(k => k + 1)}>
            <RefreshCw size={13} /><span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6">
        {!templateId && (
          <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20 text-sm text-amber-600 dark:text-amber-400">
            <AlertTriangle size={14} className="shrink-0" />
            Select a template above to enable AI generation, JSON build, and Copy Prompt.
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
            <Loader2 size={20} className="animate-spin mr-2" />Loading…
          </div>
        ) : total === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-3">
            <PackageCheck size={40} className="text-muted-foreground/30" />
            <p className="text-sm">No pending applications</p>
            <p className="text-xs text-muted-foreground/60 text-center px-4">
              Select applications on the Applications page and set their status to <strong>Pending</strong> to queue them here.
              Or submit a new application from the Chrome extension with batch mode enabled.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 4-column grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {applications.map(app => (
                <AppCard
                  key={app.id}
                  app={app}
                  templateId={templateId}
                  profiles={profiles}
                  state={getCard(app.id)}
                  onGenerate={() => handleGenerate(app)}
                  onBuildJson={json => handleBuildJson(app, json)}
                  onCopyPrompt={() => handleCopyPrompt(app)}
                  onDownload={() => handleDownload(app)}
                  onComplete={profileId => handleComplete(app, profileId)}
                />
              ))}
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{total} pending application{total !== 1 ? "s" : ""}</span>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="size-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-30 disabled:pointer-events-none">
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => setPage(p)}
                      className={`min-w-7 h-7 px-2 rounded text-xs font-medium transition-colors ${p === page ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}>
                      {p}
                    </button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="size-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-30 disabled:pointer-events-none">
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
