"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  RefreshCw, Download, ExternalLink, Trash2, Inbox,
  Search, ChevronLeft, ChevronRight, Copy, Check, AlertTriangle, FileText, X,
} from "lucide-react";
import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Application {
  id: string;
  seq: number;
  job_url: string | null;
  role: string;
  company_name: string;
  status: "generating" | "completed" | "failed" | "pending";
  pipeline_status: string;
  google_drive_link: string | null;
  google_drive_file_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_VARIANT: Record<Application["status"], "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  generating: "outline",
  completed: "default",
  failed: "destructive",
};

const PIPELINE_OPTIONS = [
  { value: "applied",      label: "Applied" },
  { value: "hr_interview", label: "HR Interview" },
  { value: "tech_1",       label: "Tech 1" },
  { value: "tech_2",       label: "Tech 2" },
  { value: "offer",        label: "Offer" },
  { value: "failed",       label: "Failed" },
];

const PIPELINE_COLORS: Record<string, string> = {
  applied:      "text-blue-500",
  hr_interview: "text-yellow-500",
  tech_1:       "text-purple-500",
  tech_2:       "text-orange-500",
  offer:        "text-green-500",
  failed:       "text-destructive",
};

const PAGE_SIZE = 10;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function PageButton({ page, current, onClick }: { page: number; current: number; onClick: (p: number) => void }) {
  return (
    <button
      onClick={() => onClick(page)}
      className={`min-w-7 h-7 px-2 rounded text-xs font-medium transition-colors ${
        page === current
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      }`}
    >
      {page}
    </button>
  );
}

function buildPageRange(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      title="Copy job URL"
      className="inline-flex items-center justify-center size-7 rounded-lg border border-input bg-transparent text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
    >
      {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
    </button>
  );
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [jdModal, setJdModal] = useState<{
    open: boolean;
    loading: boolean;
    content: string | null;
    title: string;
  }>({ open: false, loading: false, content: null, title: "" });

  const load = useCallback(async () => {
    const res = await fetch("/api/applications");
    if (res.ok) setApplications(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    let isActive = true;
    load();

    const interval = setInterval(async () => {
      const res = await fetch("/api/applications");
      if (!res.ok) return;
      const data: Application[] = await res.json();
      if (!isActive) return;
      setApplications((prev) => {
        const prevJson = JSON.stringify(prev);
        const nextJson = JSON.stringify(data);
        return prevJson === nextJson ? prev : data;
      });
      if (!data.some((a) => a.status === "generating" || a.status === "pending")) {
        clearInterval(interval);
      }
    }, 5000);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [load]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await fetch(`/api/applications/${id}`, { method: "DELETE" });
    setApplications((prev) => prev.filter((a) => a.id !== id));
    setDeletingId(null);
  };

  const openJd = async (app: Application) => {
    setJdModal({ open: true, loading: true, content: null, title: `${app.company_name} — ${app.role}` });
    const res = await fetch(`/api/applications/${app.id}`);
    if (res.ok) {
      const data = await res.json();
      setJdModal((prev) => ({ ...prev, loading: false, content: data.job_description ?? null }));
    } else {
      setJdModal((prev) => ({ ...prev, loading: false, content: null }));
    }
  };

  const handlePipelineChange = async (id: string, pipeline_status: string) => {
    setUpdatingId(id);
    const res = await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipeline_status }),
    });
    if (res.ok) {
      const updated: Application = await res.json();
      setApplications((prev) => prev.map((a) => (a.id === id ? updated : a)));
    }
    setUpdatingId(null);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return applications;
    return applications.filter(
      (a) =>
        a.company_name.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q)
    );
  }, [applications, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Page header */}
      <div className="px-8 py-6 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Applications</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Jobs submitted via Chrome extension — resumes generated and stored on Google Drive
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setLoading(true); load(); }}
        >
          <RefreshCw size={13} />
          Refresh
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="space-y-4">

          {/* Search bar */}
          {!loading && applications.length > 0 && (
            <div className="relative max-w-72">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search company or role…"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
              Loading…
            </div>
          ) : applications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-3">
              <Inbox size={40} className="text-muted-foreground/30" />
              <p className="text-sm">No applications yet</p>
              <p className="text-xs text-muted-foreground/60">
                Submit a job via your Chrome extension to get started
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-3">
              <Search size={40} className="text-muted-foreground/30" />
              <p className="text-sm">No results for &ldquo;{search}&rdquo;</p>
            </div>
          ) : (
            <>
              <div className="bg-card rounded-xl ring-1 ring-foreground/10 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-10">#</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Company</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Gen Status</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Stage</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Submitted</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginated.map((app) => (
                      <tr key={app.id} className="hover:bg-accent/30 transition-colors">
                        <td className="px-4 py-3.5 text-muted-foreground text-xs tabular-nums">
                          {app.seq}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-foreground whitespace-nowrap">{app.company_name}</span>
                            {app.job_url && (
                              <a
                                href={app.job_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                                title={app.job_url}
                              >
                                <ExternalLink size={11} />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{app.role}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <Badge variant={STATUS_VARIANT[app.status]} className="capitalize gap-1">
                              {(app.status === "generating" || app.status === "pending") && (
                                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                              )}
                              {app.status}
                            </Badge>
                            {app.status === "failed" && app.error_message && (
                              <span className="text-xs text-destructive max-w-40 truncate" title={app.error_message}>
                                {app.error_message}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <Select
                            value={app.pipeline_status}
                            onValueChange={(val) => val && handlePipelineChange(app.id, val)}
                            disabled={updatingId === app.id}
                          >
                            <SelectTrigger
                              size="sm"
                              className={`border-0 bg-transparent px-1.5 shadow-none focus-visible:ring-0 focus-visible:border-input h-7 text-xs font-medium ${PIPELINE_COLORS[app.pipeline_status] ?? "text-foreground"}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent align="start">
                              {PIPELINE_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground text-xs whitespace-nowrap">{formatDate(app.created_at)}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openJd(app)}
                              title="View job description"
                              className="inline-flex items-center justify-center size-7 rounded-lg border border-input bg-transparent text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                            >
                              <FileText size={12} />
                            </button>
                            {app.job_url && <CopyButton url={app.job_url!} />}
                            {app.status === "completed" && app.google_drive_file_id && (
                              <>
                                <a
                                  href={`/api/applications/${app.id}/download`}
                                  className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/80 transition-all"
                                >
                                  <Download size={12} />
                                  Download
                                </a>
                                {app.google_drive_link && (
                                  <a
                                    href={app.google_drive_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center size-7 rounded-lg border border-input bg-transparent text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                                  >
                                    <ExternalLink size={12} />
                                  </a>
                                )}
                              </>
                            )}
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => setConfirmDeleteId(app.id)}
                              disabled={deletingId === app.id}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 size={13} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination footer */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {filtered.length} application{filtered.length !== 1 ? "s" : ""}
                  {search && ` matching "${search}"`}
                </span>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="size-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    {buildPageRange(currentPage, totalPages).map((p, i) =>
                      p === "…" ? (
                        <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground/50">…</span>
                      ) : (
                        <PageButton key={p} page={p} current={currentPage} onClick={setPage} />
                      )
                    )}
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="size-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Job description modal */}
      <Dialog.Root
        open={jdModal.open}
        onOpenChange={(open) => { if (!open) setJdModal((prev) => ({ ...prev, open: false })); }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 duration-150" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[80vh] bg-card rounded-xl ring-1 ring-foreground/10 shadow-xl flex flex-col data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div>
                <Dialog.Title className="text-sm font-semibold text-foreground">Job Description</Dialog.Title>
                <Dialog.Description className="text-xs text-muted-foreground mt-0.5">{jdModal.title}</Dialog.Description>
              </div>
              <Dialog.Close
                render={
                  <button className="size-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                    <X size={14} />
                  </button>
                }
              />
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {jdModal.loading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : jdModal.content ? (
                <pre className="text-xs text-foreground whitespace-pre-wrap font-mono leading-relaxed">{jdModal.content}</pre>
              ) : (
                <p className="text-sm text-muted-foreground">No job description available.</p>
              )}
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete confirmation dialog */}
      <Dialog.Root
        open={confirmDeleteId !== null}
        onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 duration-150" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-card rounded-xl ring-1 ring-foreground/10 shadow-xl p-6 space-y-4 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="shrink-0 flex items-center justify-center size-9 rounded-full bg-destructive/10">
                <AlertTriangle size={16} className="text-destructive" />
              </div>
              <div>
                <Dialog.Title className="text-sm font-semibold text-foreground">Delete application?</Dialog.Title>
                <Dialog.Description className="text-xs text-muted-foreground mt-1">
                  This will permanently remove the application record. This action cannot be undone.
                </Dialog.Description>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Dialog.Close
                render={
                  <Button variant="outline" size="sm" disabled={deletingId === confirmDeleteId}>
                    Cancel
                  </Button>
                }
              />
              <Button
                variant="destructive"
                size="sm"
                disabled={deletingId === confirmDeleteId}
                onClick={async () => {
                  if (!confirmDeleteId) return;
                  await handleDelete(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
              >
                {deletingId === confirmDeleteId ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
