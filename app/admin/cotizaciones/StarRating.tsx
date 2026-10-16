"use client";

import { useState } from "react";

import { QUOTE_MAX_STARS } from "@/lib/quotes/types";

type StarRatingProps = {
  value: number;
  onChange: (value: number) => void;
  // Compact mode for use inside the quote document.
  size?: number;
  showLabel?: boolean;
};

export function StarRating({ value, onChange, size = 26, showLabel = true }: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const shown = hovered ?? value;

  return (
    <div className="flex items-center gap-3">
      <div
        className="flex items-center gap-1"
        role="radiogroup"
        aria-label="Categoría del hotel"
        onMouseLeave={() => setHovered(null)}
      >
        {Array.from({ length: QUOTE_MAX_STARS }, (_, index) => {
          const star = index + 1;
          const active = star <= shown;
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={value === star}
              aria-label={`${star} ${star === 1 ? "estrella" : "estrellas"}`}
              onMouseEnter={() => setHovered(star)}
              onFocus={() => setHovered(star)}
              onBlur={() => setHovered(null)}
              // Clicking the current rating clears it.
              onClick={() => onChange(value === star ? 0 : star)}
              className="rounded-md p-0.5 transition hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400"
            >
              <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 2l3 6.6 7 .7-5.3 4.8 1.6 7L12 17.5 5.7 21.1l1.6-7L2 9.3l7-.7z"
                  fill={active ? "#e3a325" : "none"}
                  stroke={active ? "#e3a325" : "#cbd5e1"}
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          );
        })}
      </div>
      {showLabel ? (
        <span className="text-xs text-slate-500">
          {value ? `${value} de ${QUOTE_MAX_STARS}` : "Sin estrellas"}
        </span>
      ) : null}
    </div>
  );
}
