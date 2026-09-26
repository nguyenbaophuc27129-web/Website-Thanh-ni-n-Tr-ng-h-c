import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Tone =
  | "red" | "yellow" | "green" | "blue" | "gray" | "purple" | "orange";

const tones: Record<Tone, string> = {
  red: "bg-doan-50 text-doan-700 border-doan-200",
  yellow: "bg-amber-50 text-amber-700 border-amber-200",
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  blue: "bg-sky-50 text-sky-700 border-sky-200",
  gray: "bg-stone-100 text-stone-600 border-stone-200",
  purple: "bg-violet-50 text-violet-700 border-violet-200",
  orange: "bg-orange-50 text-orange-700 border-orange-200",
};

export function Badge({
  tone = "gray",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
