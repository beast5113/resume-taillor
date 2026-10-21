"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, FileText, Power, Contact } from "lucide-react";
import { Profile, ProfileBasicInfo, DocxTemplate } from "@/lib/types";

interface TeamUser { id: string; name: string; email: string; }
interface Assignment { id: string; profile_id: string; user_id: string; }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Best-effort split for legacy profiles saved before first/last name existed. */
function splitLegacyName(name: string): { first: string; last: string } {
  const parts = name.trim().split(/\s+/);
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
}

const EMPTY_EDUCATION: ProfileBasicInfo["education"] = {
  university: "", unverstisity_locatoin_city: "", unverstisity_locatoin_state: "",
  unverstisity_locatoin_state_abb: "", education_start: "", education_end: "",
};

const EMPTY_BASIC_INFO: ProfileBasicInfo = {
  first_name: "", last_name: "", dob: "", address: "", city: "", state: "", state_abb: "", zip: "",
  email: "", phone: "", linkedin: "",
  education: EMPTY_EDUCATION,
  note: "",
};

/** Tolerates a null/missing/malformed `profiles.profile_basic` and merges in
 * any fields a stored object might be missing (e.g. saved before a key was
 * added), so the form never crashes on an unexpected shape. `education` is
 * merged one level deep so a partially-filled nested object doesn't wipe out
 * the other education fields' defaults. */
function parseBasicInfo(raw: string | null): ProfileBasicInfo {
  if (!raw) return EMPTY_BASIC_INFO;
  try {
    const parsed = JSON.parse(raw);
    return {
      ...EMPTY_BASIC_INFO,
      ...parsed,
      education: { ...EMPTY_EDUCATION, ...(parsed?.education ?? {}) },
    };
  } catch {
    return EMPTY_BASIC_INFO;
  }
}

const BASIC_INFO_FIELDS: { key: keyof Omit<ProfileBasicInfo, "education" | "note">; label: string; placeholder?: string }[] = [
  { key: "first_name", label: "First Name" },
  { key: "last_name", label: "Last Name" },
  { key: "dob", label: "Date of Birth", placeholder: "YYYY-MM" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone", placeholder: "(XXX) XXX-XXXX" },
  { key: "linkedin", label: "LinkedIn (Optional)" },
  { key: "address", label: "Address" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "state_abb", label: "State Abbreviation", placeholder: "e.g. TX" },
  { key: "zip", label: "Zip Code" },
];

const EDUCATION_FIELDS: { key: keyof ProfileBasicInfo["education"]; label: string; placeholder?: string }[] = [
  { key: "university", label: "University" },
  { key: "unverstisity_locatoin_city", label: "University City" },
  { key: "unverstisity_locatoin_state", label: "University State" },
  { key: "unverstisity_locatoin_state_abb", label: "University State Abbreviation", placeholder: "e.g. TX" },
  { key: "education_start", label: "Education Start", placeholder: "YYYY-MM" },
  { key: "education_end", label: "Education End", placeholder: "YYYY-MM" },
];

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
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editBasic, setEditBasic] = useState<ProfileBasicInfo>(EMPTY_BASIC_INFO);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Assigned assistants for the selected profile
  const [allUsers, setAllUsers] = useState<TeamUser[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  // Templates available to assign as this profile's default
  const [templates, setTemplates] = useState<DocxTemplate[]>([]);
  const [savingDefaultTemplate, setSavingDefaultTemplate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [profileRes, userRes, templateRes] = await Promise.all([
      fetch("/api/profiles?includeInactive=1"),
      fetch("/api/team"),
      fetch("/api/docx-templates"),
    ]);
    if (profileRes.ok) setProfiles(await profileRes.json());
    if (userRes.ok) {
      const users: (TeamUser & { role: string })[] = await userRes.json();
      setAllUsers(users.filter((u) => u.role === "assistant"));
    }
    if (templateRes.ok) setTemplates(await templateRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadAssignments = useCallback(async (profileId: string) => {
    setLoadingAssignments(true);
    const res = await fetch(`/api/profile-assignments?profile_id=${profileId}`).catch(() => null);
    if (res?.ok) setAssignments(await res.json());
    else setAssignments([]);
    setLoadingAssignments(false);
  }, []);

  const select = (p: Profile) => {
    setSelectedId(p.id);
    setEditName(p.name);
    if (p.first_name && p.last_name) {
      setEditFirstName(p.first_name);
      setEditLastName(p.last_name);
    } else {
      const { first, last } = splitLegacyName(p.name);
      setEditFirstName(first);
      setEditLastName(last);
    }
    setEditBasic(parseBasicInfo(p.profile_basic));
    setError("");
    loadAssignments(p.id);
  };

  const newProfile = () => {
    setSelectedId("new");
    setEditName("");
    setEditFirstName("");
    setEditLastName("");
    setEditBasic(EMPTY_BASIC_INFO);
    setError("");
    setAssignments([]);
  };

  const updateBasic = (key: keyof Omit<ProfileBasicInfo, "education">, value: string) =>
    setEditBasic((prev) => ({ ...prev, [key]: value }));

  const updateEducation = (key: keyof ProfileBasicInfo["education"], value: string) =>
    setEditBasic((prev) => ({ ...prev, education: { ...prev.education, [key]: value } }));

  const save = async () => {
    if (!editName.trim() || !editFirstName.trim() || !editLastName.trim()) {
      setError("Name, first name, and last name are required");
      return;
    }
    setSaving(true);
    setError("");
    const isNew = selectedId === "new";
    const url = isNew ? "/api/profiles" : `/api/profiles/${selectedId}`;
    const method = isNew ? "POST" : "PATCH";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName, first_name: editFirstName, last_name: editLastName,
        profile_basic: JSON.stringify(editBasic),
      }),
    });
    if (!res.ok) {
      const { message } = await res.json().catch(() => ({ message: "Save failed" }));
      setError(message);
    } else {
      const saved: Profile = await res.json();
      await load();
      setSelectedId(saved.id);
      if (isNew) loadAssignments(saved.id);
    }
    setSaving(false);
  };

  const deleteProfile = async (id: string) => {
    if (!confirm("Delete this profile? This cannot be undone.")) return;
    await fetch(`/api/profiles/${id}`, { method: "DELETE" });
    if (selectedId === id) setSelectedId(null);
    await load();
  };

  const toggleActive = async (p: Profile) => {
    setTogglingId(p.id);
    const res = await fetch(`/api/profiles/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !p.is_active }),
    });
    if (res.ok) {
      const updated: Profile = await res.json();
      setProfiles((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
    }
    setTogglingId(null);
  };

  const setDefaultTemplate = async (profileId: string, templateId: string) => {
    setSavingDefaultTemplate(true);
    const res = await fetch(`/api/profiles/${profileId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ default_template_id: templateId || null }),
    });
    if (res.ok) {
      const updated: Profile = await res.json();
      setProfiles((prev) => prev.map((p) => (p.id === profileId ? updated : p)));
    }
    setSavingDefaultTemplate(false);
  };

  const selectedProfile = profiles.find((p) => p.id === selectedId);
  const activeProfiles = profiles.filter((p) => p.is_active);
  const inactiveProfiles = profiles.filter((p) => !p.is_active);
  const assignedUserIds = new Set(assignments.map((a) => a.user_id));
  const assignedUsers = allUsers.filter((u) => assignedUserIds.has(u.id));
  const profileTemplates = selectedProfile
    ? templates.filter((t) => t.profile_id === selectedProfile.id)
    : [];

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
          {activeProfiles.map((p) => (
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
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 flex-shrink-0 ml-1">
                <button
                  onClick={(e) => { e.stopPropagation(); toggleActive(p); }}
                  disabled={togglingId === p.id}
                  className="btn-ghost text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                  title="Deactivate"
                >
                  <Power size={14} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteProfile(p.id); }}
                  className="btn-ghost text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  title="Delete"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}

          {inactiveProfiles.length > 0 && (
            <>
              <p className="px-2 pt-3 pb-1 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">
                Deactivated
              </p>
              {inactiveProfiles.map((p) => (
                <div
                  key={p.id}
                  className={`group flex items-center justify-between rounded-lg px-3 py-2.5 cursor-pointer transition-colors opacity-60 ${
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
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 flex-shrink-0 ml-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleActive(p); }}
                      disabled={togglingId === p.id}
                      className="btn-ghost text-emerald-500 hover:text-emerald-400 hover:bg-zinc-800"
                      title="Activate"
                    >
                      <Power size={14} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteProfile(p.id); }}
                      className="btn-ghost text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      title="Delete"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
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
                Each profile represents a candidate. The profile name is used when generating and naming resumes.
              </p>
            </div>
            <button onClick={newProfile} className="btn-secondary">
              <PlusIcon /> New Profile
            </button>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="px-6 py-4 border-b border-zinc-800 space-y-2.5">
              <div className="flex items-center gap-3">
                <input
                  className="field-input text-base font-semibold flex-1"
                  placeholder="Name (e.g. Benjamin Dong)"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && save()}
                />
                <button onClick={save} disabled={saving} className="btn-primary">
                  {saving ? "Saving…" : selectedId === "new" ? "Create" : "Save"}
                </button>
                {selectedId !== "new" && selectedProfile && (
                  <button
                    onClick={() => toggleActive(selectedProfile)}
                    disabled={togglingId === selectedProfile.id}
                    className={`btn-ghost px-3 py-2 ${
                      selectedProfile.is_active
                        ? "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                        : "text-emerald-500 hover:text-emerald-400 hover:bg-zinc-800"
                    }`}
                    title={selectedProfile.is_active ? "Deactivate profile" : "Activate profile"}
                  >
                    <Power size={16} />
                  </button>
                )}
                {selectedId !== "new" && (
                  <button onClick={() => deleteProfile(selectedId)} className="btn-ghost text-red-400 hover:text-red-300 hover:bg-red-900/20 px-3 py-2">
                    <TrashIcon />
                  </button>
                )}
              </div>
              {selectedId !== "new" && selectedProfile && !selectedProfile.is_active && (
                <p className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 bg-zinc-800/60 rounded-full px-2.5 py-1 w-fit">
                  <Power size={10} /> Deactivated — hidden from extensions and selection lists
                </p>
              )}
              <div className="flex items-center gap-3">
                <input
                  className="field-input text-sm flex-1"
                  placeholder="First name (e.g. Benjamin)"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && save()}
                />
                <input
                  className="field-input text-sm flex-1"
                  placeholder="Last name (e.g. Dong)"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && save()}
                />
              </div>
              <p className="text-[11px] text-zinc-600">
                Name is this profile&apos;s identifier (shown in lists — can be anything, e.g. to tell two
                profiles for the same person apart). First/last name are used only to safely build resume filenames.
              </p>
            </div>

            {error && (
              <div className="mx-6 mt-3 rounded-lg bg-red-900/30 border border-red-700/50 px-4 py-2 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
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

              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Contact size={11} /> Profile Basic Info
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {BASIC_INFO_FIELDS.map((f) => (
                    <div key={f.key}>
                      <label className="text-[11px] text-zinc-500 block mb-1">{f.label}</label>
                      <input
                        className="field-input text-sm w-full"
                        placeholder={f.placeholder}
                        value={editBasic[f.key]}
                        onChange={(e) => updateBasic(f.key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>

                <p className="text-[11px] text-zinc-500 uppercase tracking-wider mt-4 mb-2">Education</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {EDUCATION_FIELDS.map((f) => (
                    <div key={f.key}>
                      <label className="text-[11px] text-zinc-500 block mb-1">{f.label}</label>
                      <input
                        className="field-input text-sm w-full"
                        placeholder={f.placeholder}
                        value={editBasic.education[f.key]}
                        onChange={(e) => updateEducation(f.key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>

                <label className="text-[11px] text-zinc-500 block mt-4 mb-1">Note</label>
                <textarea
                  className="field-input text-sm w-full resize-y min-h-28"
                  placeholder="Work authorization, visa status, EEO/demographic questions, availability, anything else worth keeping on hand…"
                  value={editBasic.note}
                  onChange={(e) => updateBasic("note", e.target.value)}
                />

                <p className="text-[11px] text-zinc-600 mt-2">
                  Saved together with the rest of this profile — click {selectedId === "new" ? "Create" : "Save"} above.
                </p>
              </div>

              {selectedId !== "new" && selectedProfile && (
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FileText size={11} /> Default Template
                  </p>
                  {profileTemplates.length === 0 ? (
                    <p className="text-xs text-zinc-600 italic">
                      No templates created for this profile yet. Upload one from the{" "}
                      <a href="/templates" className="text-zinc-400 underline hover:text-zinc-200">Templates page</a>{" "}
                      and assign it to this profile, then it will show up here.
                    </p>
                  ) : (
                    <>
                      <select
                        className="field-input text-xs w-full max-w-sm"
                        value={selectedProfile.default_template_id ?? ""}
                        disabled={savingDefaultTemplate}
                        onChange={(e) => setDefaultTemplate(selectedProfile.id, e.target.value)}
                      >
                        <option value="">No default (webhook falls back to the instance default)</option>
                        {profileTemplates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.template_type === "cover_letter" ? "Cover letter" : "Resume"})
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-zinc-600 mt-1.5">
                        Used when a new application comes in (e.g. from the browser extension) without an
                        explicit template — this profile's default is applied automatically.
                      </p>
                    </>
                  )}
                </div>
              )}

              {selectedId !== "new" && (
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Users size={11} /> Assigned Assistants
                  </p>
                  {loadingAssignments ? (
                    <p className="text-xs text-zinc-500">Loading…</p>
                  ) : assignedUsers.length === 0 ? (
                    <p className="text-xs text-zinc-600 italic">
                      No assistants assigned. Manage assignments from the{" "}
                      <a href="/team" className="text-zinc-400 underline hover:text-zinc-200">Team page</a>.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {assignedUsers.map((u) => (
                        <div key={u.id} className="flex items-center gap-1.5 bg-zinc-800/60 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300">
                          <Users size={11} className="text-zinc-500" />
                          <span>{u.name}</span>
                          <span className="text-zinc-600">{u.email}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
