"use client";

import { useEffect, useState, useRef } from "react";
import { ExternalLink } from "lucide-react";

type PipelineStatus = "hr_interview" | "tech_1" | "tech_2" | "offer" | "failed";

interface Application {
  id: string;
  role: string;
  company_name: string;
  job_url: string | null;
  pipeline_status: string;
  created_at: string;
}

const COLUMNS: { id: PipelineStatus; label: string; color: string; dot: string }[] = [
  { id: "hr_interview", label: "HR Interview", color: "border-t-yellow-500",   dot: "bg-yellow-500" },
  { id: "tech_1",       label: "Tech 1",       color: "border-t-purple-500",   dot: "bg-purple-500" },
  { id: "tech_2",       label: "Tech 2",       color: "border-t-orange-500",   dot: "bg-orange-500" },
  { id: "offer",        label: "Offer",        color: "border-t-emerald-400",  dot: "bg-emerald-400" },
  { id: "failed",       label: "Failed",       color: "border-t-red-500",      dot: "bg-red-500" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export default function KanbanPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const draggingId = useRef<string | null>(null);

  useEffect(() => {
    fetch("/api/applications?include_profiles=true")
      .then((r) => r.json())
      .then((data) => setApps(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  function handleDragStart(id: string) {
    draggingId.current = id;
  }

  function handleDrop(targetStatus: PipelineStatus) {
    const id = draggingId.current;
    if (!id) return;
    draggingId.current = null;

    const app = apps.find((a) => a.id === id);
    if (!app || app.pipeline_status === targetStatus) return;

    setApps((prev) => prev.map((a) => a.id === id ? { ...a, pipeline_status: targetStatus } : a));

    fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipeline_status: targetStatus }),
    });
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  const kanbanApps = apps.filter((a) => COLUMNS.some((c) => c.id === a.pipeline_status));

  return (
    <div className="h-full flex flex-col">
      <div className="px-8 py-6 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Kanban Board</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Drag cards between stages</p>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden px-8 py-6">
        <div className="flex gap-4 h-full min-w-max">
          {COLUMNS.map((col) => {
            const cards = kanbanApps.filter((a) => a.pipeline_status === col.id);
            return (
              <div
                key={col.id}
                className="flex flex-col w-64 bg-card rounded-xl ring-1 ring-foreground/10 overflow-hidden"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(col.id)}
              >
                {/* Column header */}
                <div className={`border-t-4 ${col.color} px-4 pt-3 pb-2`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                      <span className="text-sm font-semibold text-foreground">{col.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                      {cards.length}
                    </span>
                  </div>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {cards.length === 0 ? (
                    <div className="flex items-center justify-center h-20 text-xs text-muted-foreground/40">
                      Empty
                    </div>
                  ) : (
                    cards.map((app) => (
                      <div
                        key={app.id}
                        draggable
                        onDragStart={() => handleDragStart(app.id)}
                        className="bg-background rounded-lg p-3 ring-1 ring-foreground/10 cursor-grab active:cursor-grabbing space-y-2 hover:ring-primary/40 transition-all"
                      >
                        <p className="text-sm font-medium text-foreground leading-tight">{app.role}</p>

                        <p className="text-xs text-muted-foreground">{app.company_name}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground/60">{formatDate(app.created_at)}</span>
                          {app.job_url && (
                            <a
                              href={app.job_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/60 hover:text-primary transition-colors"
                            >
                              <ExternalLink size={10} />
                              Job Link
                            </a>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
