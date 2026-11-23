import { supabase } from "@/lib/supabase";

export const GENERAL = "general";
export const MAX_MESSAGE_LENGTH = 4000;

/** Stable key for a direct conversation, independent of who started it. */
export function dmKey(a: string, b: string): string {
  return a < b ? `dm:${a}:${b}` : `dm:${b}:${a}`;
}

/** The other participant of a DM key, from `me`'s point of view. */
export function otherParticipant(key: string, me: string): string | null {
  if (!key.startsWith("dm:")) return null;
  const [, x, y] = key.split(":");
  return x === me ? y : y === me ? x : null;
}

/** Resolves the `with` param (a user id or "general") to a conversation the caller may use. */
export async function resolveConversation(
  me: string,
  withParam: string
): Promise<{ key: string; recipientId: string | null } | null> {
  if (withParam === GENERAL) return { key: GENERAL, recipientId: null };
  if (!withParam || withParam === me) return null;
  const { data: other } = await supabase
    .from("team_users")
    .select("id, is_active")
    .eq("id", withParam)
    .maybeSingle();
  if (!other || !other.is_active) return null;
  return { key: dmKey(me, other.id as string), recipientId: other.id as string };
}

/** Marks a conversation read up to now for `me`. */
export async function markRead(me: string, key: string): Promise<void> {
  await supabase
    .from("chat_reads")
    .upsert({ user_id: me, conversation_key: key, last_read_at: new Date().toISOString() });
}

/**
 * Unread counts per conversation for `me`. A conversation never opened counts
 * from when the user's account was created, so new users don't inherit the
 * whole General history as unread.
 */
export async function unreadCounts(me: string): Promise<Record<string, number>> {
  const [{ data: reads }, { data: meRow }] = await Promise.all([
    supabase.from("chat_reads").select("conversation_key, last_read_at").eq("user_id", me),
    supabase.from("team_users").select("created_at").eq("id", me).maybeSingle(),
  ]);
  const lastRead = new Map<string, string>(
    (reads ?? []).map((r) => [r.conversation_key as string, r.last_read_at as string])
  );
  const baseline = (meRow?.created_at as string) ?? new Date(0).toISOString();
  const t = (iso: string) => Date.parse(iso);
  const since = new Date(Math.min(t(baseline), ...[...lastRead.values()].map(t))).toISOString();

  const { data: incoming } = await supabase
    .from("chat_messages")
    .select("conversation_key, created_at")
    .or(`recipient_id.eq.${me},conversation_key.eq.${GENERAL}`)
    .neq("sender_id", me)
    .gt("created_at", since)
    .order("created_at", { ascending: false })
    .limit(2000);

  const counts: Record<string, number> = {};
  for (const m of incoming ?? []) {
    const key = m.conversation_key as string;
    const cutoff = lastRead.get(key) ?? baseline;
    if (t(m.created_at as string) > t(cutoff)) counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}
