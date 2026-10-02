import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
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
  /* Soft squircle: khối icon bo góc mềm, nền màu nhạt + icon đậm */
  const tones: Record<string, string> = {
    red: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-cyan-50 text-cyan-600",
    green: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
  };

  const inner = (
    <div className="group flex h-full items-start justify-between gap-3 rounded-2xl bg-white p-5 shadow-sm shadow-slate-900/[0.04] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgb(15,23,42,0.10)]">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">{value}</p>
        {sub ? <p className="mt-1.5 text-[11px] font-light text-slate-400">{sub}</p> : null}
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110", tones[tone])}>
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
        {href ? (
          <ArrowRight className="h-3.5 w-3.5 -translate-x-1 text-slate-300 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
        ) : null}
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="group block h-full">
      {inner}
    </Link>
  ) : (
    <motion.div className="h-full">{inner}</motion.div>
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
      <h2 className="text-base font-bold tracking-tight text-slate-900">{title}</h2>
      {action ? (
        <Link href={action.href} className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline">
          {action.label} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  );
}
