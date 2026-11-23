import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireSession } from "@/lib/auth";
import { GENERAL, otherParticipant, unreadCounts } from "@/lib/chat";

type Recent = { conversation_key: string; sender_id: string; body: string; image_path?: string | null; created_at: string };

/** Latest messages involving `me` (falls back if migration 003 hasn't added image_path yet). */
async function recentMessages(me: string): Promise<{ data: Recent[] }> {
  const run = (fields: string) =>
    supabase
      .from("chat_messages")
      .select(fields)
      .or(`sender_id.eq.${me},recipient_id.eq.${me},conversation_key.eq.${GENERAL}`)
      .order("created_at", { ascending: false })
      .limit(500);
  let { data, error } = await run("conversation_key, sender_id, body, image_path, created_at");
  if (error && /image_path/.test(error.message)) ({ data } = await run("conversation_key, sender_id, body, created_at"));
  return { data: (data ?? []) as unknown as Recent[] };
}

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
    recentMessages(me),
    unreadCounts(me),
  ]);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  const last = new Map<string, { body: string; created_at: string; mine: boolean }>();
  for (const m of recent ?? []) {
    const key = m.conversation_key as string;
    const text = (m.body as string) || (m.image_path ? "📷 Photo" : "");
    const body = m.body && m.image_path ? `📷 ${m.body}` : text;
    if (!last.has(key)) last.set(key, { body, created_at: m.created_at as string, mine: m.sender_id === me });
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
