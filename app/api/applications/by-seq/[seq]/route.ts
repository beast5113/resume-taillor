import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireBearerAuth, requireSession } from "@/lib/auth";

/** Job/resume context for one application, keyed by the human-readable seq
    shown in the UI (not the uuid id). Called by the Applications page (session
    cookie) to hand context to the extension when it opens a job tab, and by
    the extension's Apply Assistant itself (bearer token) as a fallback. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ seq: string }> }
) {
  const session = (await requireBearerAuth(request)) ?? (await requireSession());
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { seq } = await params;
  const seqNum = Number(seq);
  if (!Number.isInteger(seqNum)) {
    return NextResponse.json({ message: "Invalid seq" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("applications")
    .select("*, profiles(profile_note)")
    .eq("seq", seqNum)
    .single();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const { profiles, ...application } = data;
  return NextResponse.json({
    ...application,
    profile_note: (profiles as { profile_note: string | null } | null)?.profile_note ?? null,
  });
}
