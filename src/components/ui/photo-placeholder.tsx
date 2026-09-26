import { cn } from "@/lib/utils";
import { Image } from "lucide-react";

/** Ảnh giả lập bằng gradient + icon (prototype không có ảnh thật) */
const gradients = [
  "from-doan-600 to-doan-800",
  "from-vang-400 to-doan-500",
  "from-sky-500 to-doan-600",
  "from-emerald-500 to-teal-700",
  "from-violet-500 to-doan-700",
  "from-orange-400 to-doan-600",
];

export function PhotoPlaceholder({
  seed = 0,
  label,
  className,
  icon = true,
}: {
  seed?: number;
  label?: string;
  className?: string;
  icon?: boolean;
}) {
  const g = gradients[Math.abs(seed) % gradients.length];
  return (
    <div
      className={cn(
        "flex items-center justify-center bg-gradient-to-br",
        g,
        className
      )}
    >
      {icon ? <Image className="h-6 w-6 text-white/60" /> : null}
      {label ? (
        <span className="absolute bottom-2 left-2 right-2 truncate text-[10px] font-medium text-white/80">
          {label}
        </span>
      ) : null}
    </div>
  );
}
