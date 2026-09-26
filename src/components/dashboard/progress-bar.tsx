import { cn } from "@/lib/utils";

export function Progress({ value, className }: { value: number; className?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-stone-100", className)}>
      <div
        className={cn(
          "h-full rounded-full transition-all",
          clamped >= 100 ? "bg-emerald-500" : clamped >= 50 ? "bg-doan-500" : clamped > 0 ? "bg-amber-400" : "bg-stone-300"
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
