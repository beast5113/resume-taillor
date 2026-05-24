"use client";

import { useState, useEffect, useCallback } from "react";

interface Profile {
  id: string;
  name: string;
  created_at: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function PlusIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

export default function ProfilePage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | "new" | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/profiles");
    if (res.ok) setProfiles(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const select = (p: Profile) => {
    setSelectedId(p.id);
    setEditName(p.name);
    setError("");
  };

  const newProfile = () => {
    setSelectedId("new");
    setEditName("");
    setError("");
  };

  const save = async () => {
    if (!editName.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError("");

    const isNew = selectedId === "new";
    const url = isNew ? "/api/profiles" : `/api/profiles/${selectedId}`;
    const method = isNew ? "POST" : "PATCH";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName }),
    });

    if (!res.ok) {
      const { message } = await res.json().catch(() => ({ message: "Save failed" }));
      setError(message);
    } else {
      const saved: Profile = await res.json();
      await load();
      setSelectedId(saved.id);
    }
    setSaving(false);
  };

  const deleteProfile = async (id: string) => {
    if (!confirm("Delete this profile? This cannot be undone.")) return;
    await fetch(`/api/profiles/${id}`, { method: "DELETE" });
    if (selectedId === id) setSelectedId(null);
    await load();
  };

  const selectedProfile = profiles.find((p) => p.id === selectedId);

  return (
    <div className="flex h-full">
      {/* Left panel */}
      <div className="w-64 flex-shrink-0 border-r border-zinc-800 flex flex-col">
        <div className="px-4 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h1 className="text-sm font-semibold text-zinc-100">Profiles</h1>
          <button onClick={newProfile} className="btn-primary px-3 py-1.5 text-xs">
            <PlusIcon /> New
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading && <p className="text-xs text-zinc-500 px-2 py-4 text-center">Loading…</p>}
          {!loading && profiles.length === 0 && (
            <p className="text-xs text-zinc-500 px-2 py-4 text-center">No profiles yet.</p>
          )}
          {profiles.map((p) => (
            <div
              key={p.id}
              className={`group flex items-center justify-between rounded-lg px-3 py-2.5 cursor-pointer transition-colors ${
                selectedId === p.id ? "bg-blue-600/20 border border-blue-600/30" : "hover:bg-zinc-800"
              }`}
              onClick={() => select(p)}
            >
              <div className="min-w-0">
                <p className={`text-sm font-medium truncate ${selectedId === p.id ? "text-blue-300" : "text-zinc-200"}`}>
                  {p.name}
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5">{formatDate(p.created_at)}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteProfile(p.id); }}
                className="opacity-0 group-hover:opacity-100 btn-ghost text-red-400 hover:text-red-300 hover:bg-red-900/20 flex-shrink-0 ml-1"
                title="Delete"
              >
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedId === null ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
            <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center">
              <svg className="w-6 h-6 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-zinc-300 font-medium mb-1">Profiles</p>
              <p className="text-xs text-zinc-500 max-w-xs">
                Each profile represents a candidate. The profile name is used when generating and naming resumes from the extension.
              </p>
            </div>
            <button onClick={newProfile} className="btn-secondary">
              <PlusIcon /> New Profile
            </button>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center gap-3">
              <input
                className="field-input text-base font-semibold flex-1"
                placeholder="Full name (e.g. Benjamin Dong)"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && save()}
              />
              <button onClick={save} disabled={saving} className="btn-primary">
                {saving ? "Saving…" : selectedId === "new" ? "Create" : "Save"}
              </button>
              {selectedId !== "new" && (
                <button
                  onClick={() => deleteProfile(selectedId)}
                  className="btn-ghost text-red-400 hover:text-red-300 hover:bg-red-900/20 px-3 py-2"
                >
                  <TrashIcon />
                </button>
              )}
            </div>

            {error && (
              <div className="mx-6 mt-3 rounded-lg bg-red-900/30 border border-red-700/50 px-4 py-2 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6">
              {selectedId !== "new" && selectedProfile && (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Profile ID</p>
                    <p className="text-xs text-zinc-400 font-mono bg-zinc-800/50 rounded-lg px-3 py-2 break-all">
                      {selectedProfile.id}
                    </p>
                  </div>
                  <p className="text-xs text-zinc-600">
                    Use this ID in your browser extension to associate submissions with this profile.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
