import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const PIPELINE_STATUSES = [
  "applied", "screening", "hr_interview", "tech_round_1",
  "tech_round_2", "final", "offer", "failed",
] as const;

export async function GET() {
  const { data: apps, error } = await supabase
    .from("applications")
    .select("id, pipeline_status, profile_id, created_at, profiles(name)")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);

  const appliedThisWeek = apps.filter((a) => new Date(a.created_at) >= weekAgo).length;
  const total = apps.length;
  const inProgress = apps.filter((a) => a.pipeline_status !== "offer" && a.pipeline_status !== "failed").length;
  const offers = apps.filter((a) => a.pipeline_status === "offer").length;

  // By account
  const accountMap = new Map<string, number>();
  for (const a of apps) {
    const profile = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
    const name = (profile as { name: string } | null)?.name ?? "Unknown";
    accountMap.set(name, (accountMap.get(name) ?? 0) + 1);
  }
  const byAccount = Array.from(accountMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // By status
  const statusMap = new Map<string, number>(PIPELINE_STATUSES.map((s) => [s, 0]));
  for (const a of apps) statusMap.set(a.pipeline_status, (statusMap.get(a.pipeline_status) ?? 0) + 1);
  const byStatus = PIPELINE_STATUSES.map((s) => ({ status: s, count: statusMap.get(s) ?? 0 }));

  // Daily counts — last 30 days
  const dailyMap = new Map<string, number>();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);
  for (let d = new Date(thirtyDaysAgo); d <= now; d.setDate(d.getDate() + 1)) {
    dailyMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const a of apps) {
    const day = a.created_at.slice(0, 10);
    if (dailyMap.has(day)) dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1);
  }
  const dailyCounts = Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count }));

  // Heatmap — last 52 weeks (364 days)
  const heatmapMap = new Map<string, number>();
  const heatmapStart = new Date(now);
  heatmapStart.setDate(now.getDate() - 363);
  for (let d = new Date(heatmapStart); d <= now; d.setDate(d.getDate() + 1)) {
    heatmapMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const a of apps) {
    const day = a.created_at.slice(0, 10);
    if (heatmapMap.has(day)) heatmapMap.set(day, (heatmapMap.get(day) ?? 0) + 1);
  }
  const heatmapCounts = Array.from(heatmapMap.entries()).map(([date, count]) => ({ date, count }));

  return NextResponse.json({ appliedThisWeek, total, inProgress, offers, byAccount, byStatus, dailyCounts, heatmapCounts });
}
