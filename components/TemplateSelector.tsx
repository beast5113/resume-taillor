"use client";

import { useEffect, useState } from "react";
import { TEMPLATES } from "@/lib/templates/types";
import type { TemplatePreset } from "@/lib/types";

function ClassicPreview() {
  return (
    <div className="w-full h-full bg-white p-2.5 flex flex-col gap-1.5">
      <div className="flex flex-col items-center gap-0.5 pb-1.5">
        <div className="h-[5px] w-14 bg-zinc-800 rounded-sm" />
        <div className="h-[3px] w-10 bg-zinc-500 rounded-sm" />
        <div className="h-[2px] w-16 bg-zinc-400 rounded-sm" />
      </div>
      <div className="border-b border-zinc-800 pb-0.5">
        <div className="h-[3px] w-10 bg-zinc-700 rounded-sm" />
      </div>
      <div className="space-y-0.5">
        <div className="h-[2px] w-full bg-zinc-200 rounded-sm" />
        <div className="h-[2px] w-11/12 bg-zinc-200 rounded-sm" />
      </div>
      <div className="border-b border-zinc-800 pb-0.5 mt-0.5">
        <div className="h-[3px] w-12 bg-zinc-700 rounded-sm" />
      </div>
      <div className="space-y-0.5">
        <div className="h-[2px] w-full bg-zinc-200 rounded-sm" />
        <div className="h-[2px] w-10/12 bg-zinc-200 rounded-sm" />
        <div className="h-[2px] w-full bg-zinc-200 rounded-sm" />
        <div className="h-[2px] w-9/12 bg-zinc-200 rounded-sm" />
      </div>
    </div>
  );
}

function ModernPreview() {
  return (
    <div className="w-full h-full bg-white p-2.5 flex flex-col gap-1.5">
      <div className="flex flex-col items-start gap-0.5 pb-1.5">
        <div className="h-[5px] w-16 bg-zinc-800 rounded-sm" />
        <div className="flex items-center gap-1">
          <div className="h-[2px] w-8 bg-zinc-500 rounded-sm" />
          <div className="h-[2px] w-1 bg-zinc-300 rounded-sm" />
          <div className="h-[2px] w-10 bg-zinc-400 rounded-sm" />
        </div>
      </div>
      {[12, 14].map((w, i) => (
        <div key={i}>
          <div className="flex items-center gap-1 mb-0.5">
            <div className="w-[3px] h-[8px] bg-blue-600 rounded-sm flex-shrink-0" />
            <div className={`h-[3px] w-${w} bg-blue-600 rounded-sm`} />
          </div>
          <div className="space-y-0.5 pl-1">
            <div className="h-[2px] w-full bg-zinc-200 rounded-sm" />
            <div className="h-[2px] w-10/12 bg-zinc-200 rounded-sm" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ExecutivePreview() {
  return (
    <div className="w-full h-full bg-white p-2.5 flex flex-col gap-1.5">
      <div className="flex flex-col items-center gap-0.5 border-b-2 border-double border-zinc-900 pb-1.5">
        <div className="h-[6px] w-14 bg-zinc-900 rounded-sm" />
        <div className="h-[3px] w-10 bg-zinc-600 rounded-sm" />
        <div className="h-[2px] w-14 bg-zinc-400 rounded-sm" />
      </div>
      {[10, 14].map((w, i) => (
        <div key={i}>
          <div className={`h-[3px] w-${w} bg-zinc-900 border-b-2 border-zinc-900 mb-0.5`} />
          <div className="space-y-0.5">
            <div className="h-[2px] w-full bg-zinc-200 rounded-sm" />
            <div className="h-[2px] w-11/12 bg-zinc-200 rounded-sm" />
            <div className="h-[2px] w-full bg-zinc-200 rounded-sm" />
          </div>
        </div>
      ))}
    </div>
  );
}

function MinimalPreview() {
  return (
    <div className="w-full h-full bg-white p-2.5 flex flex-col gap-1.5">
      <div className="flex flex-col items-start gap-0.5 border-b border-zinc-200 pb-1.5">
        <div className="h-[5px] w-14 bg-zinc-700 rounded-sm" />
        <div className="h-[2px] w-10 bg-zinc-400 rounded-sm" />
        <div className="h-[2px] w-14 bg-zinc-300 rounded-sm" />
      </div>
      {[10, 13].map((w, i) => (
        <div key={i}>
          <div className="border-b border-zinc-200 pb-0.5 mb-0.5">
            <div className={`h-[2px] w-${w} bg-zinc-400 rounded-sm`} />
          </div>
          <div className="space-y-0.5">
            <div className="h-[2px] w-full bg-zinc-100 rounded-sm" />
            <div className="h-[2px] w-11/12 bg-zinc-100 rounded-sm" />
            <div className="h-[2px] w-5/6 bg-zinc-100 rounded-sm" />
          </div>
        </div>
      ))}
    </div>
  );
}

function CustomPreview({ baseId }: { baseId: string }) {
  const previews: Record<string, React.FC> = {
    classic: ClassicPreview,
    modern: ModernPreview,
    executive: ExecutivePreview,
    minimal: MinimalPreview,
  };
  const P = previews[baseId] ?? ClassicPreview;
  return (
    <div className="relative w-full h-full">
      <P />
      <div className="absolute inset-0 flex items-end justify-end p-1">
        <span className="bg-blue-600/90 text-white text-[8px] font-bold rounded px-1 leading-tight">CUSTOM</span>
      </div>
    </div>
  );
}

const BASE_PREVIEWS: Record<string, React.FC> = {
  classic: ClassicPreview,
  modern: ModernPreview,
  executive: ExecutivePreview,
  minimal: MinimalPreview,
};

interface TemplateSelectorProps {
  value: string;
  onChange: (id: string) => void;
}

export default function TemplateSelector({ value, onChange }: TemplateSelectorProps) {
  const [customTemplates, setCustomTemplates] = useState<TemplatePreset[]>([]);

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCustomTemplates(data.map((t) => ({ id: t.id, name: t.name, baseId: t.config?.baseId ?? "classic", created_at: t.created_at, updated_at: t.updated_at })));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div>
      <label className="field-label mb-2 block">Template</label>
      <div className="grid grid-cols-4 gap-3">
        {TEMPLATES.map((t) => {
          const Preview = BASE_PREVIEWS[t.id];
          const selected = value === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              className={`flex flex-col rounded-lg overflow-hidden border-2 transition-all text-left ${
                selected ? "border-blue-500 ring-2 ring-blue-500/30" : "border-zinc-700 hover:border-zinc-500"
              }`}
            >
              <div className="aspect-[8.5/11] w-full overflow-hidden">
                {Preview && <Preview />}
              </div>
              <div className={`px-2 py-1.5 transition-colors ${selected ? "bg-blue-600" : "bg-zinc-800"}`}>
                <p className={`text-xs font-semibold ${selected ? "text-white" : "text-zinc-200"}`}>{t.name}</p>
                <p className={`text-[10px] leading-tight mt-0.5 ${selected ? "text-blue-100" : "text-zinc-500"}`}>{t.description}</p>
              </div>
            </button>
          );
        })}

        {customTemplates.map((t) => {
          const selected = value === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              className={`flex flex-col rounded-lg overflow-hidden border-2 transition-all text-left ${
                selected ? "border-blue-500 ring-2 ring-blue-500/30" : "border-zinc-700 hover:border-zinc-500"
              }`}
            >
              <div className="aspect-[8.5/11] w-full overflow-hidden">
                <CustomPreview baseId={t.baseId} />
              </div>
              <div className={`px-2 py-1.5 transition-colors ${selected ? "bg-blue-600" : "bg-zinc-800"}`}>
                <p className={`text-xs font-semibold ${selected ? "text-white" : "text-zinc-200"}`}>{t.name}</p>
                <p className={`text-[10px] leading-tight mt-0.5 ${selected ? "text-blue-100" : "text-zinc-500"}`}>Custom · {t.baseId}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
