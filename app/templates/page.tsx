"use client";

import { useState, useEffect, useCallback } from "react";
import TemplateEditorPanel from "@/components/TemplateEditorPanel";
import TemplatePreviewPane from "@/components/TemplatePreviewPane";
import { MOCK_RESUME } from "@/lib/templates/mockData";
import { BASE_CONFIGS } from "@/lib/templates/config";
import type { TemplateConfig } from "@/lib/templates/config";

interface SavedTemplate {
  id: string;
  name: string;
  config: TemplateConfig;
  created_at: string;
  updated_at: string;
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

const BASE_IDS = ["classic", "modern", "executive", "minimal"] as const;

export default function TemplatesPage() {
  const [saved, setSaved] = useState<SavedTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [config, setConfig] = useState<TemplateConfig | null>(null);
  const [editName, setEditName] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [showNewMenu, setShowNewMenu] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/templates");
      const data = await res.json();
      setSaved(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function selectSaved(t: SavedTemplate) {
    setSelectedId(t.id);
    setConfig({ ...t.config, id: t.id });
    setEditName(t.name);
    setIsDirty(false);
    setError("");
  }

  function createFromBase(baseId: keyof typeof BASE_CONFIGS) {
    const base = BASE_CONFIGS[baseId];
    setSelectedId(null);
    setConfig({ ...base, name: `${base.name} (custom)` });
    setEditName(`${base.name} (custom)`);
    setIsDirty(true);
    setShowNewMenu(false);
    setError("");
  }

  function handleConfigChange(c: TemplateConfig) {
    setConfig(c);
    setIsDirty(true);
  }

  async function save() {
    if (!config) return;
    setSaving(true);
    setError("");
    try {
      const body = { name: editName.trim() || config.name, config: { ...config, name: editName.trim() || config.name } };
      const isNew = !selectedId;
      const url = isNew ? "/api/templates" : `/api/templates/${selectedId}`;
      const method = isNew ? "POST" : "PUT";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Save failed" }));
        throw new Error(err.message || "Save failed");
      }
      const saved: SavedTemplate = await res.json();
      setSelectedId(saved.id);
      setConfig({ ...saved.config, id: saved.id });
      setEditName(saved.name);
      setIsDirty(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTemplate() {
    if (!selectedId || !confirm("Delete this template?")) return;
    setDeleting(true);
    try {
      await fetch(`/api/templates/${selectedId}`, { method: "DELETE" });
      setSelectedId(null);
      setConfig(null);
      setEditName("");
      setIsDirty(false);
      await load();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-8 py-6 border-b border-zinc-800 flex-shrink-0">
        <h1 className="text-lg font-semibold text-zinc-100">Templates</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Create and customize resume templates with live preview.</p>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: template list */}
        <div className="w-52 flex-shrink-0 border-r border-zinc-800 flex flex-col">
          <div className="px-3 pt-4 pb-2">
            <div className="relative">
              <button
                onClick={() => setShowNewMenu(!showNewMenu)}
                className="btn-primary w-full text-xs py-2 justify-center"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                New Template
              </button>
              {showNewMenu && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1">
                  {BASE_IDS.map((id) => (
                    <button
                      key={id}
                      onClick={() => createFromBase(id)}
                      className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-700 capitalize"
                    >
                      From {id}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-0.5">
            {loading ? (
              <div className="flex justify-center pt-8"><Spinner /></div>
            ) : saved.length === 0 ? (
              <p className="text-xs text-zinc-600 text-center pt-8">No saved templates.<br />Click "New Template" to create one.</p>
            ) : (
              saved.map((t) => (
                <button
                  key={t.id}
                  onClick={() => selectSaved(t)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    selectedId === t.id
                      ? "bg-blue-600/20 text-blue-300 border border-blue-700/40"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                  }`}
                >
                  <div className="truncate">{t.name}</div>
                  <div className="text-zinc-600 capitalize">{t.config.baseId}</div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Middle: editor */}
        {config ? (
          <>
            <div className="w-[400px] flex-shrink-0 border-r border-zinc-800 flex flex-col overflow-hidden">
              {/* Name + save */}
              <div className="px-4 pt-4 pb-3 border-b border-zinc-800 flex-shrink-0 space-y-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => { setEditName(e.target.value); setIsDirty(true); }}
                  placeholder="Template name…"
                  className="field-input text-sm w-full"
                />
                <div className="flex gap-2">
                  <button
                    onClick={save}
                    disabled={saving || !isDirty}
                    className="btn-primary flex-1 text-xs py-1.5 justify-center"
                  >
                    {saving ? <><Spinner /> Saving…</> : isDirty ? "Save changes" : "Saved"}
                  </button>
                  {selectedId && (
                    <button
                      onClick={deleteTemplate}
                      disabled={deleting}
                      className="btn-ghost px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    >
                      {deleting ? <Spinner /> : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
                {error && <p className="text-xs text-red-400">{error}</p>}
              </div>

              <div className="flex-1 overflow-hidden">
                <TemplateEditorPanel config={config} onChange={handleConfigChange} />
              </div>
            </div>

            {/* Right: preview */}
            <div className="flex-1 overflow-y-auto bg-zinc-900 p-6">
              <div className="text-xs text-zinc-500 mb-3 text-center">Live preview — mock data</div>
              <div className="shadow-2xl shadow-black/50">
                <TemplatePreviewPane config={config} data={MOCK_RESUME} />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-zinc-600">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">Select a template or create a new one</p>
            </div>
          </div>
        )}
      </div>

      {showNewMenu && (
        <div className="fixed inset-0 z-[5]" onClick={() => setShowNewMenu(false)} />
      )}
    </div>
  );
}
