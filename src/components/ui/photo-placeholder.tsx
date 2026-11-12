import { cn } from "@/lib/utils";
import { Image } from "lucide-react";
import { coverPosition, parseCover } from "@/lib/cover";

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
  src,
}: {
  seed?: number;
  label?: string;
  className?: string;
  icon?: boolean;
  /** Ảnh thật (data URL từ file người dùng tải lên) — ưu tiên hiển thị thay gradient */
  src?: string;
}) {
  const g = gradients[Math.abs(seed) % gradients.length];
  /* src có thể kèm #focus=x,y — tách ra để lấy đường dẫn sạch + object-position */
  const { src: clean, focus } = parseCover(src);
  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden",
        clean ? "bg-stone-100" : cn("bg-gradient-to-br", g),
        className
      )}
    >
      {clean ? (
        <img
          src={clean}
          alt={label ?? ""}
          className="h-full w-full object-cover"
          style={{ objectPosition: coverPosition(focus) }}
        />
      ) : (
        <>
          {icon ? <Image className="h-6 w-6 text-white/60" /> : null}
          {label ? (
            <span className="absolute bottom-2 left-2 right-2 truncate text-[10px] font-medium text-white/80">
              {label}
            </span>
          ) : null}
        </>
      )}
    </div>
  );
}
