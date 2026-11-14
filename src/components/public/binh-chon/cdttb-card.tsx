"use client";

/**
 * THẺ VINH DANH 3D — tông cam "Rực rỡ tuổi học sinh" (góp ý chị Ngọc Anh):
 * - Panel trên gradient #FFDF7E→#F26522→#C4161C khớp khung ảnh xưởng ảnh, hào quang mặt trời 14 tia.
 * - Phần dưới nền trắng sạch, tên đỏ son, viền cam.
 * - Nút "Tiếp Lửa Vinh Quang" gradient cam + pháo hoa nổ khi bấm.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Flame, Eye, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BinhChonStory } from "@/types";
import { CARD_GRADIENT } from "./palette";
import { GoldenConfetti, useCountUp, type ConfettiBurst } from "./dong-son";

/* Vòng hào quang mặt trời 14 tia sau lưng học sinh — tông cam */
function SunburstHalo({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute select-none flex items-center justify-center", className)}>
      <div
        className="absolute h-48 w-48 rounded-full blur-2xl opacity-70"
        style={{
          background: "radial-gradient(circle, rgba(255,255,255,0.6) 0%, rgba(255,223,126,0.4) 45%, transparent 70%)",
        }}
      />
      <svg viewBox="0 0 200 200" className="h-44 w-44 ds-spin" style={{ animationDuration: "90s" }}>
        <g stroke="#FFFFFF" strokeWidth="1.5" opacity="0.55">
          {Array.from({ length: 14 }, (_, i) => {
            const a = (i / 14) * Math.PI * 2;
            const x1 = 100 + 40 * Math.cos(a);
            const y1 = 100 + 40 * Math.sin(a);
            const x2 = 100 + 88 * Math.cos(a);
            const y2 = 100 + 88 * Math.sin(a);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} strokeDasharray="2 4" />;
          })}
        </g>
        <circle cx="100" cy="100" r="38" fill="none" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.7" />
        <circle cx="100" cy="100" r="32" fill="none" stroke="#FFDF7E" strokeWidth="2" strokeDasharray="3 6" opacity="0.8" />
      </svg>
    </div>
  );
}

export function CdttbCard({
  story,
  year = 2026,
  rank,
  voted,
  canVote,
  onVote,
  onOpen,
}: {
  story: BinhChonStory;
  year?: number;
  /** 1..3 → huy hiệu vàng/bạc/đồng */
  rank?: number;
  voted?: boolean;
  canVote?: boolean;
  onVote?: (s: BinhChonStory) => void;
  onOpen?: (s: BinhChonStory) => void;
}) {
  const initial = story.studentName.trim().charAt(0).toUpperCase() || "?";
  const votes = useCountUp(story.voteCount);
  const [burst, setBurst] = useState<ConfettiBurst | null>(null);

  const handleVoteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (voted || !canVote) return;
    setBurst({ id: Date.now(), x: e.clientX, y: e.clientY });
    onVote?.(story);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55 }}
      whileHover={{ y: -8 }}
      className="group relative flex w-full flex-col pt-8" // pt-8 để tạo không gian cho avatar vượt khung
    >
      {/* ═══════════ KHUNG THẺ VIỀN CAM ═══════════ */}
      <div
        className={cn(
          "relative rounded-[26px] p-[1.5px] transition-all duration-500",
          "border border-[#F26522]/35 bg-gradient-to-b from-[#FFDF7E]/50 via-[#F26522]/25 to-[#C4161C]/20",
          "shadow-[0_14px_36px_rgba(193,73,26,0.16)] group-hover:border-[#F26522] group-hover:shadow-[0_18px_48px_rgba(242,101,34,0.28)]"
        )}
      >
        {/* NỘI DUNG CARD — bấm mở modal chi tiết */}
        <div
          onClick={() => onOpen?.(story)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onOpen?.(story);
            }
          }}
          title={`Xem chi tiết câu chuyện & thành tích của ${story.studentName}`}
          className="relative aspect-[1/2.2] w-full overflow-hidden rounded-[24px] bg-white cursor-pointer select-none"
        >
          {/* HOA VĂN RĂNG CƯA TRÊN VIỀN THẺ */}
          <div className="pointer-events-none absolute inset-1.5 rounded-[20px] border border-dashed border-[#F26522]/25 opacity-70" />

          {/* 4 ĐINH TÁN KIM LOẠI TẠI 4 GÓC THẺ */}
          <span className="pointer-events-none absolute left-3 top-3 h-1.5 w-1.5 rounded-full bg-[#C4161C]/60" />
          <span className="pointer-events-none absolute right-3 top-3 h-1.5 w-1.5 rounded-full bg-[#C4161C]/60" />
          <span className="pointer-events-none absolute left-3 bottom-3 h-1.5 w-1.5 rounded-full bg-[#F26522]/40" />
          <span className="pointer-events-none absolute right-3 bottom-3 h-1.5 w-1.5 rounded-full bg-[#F26522]/40" />

          {/* PHẦN TRÊN: PANEL CAM RỰC RỠ + HÀO QUANG MẶT TRỜI 14 TIA */}
          <div className="absolute inset-x-0 top-0 h-[52%] overflow-hidden" style={{ background: CARD_GRADIENT }}>
            <SunburstHalo className="left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2" />
          </div>

          {/* DẢI BANNER DANH HIỆU TRÊN CÙNG */}
          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between border-b border-white/25 bg-[#7A1208]/35 px-3 py-1.5 backdrop-blur-md">
            <div className="flex items-center gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-tnth-03.png" alt="TNTH" className="h-4.5 w-auto" loading="lazy" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-hs3t.png" alt="HS3T" className="h-4.5 w-auto" loading="lazy" />
            </div>

            <span className="rounded-full border border-white/50 bg-white/15 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.16em] text-white">
              {year}
            </span>
          </div>

          {/* HUY HIỆU TOP 1-3 */}
          {rank && rank <= 3 ? (
            <div className="absolute right-3 top-9 z-30">
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-black shadow-lg ring-2 ring-white/90",
                  rank === 1 && "bg-gradient-to-br from-yellow-300 via-amber-400 to-amber-600 text-amber-950 shadow-[0_0_15px_rgba(245,158,11,0.7)]",
                  rank === 2 && "bg-gradient-to-br from-slate-100 via-slate-200 to-slate-400 text-slate-800",
                  rank === 3 && "bg-gradient-to-br from-amber-600 via-orange-500 to-amber-800 text-white"
                )}
              >
                #{rank}
              </span>
            </div>
          ) : null}

          {/* ════ AVATAR TÁCH NỀN NỔI KHỐI VƯỢT KHỎI KHUNG ════ */}
          {story.photoThumbDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={story.photoThumbDataUrl}
              alt={`Ảnh của ${story.studentName}`}
              className="absolute left-1/2 top-[-8px] z-20 h-[60%] w-[92%] -translate-x-1/2 object-contain object-top drop-shadow-[0_14px_24px_rgba(122,18,8,0.45)] transition-transform duration-500 group-hover:scale-108 group-hover:-translate-y-1"
              loading="lazy"
            />
          ) : (
            <div className="absolute left-1/2 top-[5%] z-20 flex h-[48%] w-[75%] -translate-x-1/2 items-center justify-center">
              <span className="font-serif-display text-8xl font-black text-white/60">{initial}</span>
            </div>
          )}

          {/* BADGE GỢI Ý XEM THÀNH TÍCH KHI HOVER */}
          <div className="absolute bottom-[50%] right-3 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F26522]/40 bg-white/95 px-2.5 py-1 text-[10px] font-bold text-[#C4161C] shadow-lg">
              <Eye className="h-3 w-3 text-[#F26522]" /> Xem chi tiết
            </span>
          </div>

          {/* PHẦN DƯỚI: THÔNG TIN ỨNG VIÊN NỀN TRẮNG SẠCH */}
          <div className="absolute inset-x-0 bottom-0 flex h-[50%] flex-col border-t border-[#F26522]/20 bg-gradient-to-b from-[#FFFDF9] via-[#FFF8F0] to-[#FFF1E4] px-3.5 pb-3.5 pt-[38%] text-left sm:px-4">
            {/* Tên học sinh đỏ son */}
            <div className="text-left font-serif-display font-black uppercase leading-tight group-hover:underline">
              <span className="line-clamp-2 text-base sm:text-lg text-[#C4161C]">
                {story.studentName}
              </span>
            </div>

            {/* Thông tin chức vụ, lớp & trường */}
            <p className="mt-1 line-clamp-2 text-[10.5px] sm:text-[11px] font-medium leading-relaxed text-[#7A4A33]">
              {story.position ? `${story.position} · ` : ""}
              {story.className ? `${story.className} · ` : ""}
              {story.orgDisplayName || story.schoolName}
              {story.wardName ? ` · ${story.wardName}` : ""}
              {story.provinceName ? ` · ${story.provinceName}` : ""}
            </p>

            {/* Trích dẫn châm ngôn sống */}
            {story.quote ? (
              <div className="mt-1.5 rounded-lg border-l-2 border-[#F26522] bg-[#FFF6EE] p-1.5 text-[9px] sm:text-[10px] italic leading-snug text-[#5B3A2A] line-clamp-2">
                &ldquo;{story.quote}&rdquo;
              </div>
            ) : null}
          </div>

          {/* DẢI HỒLOGRAPHIC QUÉT ÁNH XÀ CỪ KHI HOVER */}
          <div aria-hidden className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 w-2/3 opacity-0 group-hover:animate-[foil-sweep_1.2s_ease_forwards]"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(255,223,126,0.2) 25%, rgba(255,255,255,0.65) 50%, rgba(242,101,34,0.28) 75%, transparent 100%)",
              }}
            />
          </div>
        </div>
      </div>

      {/* ═══════════ NÚT TIẾP LỬA VINH QUANG ═══════════ */}
      <div className="mt-2.5 flex items-center gap-2">
        {/* Số phiếu hiển thị Odometer */}
        <div className="flex items-center justify-center gap-1 min-w-[72px] rounded-xl border border-[#F26522]/30 bg-white px-2 py-2 text-center shadow-xs">
          <span className="text-xs font-black tabular-nums text-[#C4161C]">{votes}</span>
          <span className="text-[9px] font-bold text-[#F26522]/80 uppercase">phiếu</span>
        </div>

        {/* NÚT "TIẾP LỬA VINH QUANG" VIỀN HẠT NĂNG LƯỢNG CHẠY VÒNG QUANH */}
        <div className="relative flex-1 overflow-hidden rounded-xl p-[1.5px]">
          <span
            aria-hidden
            className={cn("absolute inset-[-100%]", !voted && canVote && "animate-[spin_4s_linear_infinite]")}
            style={{
              background: "conic-gradient(from 0deg, transparent 0deg 280deg, #FFDF7E 320deg, #F26522 360deg)",
            }}
          />
          <button
            type="button"
            onClick={handleVoteClick}
            disabled={voted || !canVote}
            className={cn(
              "relative flex w-full items-center justify-center gap-1.5 rounded-[10px] px-2 py-2 text-[11px] font-black transition-all",
              voted
                ? "bg-[#FFF1E4] text-[#C4161C]"
                : canVote
                  ? "bg-gradient-to-r from-[#F26522] to-[#C4161C] text-white hover:brightness-110 active:scale-[0.98]"
                  : "bg-stone-100 text-stone-400"
            )}
          >
            {voted ? (
              <>
                <Check className="h-3.5 w-3.5" /> Đã tiếp lửa
              </>
            ) : canVote ? (
              <>
                <Flame className="h-3.5 w-3.5" /> Tiếp lửa vinh quang
              </>
            ) : (
              <>
                <Flame className="h-3.5 w-3.5" /> Cổng đã đóng
              </>
            )}
            <Sparkles className={cn("h-3 w-3", voted ? "text-[#F26522]" : "text-[#FFDF7E]")} />
          </button>
        </div>
      </div>

      {/* Pháo hoa nổ khi bấm tiếp lửa */}
      <GoldenConfetti burst={burst} onDone={() => setBurst(null)} />
    </motion.div>
  );
}
