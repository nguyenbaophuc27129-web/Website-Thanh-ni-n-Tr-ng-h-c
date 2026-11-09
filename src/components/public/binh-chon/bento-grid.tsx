"use client";

/**
 * Lưới Bento "Chuẩn mực & Giá trị danh hiệu" — tông cam "Rực rỡ tuổi học sinh":
 * - Nền thẻ trắng kem viền cam, heading đỏ son.
 * - Ô 3 tiêu chí: nội dung ĐÚNG Điều 4 Quy chế 317/QĐ-TWĐTN-TNTH (HS3T_SUB_CRITERIA), không "ấn tín" tự chế.
 * - Ô thống kê: countdown + số liệu trực tiếp. Ô thông điệp: con dấu nhỏ góc phải.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HeartHandshake,
  BookOpen,
  Flame,
  TrendingUp,
  ShieldCheck,
  Gift,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { RedWaxSeal, useCountUp } from "./dong-son";
import { HS3T_SUB_CRITERIA } from "@/lib/hs3t-evaluate";
import { cn } from "@/lib/utils";

export interface BentoGridProps {
  cd: { days: number; hours: number; minutes: number; seconds: number; ended: boolean };
  stats: { approvedStories: number; totalVotes: number };
  giftNote?: string;
  year?: number;
}

const GROUPS = [
  {
    id: "dao-duc",
    chip: "Nhóm 1",
    title: "Đạo đức tốt",
    motto: "Hạnh kiểm tốt · Lập trường tư tưởng vững vàng",
    icon: HeartHandshake,
    points: HS3T_SUB_CRITERIA.PHONG_TRAO,
  },
  {
    id: "hoc-tap",
    chip: "Nhóm 2",
    title: "Học tập tốt",
    motto: "Kết quả học tập · Giải và sáng tạo khoa học",
    icon: BookOpen,
    points: HS3T_SUB_CRITERIA.HOC_TAP,
  },
  {
    id: "the-luc",
    chip: "Nhóm 3",
    title: "Thể lực tốt",
    motto: "Rèn luyện thân thể · Sống lành mạnh",
    icon: Flame,
    points: HS3T_SUB_CRITERIA.REN_LUYEN,
  },
];

export function BentoGrid({ cd, stats, giftNote, year = 2026 }: BentoGridProps) {
  const [activeGroup, setActiveGroup] = useState<0 | 1 | 2>(0);
  const current = GROUPS[activeGroup];

  const animatedVotes = useCountUp(stats.totalVotes, 800);
  const animatedStories = useCountUp(stats.approvedStories, 800);

  return (
    <section className="relative z-10 mx-auto max-w-6xl px-4 pt-16 sm:pt-20">
      {/* Tiêu đề dẫn nhập */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 text-center sm:text-left">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#F26522]/30 bg-[#FFF1E4] px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#C4161C]">
            <Layers className="h-3.5 w-3.5 text-[#F26522]" /> Tiêu chuẩn theo quy chế
          </div>
          <h2 className="mt-2.5 font-serif-display text-2xl sm:text-4xl font-black text-[#C4161C]">
            Chuẩn mực &amp; Giá trị danh hiệu
          </h2>
        </div>
        <p className="max-w-md text-xs text-left sm:text-sm text-[#7A4A33]">
          Ba nhóm tiêu chí theo Điều 4 Quy chế danh hiệu &ldquo;Học sinh 3 tốt&rdquo; giai đoạn 2023&ndash;2027 (Quyết định
          317/QĐ-TWĐTN-TNTH) — cùng bộ đếm bình chọn trực tiếp toàn quốc.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-12 sm:gap-6">
        {/* ── Ô 1: 3 NHÓM TIÊU CHÍ THEO QUY CHẾ ── */}
        <div className="relative overflow-hidden rounded-[28px] border border-[#F26522]/25 bg-white p-6 shadow-[0_14px_36px_rgba(193,73,26,0.10)] sm:p-8 md:col-span-12 lg:col-span-8">
          {/* Header ô tiêu chí */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F26522]/15 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#F26522]">
                Điều 4 · Quy chế 317/QĐ-TWĐTN-TNTH
              </span>
              <h3 className="font-serif-display text-xl font-black text-[#C4161C] sm:text-2xl">
                Ba nhóm tiêu chí danh hiệu
              </h3>
            </div>
            <span className="rounded-full border border-[#F26522]/25 bg-[#FFF1E4] px-3 py-1 text-[11px] font-semibold text-[#C4161C]">
              Chọn nhóm để xem tiêu chí
            </span>
          </div>

          {/* 3 NHÓM */}
          <div className="mt-6 grid grid-cols-3 gap-3 sm:gap-4">
            {GROUPS.map((g, idx) => {
              const isSelected = activeGroup === idx;
              return (
                <button
                  key={g.id}
                  type="button"
                  onMouseEnter={() => setActiveGroup(idx as 0 | 1 | 2)}
                  onClick={() => setActiveGroup(idx as 0 | 1 | 2)}
                  className={cn(
                    "group relative flex flex-col items-center rounded-2xl p-3 text-center transition-all duration-300 select-none sm:p-4",
                    "border cursor-pointer",
                    isSelected
                      ? "border-[#F26522] bg-gradient-to-b from-[#FFF1E4] to-white shadow-[0_10px_28px_rgba(242,101,34,0.25)] -translate-y-1"
                      : "border-[#F26522]/20 bg-[#FFFBF6] hover:border-[#F26522]/50 hover:bg-[#FFF1E4]"
                  )}
                >
                  <div
                    className={cn(
                      "relative flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-300 sm:h-16 sm:w-16",
                      "border shadow-xs",
                      isSelected
                        ? "border-[#F26522] bg-gradient-to-br from-[#FFDF7E] via-[#F26522] to-[#C4161C] text-white scale-105"
                        : "border-[#F26522]/30 bg-gradient-to-br from-[#FFF1E4] to-[#FFE3CF] text-[#F26522] group-hover:scale-105"
                    )}
                  >
                    <g.icon className="h-7 w-7" />
                  </div>

                  <p className="mt-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#F26522]">
                    {g.chip}
                  </p>
                  <p
                    className={cn(
                      "font-serif-display text-sm font-black leading-tight transition-colors sm:text-base",
                      isSelected ? "text-[#C4161C]" : "text-[#7A4A33] group-hover:text-[#C4161C]"
                    )}
                  >
                    {g.title}
                  </p>
                </button>
              );
            })}
          </div>

          {/* NỘI DUNG CHI TIẾT NHÓM ĐANG CHỌN */}
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="mt-6 rounded-2xl border border-[#F26522]/20 bg-[#FFF8F0] p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold tracking-wider text-[#C4161C] uppercase">
                  {current.motto}
                </span>
                <span className="rounded-full border border-[#F26522]/30 bg-white px-2.5 py-0.5 text-[9px] font-bold tracking-widest text-[#F26522] uppercase">
                  {current.points.length} tiêu chí
                </span>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {current.points.map((p, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px] leading-relaxed text-[#5B3A2A]">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#F26522]" />
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Ô 2: BỘ ĐẾM + THỐNG KÊ TRỰC TIẾP ── */}
        <div className="relative overflow-hidden rounded-[28px] border border-[#F26522]/25 bg-gradient-to-b from-[#FFF8F0] to-white p-6 shadow-[0_14px_36px_rgba(193,73,26,0.10)] md:col-span-12 lg:col-span-4">
          {/* Terminal Header */}
          <div>
            <div className="flex items-center justify-between border-b border-[#F26522]/15 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#F26522] shadow-[0_0_8px_rgba(242,101,34,0.8)]" />
                <span className="text-[10px] font-black tracking-[0.18em] text-[#C4161C] uppercase">
                  Số liệu trực tiếp
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-[#F26522]/80">
                TOÀN QUỐC
              </span>
            </div>

            {/* Countdown */}
            <div className="mt-5">
              <p className="text-[10px] font-bold tracking-wider text-[#F26522] uppercase">
                Thời gian cổng bình chọn:
              </p>
              <div className="mt-2.5 flex items-center justify-between rounded-2xl border border-[#F26522]/25 bg-white p-3.5 shadow-xs">
                <div className="text-center">
                  <p className="text-2xl font-black tabular-nums text-[#C4161C]">{String(cd.days).padStart(2, "0")}</p>
                  <p className="text-[9px] tracking-wider text-[#7A4A33]/80 uppercase">Ngày</p>
                </div>
                <span className="text-xl font-bold text-[#F26522]/40">:</span>
                <div className="text-center">
                  <p className="text-2xl font-black tabular-nums text-[#C4161C]">{String(cd.hours).padStart(2, "0")}</p>
                  <p className="text-[9px] tracking-wider text-[#7A4A33]/80 uppercase">Giờ</p>
                </div>
                <span className="text-xl font-bold text-[#F26522]/40">:</span>
                <div className="text-center">
                  <p className="text-2xl font-black tabular-nums text-[#C4161C]">{String(cd.minutes).padStart(2, "0")}</p>
                  <p className="text-[9px] tracking-wider text-[#7A4A33]/80 uppercase">Phút</p>
                </div>
                <span className="text-xl font-bold text-[#F26522]/40">:</span>
                <div className="text-center">
                  <p className="text-2xl font-black tabular-nums text-[#F26522]">{String(cd.seconds).padStart(2, "0")}</p>
                  <p className="text-[9px] tracking-wider text-[#F26522]/80 uppercase">Giây</p>
                </div>
              </div>
            </div>

            {/* Thông số */}
            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-[#F26522]/20 bg-[#FFF8F0] p-3.5">
                <p className="text-[10px] font-bold tracking-wider text-[#C4161C]/90 uppercase">
                  Tổng lượt bình chọn toàn quốc:
                </p>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="bg-gradient-to-r from-[#F26522] to-[#C4161C] bg-clip-text text-2xl font-black tabular-nums text-transparent sm:text-3xl">
                    {animatedVotes.toLocaleString("vi-VN")}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                    <TrendingUp className="h-3 w-3" /> Đang tăng
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-[#F26522]/20 bg-[#FFF8F0] p-3.5">
                <p className="text-[10px] font-bold tracking-wider text-[#C4161C]/90 uppercase">
                  Câu chuyện đã được duyệt:
                </p>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-2xl font-black tabular-nums text-[#C4161C] sm:text-3xl">
                    {animatedStories.toLocaleString("vi-VN")}
                  </span>
                  <span className="text-[10px] font-bold tracking-wider text-[#F26522]/90 uppercase">
                    Bài dự thi
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-[#F26522]/15 pt-3 font-mono text-[10px] text-[#7A4A33]/70">
            <span>MỖI TÀI KHOẢN 1 PHIẾU</span>
            <span className="font-bold text-[#F26522]">NĂM {year}</span>
          </div>
        </div>

        {/* ── Ô 3: THÔNG ĐIỆP BAN TỔ CHỨC + CON DẤU NHỎ ── */}
        <div className="relative overflow-hidden rounded-[28px] border border-[#F26522]/25 bg-white p-6 shadow-[0_14px_36px_rgba(193,73,26,0.10)] sm:p-8 md:col-span-12 lg:col-span-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-16 -left-16 h-80 w-80 rounded-full opacity-10 select-none"
            style={{
              background:
                "repeating-radial-gradient(circle at center, #F26522 0px, #F26522 2px, transparent 2px, transparent 18px)",
            }}
          />

          <div className="relative flex h-full flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold tracking-[0.2em] text-[#F26522] uppercase">
                Thông điệp Ban tổ chức
              </span>

              <blockquote className="mt-5 font-serif-display text-lg italic leading-relaxed text-[#3D1A0E] sm:text-xl">
                &ldquo;Mỗi câu chuyện được kể ra là một khó khăn đã vượt qua. Mỗi phiếu bình chọn là một lời động viên
                thiêng liêng gửi tới các em — thắp sáng ngọn lửa cống hiến của thế hệ trẻ trong kỷ nguyên vươn mình của
                dân tộc.&rdquo;
              </blockquote>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-[#F26522]/15 pt-4">
              <div>
                <p className="font-serif-display text-sm font-black text-[#C4161C] uppercase sm:text-base">
                  Ban Thanh niên Trường học
                </p>
                <p className="text-[10px] font-semibold text-[#F26522] sm:text-[11px]">
                  Cổng Thanh niên Trường học · Cổng bình chọn {year}
                </p>
              </div>

              <RedWaxSeal />
            </div>
          </div>
        </div>

        {/* ── Ô 4: MINIGAME TRUYỀN THÔNG SỐ ── */}
        <div className="relative overflow-hidden rounded-[28px] border border-[#F26522]/25 bg-white p-6 shadow-[0_14px_36px_rgba(193,73,26,0.10)] sm:p-8 md:col-span-12 lg:col-span-6">
          <div className="relative flex h-full flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#F26522]/30 bg-gradient-to-br from-[#FFDF7E] to-[#F26522] text-white">
                  <Gift className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold tracking-[0.18em] text-[#F26522] uppercase">
                    Vinh danh minigame
                  </span>
                  <h4 className="font-serif-display text-lg font-black text-[#C4161C] sm:text-xl">
                    Quà tặng truyền thông số
                  </h4>
                </div>
              </div>

              <p className="mt-4 text-xs leading-relaxed text-justify text-[#5B3A2A] sm:text-sm">
                {giftNote ??
                  "Câu chuyện nhận được nhiều sự đồng hành và bình chọn nhất sẽ nhận phần quà vinh danh trong minigame truyền thông của Cổng Thanh niên Trường học."}
              </p>
            </div>

            {/* Thẻ minh bạch */}
            <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-50 p-3.5">
              <div className="flex items-center gap-2 text-emerald-700">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-xs font-bold tracking-wider uppercase">Cơ chế bình chọn minh bạch</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-emerald-800/80">
                Mỗi tài khoản chỉ sở hữu duy nhất 1 phiếu bình chọn, có thể đổi phiếu trước khi cổng đóng. Dữ liệu ghi
                nhận công khai trực tiếp.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
