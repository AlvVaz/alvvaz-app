"use client";

import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

type TagsInputProps = {
  name: string;
  label?: string;
  presetTags: string[];
  defaultTags?: string[];
};

export function TagsInput({
  name,
  label = "Etiquetas",
  presetTags,
  defaultTags = [],
}: TagsInputProps) {
  const [tags, setTags] = useState<string[]>(() => defaultTags);
  const [customTag, setCustomTag] = useState("");

  const normalizedPreset = useMemo(
    () => presetTags.map((tag) => tag.trim()).filter(Boolean),
    [presetTags]
  );

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
    );
  };

  const addCustomTag = () => {
    const cleaned = customTag.trim();
    if (!cleaned) return;
    setTags((prev) => (prev.includes(cleaned) ? prev : [...prev, cleaned]));
    setCustomTag("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          {label}
        </label>
        <span className="text-xs text-slate-400">{tags.length} seleccionadas</span>
      </div>
      <input type="hidden" name={name} value={JSON.stringify(tags)} />
      <div className="flex flex-wrap gap-2">
        {normalizedPreset.map((tag) => {
          const active = tags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={cn(
                "rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors",
                active
                  ? "border-brand-500 bg-brand-200/50 text-brand-900"
                  : "border-slate-200 text-slate-500 hover:border-brand-300 hover:text-brand-700"
              )}
            >
              {tag}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={customTag}
          onChange={(event) => setCustomTag(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addCustomTag();
            }
          }}
          placeholder="Agregar etiqueta personalizada"
          className="min-w-[220px] flex-1 rounded-2xl border border-slate-200 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={addCustomTag}
          className="rounded-full border border-brand-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700 hover:border-brand-400 hover:text-brand-900"
        >
          Agregar
        </button>
      </div>
    </div>
  );
}
