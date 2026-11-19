"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface ProfileStageCount {
  id: string;
  name: string;
  is_active: boolean;
  saved: number;
  applied: number;
}

interface DashboardData {
  diceCounts: { date: string; count: number }[];
  otherCounts: { date: string; count: number }[];
  profileStageCounts: ProfileStageCount[];
}

function ProfileStageTable({ rows }: { rows: ProfileStageCount[] }) {
  const totalSaved = rows.reduce((sum, r) => sum + r.saved, 0);
  const totalApplied = rows.reduce((sum, r) => sum + r.applied, 0);

  return (
    <div className="section-card space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Applications by Profile — Saved vs Applied</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Profile</th>
              <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Saved</th>
              <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Applied</th>
              <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-xs text-muted-foreground">No profiles yet.</td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className={r.is_active ? "" : "opacity-50"}>
                  <td className="px-3 py-2 text-foreground whitespace-nowrap">
                    {r.name}
                    {!r.is_active && <span className="ml-1.5 text-[10px] text-muted-foreground">(Deactivated)</span>}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-foreground">{r.saved}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-foreground">{r.applied}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium text-foreground">{r.saved + r.applied}</td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t border-border font-medium">
                <td className="px-3 py-2 text-foreground">Total</td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground">{totalSaved}</td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground">{totalApplied}</td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground">{totalSaved + totalApplied}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

function DailyBidChart({ title, data, color }: { title: string; data: { date: string; count: number }[]; color: string }) {
  return (
    <div className="section-card space-y-3">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: "oklch(0.71 0.025 272)" }}
            tickFormatter={(v: string) => new Date(v).toLocaleString("en-US", { weekday: "short", timeZone: "UTC" })}
          />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "oklch(0.71 0.025 272)" }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: "oklch(0.205 0.025 275)", border: "1px solid oklch(0.88 0.04 280 / 12%)", borderRadius: 10, boxShadow: "0 12px 32px -12px rgb(0 0 0 / 0.6)", fontSize: 12 }}
            labelStyle={{ color: "oklch(0.97 0.006 275)" }}
            itemStyle={{ color: "oklch(0.71 0.025 272)" }}
          />
          <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <div className="px-8 py-6 border-b border-border">
        <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
      </div>

      <div className="flex-1 px-8 py-6 space-y-6 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DailyBidChart title="Dice Bid Count — This Week" data={data.diceCounts} color="oklch(0.585 0.215 287)" />
          <DailyBidChart title="Other Bid Count — This Week" data={data.otherCounts} color="oklch(0.78 0.13 205)" />
        </div>

        <ProfileStageTable rows={data.profileStageCounts} />
      </div>
    </div>
  );
}
