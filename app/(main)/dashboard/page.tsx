"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const STATUS_LABELS: Record<string, string> = {
  applied: "Applied",
  screening: "Screening",
  hr_interview: "HR Interview",
  tech_round_1: "Tech Round 1",
  tech_round_2: "Tech Round 2",
  final: "Final",
  offer: "Offer",
  failed: "Failed",
};

interface DashboardData {
  appliedThisWeek: number;
  total: number;
  inProgress: number;
  offers: number;
  byStatus: { status: string; count: number }[];
  dailyCounts: { date: string; count: number }[];
  heatmapCounts: { date: string; count: number }[];
}

function StatCard({ label, value, sub, color }: { label: string; value: number; sub: string; color: string }) {
  return (
    <div className="section-card flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${color}`} />
        <span className="text-xs text-primary font-medium">{label}</span>
      </div>
      <p className="text-3xl font-semibold text-foreground mt-1">{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function Heatmap({ data }: { data: { date: string; count: number }[] }) {
  if (data.length === 0) return null;

  const weeks: { date: string; count: number }[][] = [];
  let week: { date: string; count: number }[] = [];

  // Pad start so first day aligns to correct weekday (0=Sun)
  const firstDay = new Date(data[0].date).getDay();
  for (let i = 0; i < firstDay; i++) week.push({ date: "", count: -1 });

  for (const d of data) {
    week.push(d);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length > 0) weeks.push(week);

  const max = Math.max(1, ...data.map((d) => d.count));

  function cellColor(count: number) {
    if (count < 0) return "bg-transparent";
    if (count === 0) return "bg-muted/40";
    const intensity = Math.ceil((count / max) * 4);
    return [, "bg-primary/20", "bg-primary/40", "bg-primary/65", "bg-primary"][intensity] ?? "bg-primary";
  }

  const months: string[] = [];
  let lastMonth = "";
  for (const w of weeks) {
    const d = w.find((x) => x.date);
    const m = d ? new Date(d.date).toLocaleString("en-US", { month: "short" }) : "";
    months.push(m !== lastMonth ? (lastMonth = m) : "");
  }

  return (
    <div className="section-card space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Activity Heatmap — Last 52 Weeks</h2>
      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-1 min-w-max">
          <div className="flex gap-1">
            {months.map((m, i) => (
              <div key={i} className="w-3 text-[9px] text-muted-foreground/60">{m}</div>
            ))}
          </div>
          <div className="flex gap-1">
            {weeks.map((w, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {w.map((d, di) => (
                  <div
                    key={di}
                    className={`w-3 h-3 rounded-sm ${cellColor(d.count)}`}
                    title={d.date ? `${d.date}: ${d.count}` : undefined}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1 mt-2">
          <span className="text-[10px] text-muted-foreground/60">Less</span>
          {["bg-muted/40", "bg-primary/20", "bg-primary/40", "bg-primary/65", "bg-primary"].map((c, i) => (
            <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />
          ))}
          <span className="text-[10px] text-muted-foreground/60">More</span>
        </div>
      </div>
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
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Applied This Week" value={data.appliedThisWeek} sub="New applications" color="bg-primary" />
          <StatCard label="Total Applications" value={data.total} sub="All time" color="bg-emerald-500" />
          <StatCard label="In Progress" value={data.inProgress} sub="Active pipeline" color="bg-violet-500" />
          <StatCard label="Offers" value={data.offers} sub="All time" color="bg-yellow-500" />
        </div>

        {/* By Status */}
        <div className="section-card space-y-3">
          <h2 className="text-sm font-semibold text-foreground">By Status</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-2">
            {data.byStatus.map((s) => (
              <div key={s.status} className="flex items-center justify-between text-sm pr-6">
                <span className="text-foreground">{STATUS_LABELS[s.status] ?? s.status}</span>
                <span className={`font-mono ${s.count > 0 ? "text-primary" : "text-muted-foreground"}`}>
                  {s.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Daily chart */}
        <div className="section-card space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Daily Applications — Last 30 Days</h2>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data.dailyCounts} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "oklch(0.708 0 0)" }}
                tickFormatter={(v: string) => {
                  const d = new Date(v);
                  return `${d.toLocaleString("en-US", { month: "short" })} ${d.getDate()}`;
                }}
                interval={6}
              />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "oklch(0.708 0 0)" }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "oklch(0.205 0 0)", border: "1px solid oklch(1 0 0 / 10%)", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "oklch(0.985 0 0)" }}
                itemStyle={{ color: "oklch(0.708 0 0)" }}
              />
              <Line type="monotone" dataKey="count" stroke="oklch(0.488 0.243 264.376)" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Heatmap */}
        <Heatmap data={data.heatmapCounts} />
      </div>
    </div>
  );
}
