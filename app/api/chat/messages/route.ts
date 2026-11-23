import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireSession } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/access";
import {
  CHAT_IMAGE_BUCKET,
  MAX_IMAGE_BYTES,
  MAX_MESSAGE_LENGTH,
  detectImageType,
  markRead,
  removeChatImages,
  resolveConversation,
} from "@/lib/chat";

const PAGE = 100;
const FIELDS = "id, sender_id, body, image_path, created_at, sender:team_users!sender_id(name)";
// Before migrations/003 runs, `image_path` doesn't exist — fall back so text chat keeps working.
const FIELDS_NO_IMAGE = "id, sender_id, body, created_at, sender:team_users!sender_id(name)";
const missingImageColumn = (e: { message: string } | null) => !!e && /image_path/.test(e.message);

type Row = { id: string; sender_id: string; body: string; image_path: string | null; created_at: string; sender: unknown };
/** The storage path never leaves the server — clients get `has_image` and load it via /api/chat/images/<id>. */
const shape = (rows: Row[]) =>
  rows.map(({ sender, image_path, ...m }) => ({
    ...m,
    has_image: !!image_path,
    sender_name: (sender as { name: string } | null)?.name ?? "Unknown",
  }));

/**
 * GET ?with=<userId|general>[&after=<iso>]
 *  - without `after`: the latest 100 messages (oldest first)
 *  - with `after`:    only messages newer than that timestamp
 * Opening a conversation marks it read.
 */
export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const conv = await resolveConversation(session.userId, sp.get("with") ?? "");
  if (!conv) return NextResponse.json({ message: "Conversation not found" }, { status: 404 });

  const after = sp.get("after");
  const incremental = !!after && !Number.isNaN(Date.parse(after));

  const run = (fields: string) => {
    const q = supabase.from("chat_messages").select(fields).eq("conversation_key", conv.key);
    return incremental
      ? q.gt("created_at", after!).order("created_at", { ascending: true }).limit(500)
      : q.order("created_at", { ascending: false }).limit(PAGE);
  };
  let { data, error } = await run(FIELDS);
  if (missingImageColumn(error)) ({ data, error } = await run(FIELDS_NO_IMAGE));
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  const fetched = (data ?? []) as unknown as Row[];
  const rows = incremental ? fetched : [...fetched].reverse();

  await markRead(session.userId, conv.key);
  return NextResponse.json({ messages: shape(rows) });
}

/**
 * Send a message.
 *  - JSON:       { to, body }
 *  - multipart:  to, body (optional caption), image (png/jpeg/gif/webp, ≤ 10 MB)
 */
export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  let to = "";
  let body = "";
  let image: File | null = null;

  if ((request.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    const form = await request.formData().catch(() => null);
    if (!form) return NextResponse.json({ message: "Invalid form data" }, { status: 400 });
    to = String(form.get("to") ?? "");
    body = String(form.get("body") ?? "").trim();
    const f = form.get("image");
    image = f instanceof File && f.size > 0 ? f : null;
  } else {
    const payload = await request.json().catch(() => null);
    to = String(payload?.to ?? "");
    body = String(payload?.body ?? "").trim();
  }

  if (!body && !image) return NextResponse.json({ message: "Message is empty" }, { status: 400 });
  if (body.length > MAX_MESSAGE_LENGTH)
    return NextResponse.json({ message: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters)` }, { status: 400 });

  const conv = await resolveConversation(session.userId, to);
  if (!conv) return NextResponse.json({ message: "Conversation not found" }, { status: 404 });

  let imagePath: string | null = null;
  if (image) {
    if (image.size > MAX_IMAGE_BYTES)
      return NextResponse.json({ message: "Image is too large (max 10 MB)" }, { status: 400 });
    const buffer = Buffer.from(await image.arrayBuffer());
    const type = detectImageType(buffer); // trust the bytes, not the file name
    if (!type) return NextResponse.json({ message: "Only PNG, JPEG, GIF or WebP images are allowed" }, { status: 400 });

    imagePath = `${conv.key.replace(/:/g, "_")}/${crypto.randomUUID()}.${type.ext}`;
    const { error: upErr } = await supabase.storage
      .from(CHAT_IMAGE_BUCKET)
      .upload(imagePath, buffer, { contentType: type.mime, upsert: false });
    if (upErr) return NextResponse.json({ message: `Image upload failed: ${upErr.message}` }, { status: 500 });
  }

  const insert = (fields: string) =>
    supabase
      .from("chat_messages")
      .insert({
        conversation_key: conv.key,
        sender_id: session.userId,
        recipient_id: conv.recipientId,
        body,
        ...(imagePath ? { image_path: imagePath } : {}),
      })
      .select(fields)
      .single();
  let { data, error } = await insert(FIELDS);
  // Text-only message before migration 003: retry without the image column.
  if (!imagePath && missingImageColumn(error)) ({ data, error } = await insert(FIELDS_NO_IMAGE));
  if (error) {
    if (imagePath) await removeChatImages([imagePath]);
    const needsMigration = /image_path|body_check/.test(error.message);
    return NextResponse.json(
      { message: needsMigration ? "Images aren't enabled yet — run migrations/003_chat_images.sql in Supabase." : error.message },
      { status: 500 }
    );
  }

  await markRead(session.userId, conv.key);
  return NextResponse.json({ message: shape([data as unknown as Row])[0] }, { status: 201 });
}

/**
 * DELETE { ids: string[] } — bulk delete (Telegram-style multi-select).
 * Deletes the caller's own messages; the super admin may delete any.
 * Messages the caller isn't allowed to delete are skipped, not errors.
 * Attached images are removed from storage too.
 */
export async function DELETE(request: NextRequest) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const payload = await request.json().catch(() => null);
  const ids: string[] = Array.isArray(payload?.ids)
    ? [...new Set((payload.ids as unknown[]).filter((x): x is string => typeof x === "string"))]
    : [];
  if (ids.length === 0) return NextResponse.json({ message: "ids array is required" }, { status: 400 });
  if (ids.length > 500) return NextResponse.json({ message: "Too many messages at once (max 500)" }, { status: 400 });

  const pick = (fields: string) => {
    const q = supabase.from("chat_messages").select(fields).in("id", ids);
    return isSuperAdmin(session) ? q : q.eq("sender_id", session.userId);
  };
  let { data: picked, error: selError } = await pick("id, image_path");
  if (missingImageColumn(selError)) ({ data: picked, error: selError } = await pick("id"));
  const allowed = (picked ?? []) as unknown as { id: string; image_path?: string | null }[];
  if (selError) return NextResponse.json({ message: selError.message }, { status: 500 });

  const deletable = allowed.map((r) => r.id);
  if (deletable.length) {
    const { error } = await supabase.from("chat_messages").delete().in("id", deletable);
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    await removeChatImages(allowed.map((r) => r.image_path ?? null));
  }
  return NextResponse.json({ deleted: deletable, skipped: ids.length - deletable.length });
}
