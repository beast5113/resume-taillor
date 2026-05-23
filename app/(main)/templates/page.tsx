"use client";

import { useState, useEffect, useRef } from "react";
import { Trash2, Loader2, UploadCloud, FileText, Check, AlertCircle, Tag } from "lucide-react";
import { DocxTemplate } from "@/lib/types";
import { Button } from "@/components/ui/button";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<DocxTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const [uploadName, setUploadName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");
  const [uploadError, setUploadError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadTemplates = async () => {
    setLoading(true);
    const res = await fetch("/api/docx-templates").catch(() => null);
    if (res?.ok) setTemplates(await res.json());
    setLoading(false);
  };

  useEffect(() => { loadTemplates(); }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setUploadFile(file);
    if (file && !uploadName) {
      setUploadName(file.name.replace(/\.docx$/i, "").replace(/[_-]/g, " "));
    }
    setUploadStatus("idle");
  };

  const handleUpload = async () => {
    if (!uploadName.trim()) { setUploadError("Template name is required"); setUploadStatus("error"); return; }
    if (!uploadFile) { setUploadError("Please select a .docx file"); setUploadStatus("error"); return; }

    setUploading(true);
    setUploadStatus("idle");

    const formData = new FormData();
    formData.append("name", uploadName.trim());
    formData.append("file", uploadFile);

    try {
      const res = await fetch("/api/docx-templates", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(err.message || "Upload failed");
      }
      const newTpl: DocxTemplate = await res.json();
      setTemplates((prev) => [...prev, newTpl]);
      setUploadName("");
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setUploadStatus("success");
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
      setUploadStatus("error");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete template "${name}"? This cannot be undone.`)) return;
    await fetch(`/api/docx-templates/${id}`, { method: "DELETE" });
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-8 py-6 border-b border-border shrink-0">
        <h1 className="text-lg font-semibold text-foreground">DOCX Templates</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Upload Word (.docx) templates with{" "}
          <code className="text-[11px] bg-muted px-1 py-0.5 rounded">{"<<variable>>"}</code>{" "}
          placeholders. Variables are extracted automatically on upload. AI fills every placeholder at generation time.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-8 space-y-8">

          {/* How it works */}
          <div className="section-card space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText size={14} />
              How to Build a Template
            </h2>
            <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>Create your resume layout in Word however you like (fonts, tables, columns).</li>
              <li>
                Wherever you want AI-generated content, type a placeholder:{" "}
                <code className="text-[11px] bg-muted px-1 py-0.5 rounded">{"<<name>>"}</code>,{" "}
                <code className="text-[11px] bg-muted px-1 py-0.5 rounded">{"<<summary>>"}</code>,{" "}
                <code className="text-[11px] bg-muted px-1 py-0.5 rounded">{"<<experience-1-1>>"}</code>, etc.
              </li>
              <li>Name placeholders descriptively — AI infers content from the name.</li>
              <li>Upload the .docx here. Variables are parsed and stored automatically.</li>
            </ol>
            <div className="mt-2 rounded-lg bg-muted/30 px-4 py-3 text-xs font-mono text-muted-foreground space-y-1">
              <p className="text-foreground font-semibold font-sans mb-2">Common variable names</p>
              {[
                "<<name>>   <<title>>   <<email>>   <<phone>>   <<location>>   <<linkedin>>",
                "<<summary>>",
                "<<skillset-list>>",
                "<<experience-1-1>>   <<experience-1-2>>   …   <<experience-1-N>>",
                "<<experience-2-1>>   …   (one per bullet, one group per job)",
              ].map((line, i) => <p key={i}>{line}</p>)}
            </div>
          </div>

          {/* Upload */}
          <div className="section-card space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <UploadCloud size={14} />
              Upload New Template
            </h2>

            <div>
              <label className="field-label">Template Name *</label>
              <input
                className="field-input"
                placeholder="My Resume Template"
                value={uploadName}
                onChange={(e) => { setUploadName(e.target.value); setUploadStatus("idle"); }}
              />
            </div>

            <div>
              <label className="field-label">DOCX File *</label>
              <div
                className="relative border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" accept=".docx" className="hidden" onChange={handleFileChange} />
                {uploadFile ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-foreground">
                    <FileText size={16} className="text-primary" />
                    <span className="font-medium">{uploadFile.name}</span>
                    <span className="text-muted-foreground text-xs">({(uploadFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <UploadCloud size={20} className="mx-auto text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">Click to select a .docx file</p>
                    <p className="text-[11px] text-muted-foreground/50">Only .docx format is supported</p>
                  </div>
                )}
              </div>
            </div>

            {uploadStatus === "error" && (
              <div className="flex items-start gap-2 text-xs text-destructive">
                <AlertCircle size={13} className="mt-0.5 shrink-0" />
                {uploadError}
              </div>
            )}
            {uploadStatus === "success" && (
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <Check size={13} />
                Template uploaded and variables extracted successfully.
              </div>
            )}

            <Button onClick={handleUpload} disabled={uploading} className="gap-2">
              {uploading ? (
                <><Loader2 size={13} className="animate-spin" /> Uploading…</>
              ) : (
                <><UploadCloud size={13} /> Upload Template</>
              )}
            </Button>
          </div>

          {/* Template list */}
          <div className="section-card space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Saved Templates</h2>

            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 size={14} className="animate-spin" /> Loading templates…
              </div>
            )}
            {!loading && templates.length === 0 && (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No templates yet. Upload your first .docx template above.
              </p>
            )}

            <div className="divide-y divide-border">
              {templates.map((t) => (
                <div key={t.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <FileText size={15} className="text-primary shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{t.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Uploaded {formatDate(t.created_at)} · ID: {t.id.slice(0, 8)}…
                        </p>
                        {t.variables?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/60 mr-1">
                              <Tag size={9} /> {t.variables.length} vars:
                            </span>
                            {t.variables.map((v) => (
                              <code key={v} className="text-[10px] bg-muted/40 px-1 py-0.5 rounded font-mono text-muted-foreground">
                                {`<<${v}>>`}
                              </code>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(t.id, t.name)}
                      className="btn-ghost text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 p-2 shrink-0"
                      title="Delete template"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
