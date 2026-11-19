import { supabase } from "@/lib/supabase";
import type { SessionPayload } from "@/lib/auth";

/**
 * Role model
 * ──────────
 *  super_admin  Sees and manages everything, and is the only role that can
 *               manage accounts (Team).
 *  admin        Owns their own prompts / templates / profiles (owner_id), and
 *               sees only applications tied to their own profiles (or that
 *               they created). Cannot see other admins' data or manage accounts.
 *  assistant    Unchanged: works only on profiles assigned to them and only
 *               sees applications they created.
 */
export type Role = "super_admin" | "admin" | "assistant";

export const isSuperAdmin = (s: SessionPayload | null | undefined) => s?.role === "super_admin";
/** admin OR super_admin — anyone allowed into the admin area. */
export const isAdminRole = (s: SessionPayload | null | undefined) =>
  s?.role === "admin" || s?.role === "super_admin";

type OwnedTable = "prompts" | "docx_templates" | "profiles";

/**
 * Profile ids the caller may see. `null` means unrestricted (super admin).
 *  admin     → profiles they own
 *  assistant → profiles assigned to them
 */
export async function visibleProfileIds(s: SessionPayload): Promise<string[] | null> {
  if (isSuperAdmin(s)) return null;
  if (s.role === "admin") {
    const { data } = await supabase.from("profiles").select("id").eq("owner_id", s.userId);
    return (data ?? []).map((r) => r.id as string);
  }
  const { data } = await supabase
    .from("profile_assignments")
    .select("profile_id")
    .eq("user_id", s.userId);
  return (data ?? []).map((r) => r.profile_id as string);
}

export async function canSeeProfile(s: SessionPayload, profileId: string): Promise<boolean> {
  const ids = await visibleProfileIds(s);
  return ids === null || ids.includes(profileId);
}

/** Owner check for prompts / templates / profiles. Only admins/super admins can manage. */
export async function canManageOwned(s: SessionPayload, table: OwnedTable, id: string): Promise<boolean> {
  if (isSuperAdmin(s)) return true;
  if (s.role !== "admin") return false;
  const { data } = await supabase.from(table).select("owner_id").eq("id", id).maybeSingle();
  return !!data && data.owner_id === s.userId;
}

// Minimal shape of a Supabase filter builder. Kept loose on purpose: the real
// builder types are deeply generic, and these helpers must stay synchronous
// (builders are thenables — returning one from an async fn would run it).
type Filterable = { eq: (col: string, v: string) => unknown; or: (expr: string) => unknown };

/** Restrict an owned-table query to what the caller owns (no-op for super admin). */
export function scopeOwned<Q>(s: SessionPayload, query: Q): Q {
  return isSuperAdmin(s) ? query : ((query as unknown as Filterable).eq("owner_id", s.userId) as Q);
}

/** Owner id of a profile (used so templates inherit their profile's owner). */
export async function profileOwnerId(profileId: string): Promise<string | null> {
  const { data } = await supabase.from("profiles").select("owner_id").eq("id", profileId).maybeSingle();
  return (data?.owner_id as string | null) ?? null;
}

/** Template ids the caller may use/see. `null` = unrestricted. */
export async function visibleTemplateIds(s: SessionPayload): Promise<string[] | null> {
  if (isSuperAdmin(s)) return null;
  if (s.role === "admin") {
    const { data } = await supabase.from("docx_templates").select("id").eq("owner_id", s.userId);
    return (data ?? []).map((r) => r.id as string);
  }
  const profileIds = await visibleProfileIds(s);
  if (!profileIds || profileIds.length === 0) return [];
  const { data } = await supabase.from("docx_templates").select("id").in("profile_id", profileIds);
  return (data ?? []).map((r) => r.id as string);
}

export async function canUseTemplate(s: SessionPayload, templateId: string): Promise<boolean> {
  const ids = await visibleTemplateIds(s);
  return ids === null || ids.includes(templateId);
}

// ── Applications ──────────────────────────────────────────────────────────

/**
 * PostgREST filter describing which applications the caller may see.
 *  super_admin → null (everything)
 *  admin       → created by them OR attached to one of their profiles
 *  assistant   → created by them
 */
export type AppFilter = { kind: "all" } | { kind: "eq"; userId: string } | { kind: "or"; expr: string };

export async function applicationFilter(s: SessionPayload): Promise<AppFilter> {
  if (isSuperAdmin(s)) return { kind: "all" };
  if (s.role !== "admin") return { kind: "eq", userId: s.userId };
  const ids = await visibleProfileIds(s);
  const parts = [`created_by.eq.${s.userId}`];
  if (ids && ids.length) parts.push(`profile_id.in.(${ids.join(",")})`);
  return { kind: "or", expr: parts.join(",") };
}

/**
 * Apply an application scope (from `applicationFilter`) to a query builder.
 * Synchronous on purpose — usage: `q = scopeApps(q, await applicationFilter(session))`.
 */
export function scopeApps<Q>(query: Q, f: AppFilter): Q {
  const q = query as unknown as Filterable;
  if (f.kind === "all") return query;
  if (f.kind === "eq") return q.eq("created_by", f.userId) as Q;
  return q.or(f.expr) as Q;
}

export async function canAccessApplication(s: SessionPayload, id: string): Promise<boolean> {
  if (isSuperAdmin(s)) return true;
  const { data } = await supabase
    .from("applications")
    .select("created_by, profile_id")
    .eq("id", id)
    .maybeSingle();
  if (!data) return false;
  if (data.created_by === s.userId) return true;
  if (s.role !== "admin" || !data.profile_id) return false;
  return canSeeProfile(s, data.profile_id as string);
}

/** Filters a list of application ids down to the ones the caller may touch. */
export async function accessibleApplicationIds(s: SessionPayload, ids: string[]): Promise<string[]> {
  if (isSuperAdmin(s) || ids.length === 0) return ids;
  const q = scopeApps(supabase.from("applications").select("id").in("id", ids), await applicationFilter(s));
  const { data } = await q;
  return (data ?? []).map((r) => r.id as string);
}

// ── Team ──────────────────────────────────────────────────────────────────

/** Team members visible to the caller (for pickers, bidder filters, etc.). */
export async function visibleTeamUserIds(s: SessionPayload): Promise<string[] | null> {
  if (isSuperAdmin(s)) return null;
  if (s.role !== "admin") return [s.userId];
  const { data } = await supabase.from("team_users").select("id").eq("role", "assistant");
  return [s.userId, ...(data ?? []).map((r) => r.id as string)];
}
