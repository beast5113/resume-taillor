import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireBearerAuth } from "@/lib/auth";

/** Looked up by the extension's Apply Assistant (keyed by the human-readable
    seq shown in the UI, not the uuid id) to pull job/resume context for a tab. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ seq: string }> }
) {
  const session = await requireBearerAuth(request);
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
