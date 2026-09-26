import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label, value, sub, icon: Icon, href, tone = "red",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  href?: string;
  tone?: "red" | "amber" | "blue" | "green" | "violet";
}) {
  const tones: Record<string, string> = {
    red: "bg-doan-50 text-doan-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-sky-50 text-sky-600",
    green: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
  };

  const inner = (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
      <div className="min-w-0">
        <p className="text-xs font-medium text-stone-500">{label}</p>
        <p className="mt-1.5 text-2xl font-bold text-stone-900">{value}</p>
        {sub ? <p className="mt-1 text-[11px] text-stone-400">{sub}</p> : null}
      </div>
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", tones[tone])}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="group block">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export function SectionTitle({
  title, action,
}: {
  title: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="font-serif-display text-base font-bold text-stone-900">{title}</h2>
      {action ? (
        <Link href={action.href} className="inline-flex items-center gap-1 text-xs font-medium text-doan-600 hover:underline">
          {action.label} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  );
}
