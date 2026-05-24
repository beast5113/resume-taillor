"use client";

import { useState, useEffect } from "react";

export default function ProfilePage() {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data?.id) {
          setProfileId(data.id);
          setName(data.name ?? "");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError("");
    setSaved(false);

    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      const { message } = await res.json().catch(() => ({ message: "Save failed" }));
      setError(message);
    } else {
      const data = await res.json();
      setProfileId(data.id);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
    setSaving(false);
  };

  return (
    <div className="max-w-lg mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-lg font-semibold text-zinc-100">Profile</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Your profile is sent with each resume submission from the browser extension.
        </p>
        {profileId && (
          <p className="text-xs text-zinc-600 mt-1 font-mono">ID: {profileId}</p>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        <div className="space-y-5">
          <div>
            <label className="field-label">Full name</label>
            <input
              className="field-input mt-1"
              placeholder="e.g. Alex Johnson"
              value={name}
              onChange={(e) => { setName(e.target.value); setSaved(false); }}
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-900/30 border border-red-700/50 px-4 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? "Saving…" : "Save"}
            </button>
            {saved && <span className="text-sm text-emerald-400">Saved</span>}
          </div>
        </div>
      )}
    </div>
  );
}
