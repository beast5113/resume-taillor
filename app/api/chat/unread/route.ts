import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { unreadCounts } from "@/lib/chat";

/** Total unread messages for the sidebar badge. */
export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const counts = await unreadCounts(session.userId);
  return NextResponse.json({ total: Object.values(counts).reduce((a, b) => a + b, 0) });
}
