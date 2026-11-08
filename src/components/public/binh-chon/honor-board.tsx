"use client";

/**
 * HonorBoard — "Bảng gương theo danh hiệu" thay ô trống đồng (góp ý chị Ngọc Anh):
 * 3 khối "Gương đạt danh hiệu cấp trường" / "Gương đạt danh hiệu cấp tỉnh" /
 * "Gương đề cử đạt danh hiệu cấp Trung ương" — mỗi khối top 5 theo số phiếu.
 * Dữ liệu: GET /api/binh-chon?withBoard=1 → topByHonor.
 */

import { motion } from "framer-motion";
import { Medal, Users, ArrowRight } from "lucide-react";
import type { BinhChonStory } from "@/types";
import { CARD_GRADIENT, HONOR_LEVEL_SHORT } from "./palette";
import { cn } from "@/lib/utils";

const GROUPS: { key: "TRUONG" | "TINH" | "TW_DE_CU"; title: string; hint: string }[] = [
  { key: "TRUONG", title: "Gương đạt danh hiệu cấp trường", hint: "Học sinh đã đạt danh hiệu 3 tốt cấp trường" },
  { key: "TINH", title: "Gương đạt danh hiệu cấp tỉnh", hint: "Học sinh đã đạt danh hiệu 3 tốt cấp tỉnh / thành phố" },
  { key: "TW_DE_CU", title: "Gương đề cử đạt danh hiệu cấp Trung ương", hint: "Được đơn vị đề cử xét danh hiệu cấp Trung ương" },
];

const MEDAL_STYLE = [
  "bg-gradient-to-br from-yellow-300 via-amber-400 to-amber-600 text-amber-950 shadow-[0_0_12px_rgba(245,158,11,0.6)]",
  "bg-gradient-to-br from-slate-100 via-slate-200 to-slate-400 text-slate-800",
  "bg-gradient-to-br from-amber-600 via-orange-500 to-amber-800 text-white",
];

function RankMedal({ rank }: { rank: number }) {
  if (rank > 3) {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F26522]/10 text-[10px] font-black text-[#C4161C]">
        {rank}
      </span>
    );
  }
  return (
    <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black shadow-sm", MEDAL_STYLE[rank - 1])}>
      {rank}
    </span>
  );
}

export function HonorBoard({
  topByHonor,
  onOpen,
}: {
  topByHonor?: Partial<Record<"TRUONG" | "TINH" | "TW_DE_CU", BinhChonStory[]>>;
  onOpen?: (s: BinhChonStory) => void;
}) {
  const hasAny = GROUPS.some((g) => (topByHonor?.[g.key]?.length ?? 0) > 0);
  if (!hasAny) return null;

  return (
    <section className="relative z-10 mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 text-center">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-[#F26522]/30 bg-[#FFF1E4] px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#C4161C]">
          <Users className="h-3.5 w-3.5" /> Bảng gương theo danh hiệu
        </p>
        <h2 className="mt-2 font-serif-display text-2xl sm:text-4xl font-black text-[#C4161C]">
          Những gương mặt đang được tiếp lửa
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm text-[#7A4A33]">
          Top 5 bài dự thi nhận nhiều phiếu bình chọn nhất theo từng nhóm danh hiệu đã đạt
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {GROUPS.map((g, gi) => {
          const list = topByHonor?.[g.key] ?? [];
          return (
            <motion.div
              key={g.key}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: gi * 0.08 }}
              className="relative overflow-hidden rounded-3xl border border-[#F26522]/25 bg-white shadow-[0_10px_35px_rgba(193,73,26,0.10)]"
            >
              {/* Dải cam đầu khối */}
              <div className="px-5 pt-4 pb-3" style={{ background: CARD_GRADIENT }}>
                <h3 className="text-sm sm:text-[15px] font-black uppercase leading-snug text-white drop-shadow-sm">
                  {g.title}
                </h3>
                <p className="mt-0.5 text-[10.5px] font-medium text-white/85">{g.hint}</p>
              </div>

              <div className="p-3.5">
                {list.length === 0 ? (
                  <p className="px-2 py-8 text-center text-xs text-stone-400">Chưa có bài dự thi trong nhóm này</p>
                ) : (
                  <ol className="space-y-1.5">
                    {list.map((s, i) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => onOpen?.(s)}
                          className="group flex w-full items-center gap-2.5 rounded-2xl border border-transparent px-2.5 py-2 text-left transition-all hover:border-[#F26522]/30 hover:bg-[#FFF6EE]"
                        >
                          <RankMedal rank={i + 1} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-bold text-[#3D1A0E] group-hover:text-[#C4161C]">
                              {s.studentName}
                            </span>
                            <span className="block truncate text-[10.5px] text-stone-500">
                              {s.className ? `${s.className} · ` : ""}
                              {s.orgDisplayName || s.schoolName}
                            </span>
                          </span>
                          <span className="flex shrink-0 flex-col items-end">
                            <span className="text-[13px] font-black tabular-nums text-[#F26522]">{s.voteCount}</span>
                            <span className="text-[9px] font-bold uppercase text-stone-400">phiếu</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {/* Chip danh hiệu dưới đáy */}
              <div className="flex items-center justify-between border-t border-[#F26522]/15 px-5 py-2.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#C4161C]">
                  <Medal className="h-3 w-3" /> {HONOR_LEVEL_SHORT[g.key]}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-[#F26522]/50" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
