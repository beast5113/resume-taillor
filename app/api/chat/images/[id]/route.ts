import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireSession } from "@/lib/auth";
import { CHAT_IMAGE_BUCKET, detectImageType, isParticipant } from "@/lib/chat";

/** Serves a chat image — only to people in that conversation (General = everyone). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { data: msg } = await supabase
    .from("chat_messages")
    .select("conversation_key, image_path")
    .eq("id", id)
    .maybeSingle();
  if (!msg?.image_path || !isParticipant(session.userId, msg.conversation_key as string))
    return NextResponse.json({ message: "Not found" }, { status: 404 });

  const { data: blob, error } = await supabase.storage.from(CHAT_IMAGE_BUCKET).download(msg.image_path as string);
  if (error || !blob) return NextResponse.json({ message: "Image not available" }, { status: 404 });

  const buffer = Buffer.from(await blob.arrayBuffer());
  const type = detectImageType(buffer);
  if (!type) return NextResponse.json({ message: "Not an image" }, { status: 415 });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": type.mime,
      "Content-Length": String(buffer.length),
      // Private (per-user auth), but immutable for a given message id.
      "Cache-Control": "private, max-age=86400, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `inline; filename="image-${id}.${type.ext}"`,
    },
  });
}
