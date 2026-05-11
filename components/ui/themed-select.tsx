"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export type ThemedSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type ThemedSelectProps = {
  name?: string;
  id?: string;
  options: ThemedSelectOption[];
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  onChange?: (value: string) => void;
  className?: string;
  selectClassName?: string;
  buttonClassName?: string;
  menuClassName?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
};

export function ThemedSelect({
  name,
  id,
  options,
  value,
  defaultValue,
  placeholder,
  required,
  disabled,
  onChange,
  className,
  selectClassName,
  buttonClassName,
  menuClassName,
  searchable = false,
  searchPlaceholder = "Buscar",
}: ThemedSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [internalValue, setInternalValue] = useState(
    value ?? defaultValue ?? ""
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nativeRef = useRef<HTMLSelectElement | null>(null);

  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  const resolvedOptions = useMemo(() => {
    if (!placeholder) return options;
    const hasEmpty = options.some((option) => option.value === "");
    return hasEmpty
      ? options
      : [{ value: "", label: placeholder, disabled: true }, ...options];
  }, [options, placeholder]);

  const selectedLabel =
    resolvedOptions.find((option) => option.value === internalValue)?.label ??
    placeholder ??
    "Selecciona una opción";

  const visibleOptions = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (!normalizedSearch) return resolvedOptions;
    return resolvedOptions.filter((option) =>
      option.label
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .includes(normalizedSearch)
    );
  }, [resolvedOptions, search]);

  const handleSelect = (nextValue: string) => {
    setInternalValue(nextValue);
    onChange?.(nextValue);
    if (nativeRef.current) {
      nativeRef.current.value = nextValue;
      nativeRef.current.dispatchEvent(new Event("change", { bubbles: true }));
    }
    setOpen(false);
    setSearch("");
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <select
        ref={nativeRef}
        id={id}
        name={name}
        value={internalValue}
        required={required}
        disabled={disabled}
        onChange={(event) => handleSelect(event.target.value)}
        className={cn(
          "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 transition-colors duration-200 focus:border-brand-400 focus:outline-none md:hidden",
          selectClassName
        )}
      >
        {resolvedOptions.map((option) => (
          <option key={option.value || option.label} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "hidden w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 shadow-sm transition hover:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-200 md:flex",
          buttonClassName
        )}
      >
        <span className={internalValue ? "text-slate-900" : "text-slate-400"}>
          {selectedLabel}
        </span>
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          className={cn(
            "h-4 w-4 text-slate-500 transition-transform",
            open && "rotate-180"
          )}
        >
          <path
            d="M5 7l5 5 5-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open ? (
        <div
          className={cn(
            "absolute z-30 mt-2 hidden w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-lg md:block",
            menuClassName
          )}
        >
          {searchable ? (
            <div className="sticky top-0 z-10 bg-white pb-2">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          ) : null}
          {visibleOptions.map((option) => {
            const isSelected = option.value === internalValue;
            return (
              <button
                key={option.value || option.label}
                type="button"
                disabled={option.disabled}
                onClick={() => handleSelect(option.value)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition",
                  option.disabled
                    ? "cursor-not-allowed text-slate-300"
                    : "text-slate-700 hover:bg-brand-50 hover:text-brand-700",
                  isSelected && "bg-brand-100 text-brand-700"
                )}
              >
                <span>{option.label}</span>
                {isSelected ? (
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                    ✓
                  </span>
                ) : null}
              </button>
            );
          })}
          {visibleOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-400">Sin resultados</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
