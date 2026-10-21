import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

// Shifts a UTC instant so its UTC getters read as JST wall-clock time.
function toJstShifted(d: Date): Date {
  return new Date(d.getTime() + JST_OFFSET_MS);
}

// Reverses toJstShifted — turns a JST wall-clock Date back into the real UTC instant.
function fromJstShifted(d: Date): Date {
  return new Date(d.getTime() - JST_OFFSET_MS);
}

function isDice(job_url: string | null, job_board: string | null): boolean {
  return /dice\.com/i.test(job_url ?? "") || /dice\.com/i.test(job_board ?? "");
}

export async function GET() {
  const jstNow = toJstShifted(new Date());

  // Daily bid counts — current week (Sun-Sat) in JST, summed across all profiles
  const jstWeekStart = new Date(jstNow);
  jstWeekStart.setUTCHours(0, 0, 0, 0);
  jstWeekStart.setUTCDate(jstWeekStart.getUTCDate() - jstWeekStart.getUTCDay());
  const jstWeekEnd = new Date(jstWeekStart);
  jstWeekEnd.setUTCDate(jstWeekEnd.getUTCDate() + 7);

  const weekStartUtc = fromJstShifted(jstWeekStart);
  const weekEndUtc = fromJstShifted(jstWeekEnd);

  const { data: apps, error } = await supabase
    .from("applications")
    .select("id, created_at, job_url, job_board")
    .gte("created_at", weekStartUtc.toISOString())
    .lt("created_at", weekEndUtc.toISOString());

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  const diceMap = new Map<string, number>();
  const otherMap = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(jstWeekStart);
    d.setUTCDate(d.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    diceMap.set(key, 0);
    otherMap.set(key, 0);
  }

  for (const a of apps) {
    const day = toJstShifted(new Date(a.created_at)).toISOString().slice(0, 10);
    const map = isDice(a.job_url, a.job_board) ? diceMap : otherMap;
    if (map.has(day)) map.set(day, (map.get(day) ?? 0) + 1);
  }

  const diceCounts = Array.from(diceMap.entries()).map(([date, count]) => ({ date, count }));
  const otherCounts = Array.from(otherMap.entries()).map(([date, count]) => ({ date, count }));

  // Per-profile "saved" vs "applied" pipeline-stage counts, across ALL
  // applications (not just this week). "saved" is every application's default
  // pipeline_status, so that bucket alone can exceed PostgREST's 1000-row page
  // size - paginate through it explicitly rather than silently truncating.
  const STAGE_STATUSES = ["saved", "applied"] as const;
  const stageCounts = new Map<string, { saved: number; applied: number }>();
  {
    const PAGE_SIZE = 1000;
    let from = 0;
    for (;;) {
      const { data: rows, error: stageError } = await supabase
        .from("applications")
        .select("profile_id, pipeline_status")
        .in("pipeline_status", STAGE_STATUSES)
        .not("profile_id", "is", null)
        .range(from, from + PAGE_SIZE - 1);

      if (stageError) return NextResponse.json({ message: stageError.message }, { status: 500 });
      if (!rows || rows.length === 0) break;

      for (const row of rows) {
        const profileId = row.profile_id as string;
        const entry = stageCounts.get(profileId) ?? { saved: 0, applied: 0 };
        if (row.pipeline_status === "saved") entry.saved += 1;
        else if (row.pipeline_status === "applied") entry.applied += 1;
        stageCounts.set(profileId, entry);
      }

      if (rows.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, name, is_active");

  if (profilesError) return NextResponse.json({ message: profilesError.message }, { status: 500 });

  const profileStageCounts = (profiles ?? [])
    .map((p) => ({
      id: p.id as string,
      name: p.name as string,
      is_active: p.is_active as boolean,
      saved: stageCounts.get(p.id as string)?.saved ?? 0,
      applied: stageCounts.get(p.id as string)?.applied ?? 0,
    }))
    .sort((a, b) => (b.saved + b.applied) - (a.saved + a.applied) || a.name.localeCompare(b.name));

  return NextResponse.json({ diceCounts, otherCounts, profileStageCounts });
}
