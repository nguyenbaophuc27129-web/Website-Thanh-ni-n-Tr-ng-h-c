"use client";

import { cn } from "@/lib/utils";

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-1 rounded-lg bg-stone-100 p-1",
        className
      )}
    >
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            value === t.value
              ? "bg-white text-doan-700 shadow-sm"
              : "text-stone-600 hover:text-stone-900"
          )}
        >
          {t.label}
          {typeof t.count === "number" ? (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                value === t.value
                  ? "bg-doan-50 text-doan-700"
                  : "bg-stone-200 text-stone-600"
              )}
            >
              {t.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
