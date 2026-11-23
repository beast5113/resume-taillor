import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireSession } from "@/lib/auth";
import { MAX_MESSAGE_LENGTH, markRead, resolveConversation } from "@/lib/chat";

const PAGE = 100;
const FIELDS = "id, sender_id, body, created_at, sender:team_users!sender_id(name)";

type Row = { id: string; sender_id: string; body: string; created_at: string; sender: unknown };
const shape = (rows: Row[]) =>
  rows.map(({ sender, ...m }) => ({ ...m, sender_name: (sender as { name: string } | null)?.name ?? "Unknown" }));

/**
 * GET ?with=<userId|general>[&after=<iso>]
 *  - without `after`: the latest 100 messages (oldest first)
 *  - with `after`:    only messages newer than that timestamp (polling)
 * Opening a conversation marks it read.
 */
export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const conv = await resolveConversation(session.userId, sp.get("with") ?? "");
  if (!conv) return NextResponse.json({ message: "Conversation not found" }, { status: 404 });

  const after = sp.get("after");
  let query = supabase.from("chat_messages").select(FIELDS).eq("conversation_key", conv.key);

  let rows: Row[];
  if (after && !Number.isNaN(Date.parse(after))) {
    const { data, error } = await query.gt("created_at", after).order("created_at", { ascending: true }).limit(500);
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    rows = (data ?? []) as Row[];
  } else {
    query = query.order("created_at", { ascending: false }).limit(PAGE);
    const { data, error } = await query;
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    rows = ((data ?? []) as Row[]).reverse();
  }

  await markRead(session.userId, conv.key);
  return NextResponse.json({ messages: shape(rows) });
}

/** POST { to: <userId|general>, body } */
export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const payload = await request.json().catch(() => null);
  const body = String(payload?.body ?? "").trim();
  if (!body) return NextResponse.json({ message: "Message is empty" }, { status: 400 });
  if (body.length > MAX_MESSAGE_LENGTH)
    return NextResponse.json({ message: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters)` }, { status: 400 });

  const conv = await resolveConversation(session.userId, String(payload?.to ?? ""));
  if (!conv) return NextResponse.json({ message: "Conversation not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({ conversation_key: conv.key, sender_id: session.userId, recipient_id: conv.recipientId, body })
    .select(FIELDS)
    .single();
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  await markRead(session.userId, conv.key);
  return NextResponse.json({ message: shape([data as Row])[0] }, { status: 201 });
}
