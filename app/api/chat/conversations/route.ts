import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireSession } from "@/lib/auth";
import { GENERAL, otherParticipant, unreadCounts } from "@/lib/chat";

/**
 * Chat sidebar: the General room plus every active team member (everyone can
 * message everyone), each with its last message and unread count.
 */
export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const me = session.userId;

  const [{ data: users, error }, { data: recent }, unread] = await Promise.all([
    supabase
      .from("team_users")
      .select("id, name, role")
      .eq("is_active", true)
      .neq("id", me)
      .order("name", { ascending: true }),
    supabase
      .from("chat_messages")
      .select("conversation_key, sender_id, body, created_at")
      .or(`sender_id.eq.${me},recipient_id.eq.${me},conversation_key.eq.${GENERAL}`)
      .order("created_at", { ascending: false })
      .limit(500),
    unreadCounts(me),
  ]);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  const last = new Map<string, { body: string; created_at: string; mine: boolean }>();
  for (const m of recent ?? []) {
    const key = m.conversation_key as string;
    if (!last.has(key)) last.set(key, { body: m.body as string, created_at: m.created_at as string, mine: m.sender_id === me });
  }
  const lastByUser = new Map<string, { body: string; created_at: string; mine: boolean }>();
  for (const [key, msg] of last) {
    const other = otherParticipant(key, me);
    if (other) lastByUser.set(other, msg);
  }

  const dmKeyFor = (id: string) => (me < id ? `dm:${me}:${id}` : `dm:${id}:${me}`);

  return NextResponse.json({
    general: { id: GENERAL, unread: unread[GENERAL] ?? 0, last: last.get(GENERAL) ?? null },
    users: (users ?? []).map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      unread: unread[dmKeyFor(u.id as string)] ?? 0,
      last: lastByUser.get(u.id as string) ?? null,
    })),
  });
}
