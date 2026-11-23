import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireSession } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/access";

/** Delete one message: its sender can delete it; the super admin can delete any. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { data: msg } = await supabase.from("chat_messages").select("sender_id").eq("id", id).maybeSingle();
  if (!msg) return NextResponse.json({ message: "Message not found" }, { status: 404 });

  if (msg.sender_id !== session.userId && !isSuperAdmin(session))
    return NextResponse.json({ message: "You can only delete your own messages" }, { status: 403 });

  const { error } = await supabase.from("chat_messages").delete().eq("id", id);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
