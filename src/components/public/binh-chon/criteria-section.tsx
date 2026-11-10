"use client";

import React from "react";
import { motion } from "framer-motion";
import { HeartHandshake, BookOpen, Flame, Award, CheckCircle2 } from "lucide-react";
import { TiltCard } from "./dong-son";
import { cn } from "@/lib/utils";

export interface CriteriaItem {
  id: string;
  num: string;
  title: string;
  subtitle: string;
  desc: string;
  icon: typeof HeartHandshake;
  highlights: string[];
}

export const CRITERIA: CriteriaItem[] = [
  {
    id: "dao-duc",
    num: "TIÊU CHÍ I",
    title: "Đạo đức tốt",
    subtitle: "Bản lĩnh chính trị & Tinh thần phụng sự",
    desc: "Hạnh kiểm tốt, sống có lý tưởng cao đẹp, gương mẫu với bạn bè. Tiên phong trong công tác Đoàn - Hội và các hoạt động tình nguyện vì cuộc sống cộng đồng.",
    icon: HeartHandshake,
    highlights: ["Hạnh kiểm Tốt cả năm học", "Tiên phong hoạt động tình nguyện", "Chấp hành tốt pháp luật & nội quy"],
  },
  {
    id: "hoc-tap",
    num: "TIÊU CHÍ II",
    title: "Học tập tốt",
    subtitle: "Khát vọng tri thức & Sáng tạo thời đại số",
    desc: "Chủ động, sáng tạo trong tiếp cận tri thức mới. Đạt học lực giỏi/xuất sắc, đạt thành tích cao trong các kỳ thi học sinh giỏi, nghiên cứu khoa học và sáng kiến kỹ thuật số.",
    icon: BookOpen,
    highlights: ["Học lực Giỏi / Xuất sắc", "Giải thưởng kỳ thi HSG / NCKH", "Ứng dụng công nghệ & chuyển đổi số"],
  },
  {
    id: "the-luc",
    num: "TIÊU CHÍ III",
    title: "Thể lực tốt",
    subtitle: "Rèn luyện thân thể & Lối sống văn minh",
    desc: "Thực hiện tốt phong trào 'Rèn luyện thân thể theo gương Bác Hồ vĩ đại', đạt chuẩn thể lực quốc gia, yêu thích thể thao, sống văn minh, năng động và an toàn.",
    icon: Flame,
    highlights: ["Đạt chuẩn đánh giá thể lực", "Tích cực thể thao học đường", "Lối sống văn minh, an toàn giao thông"],
  },
];

export function CriteriaSection() {
  return (
    <section className="relative mx-auto max-w-6xl px-4 pt-16 sm:pt-20">
      {/* Tiêu đề section */}
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 rounded-full border border-[#E5C07B]/40 bg-[#250609]/75 px-4 py-1.5 backdrop-blur-md shadow-xs"
        >
          <Award className="h-4 w-4 text-[#E5C07B]" />
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#FFE9A8]">
            Chuẩn mực danh hiệu quốc gia
          </span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="mt-4 font-serif-display text-2xl sm:text-4xl font-black text-white"
        >
          Tam Trụ Tinh Hoa &ldquo;
          <span className="bg-gradient-to-r from-[#FFF5D0] via-[#E5C07B] to-[#FFE29A] bg-clip-text text-transparent">
            Học sinh 3 tốt
          </span>
          &rdquo;
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mx-auto mt-3 max-w-2xl text-xs sm:text-sm leading-relaxed text-[#F3E5AB]/80"
        >
          Bộ 3 tiêu chí cốt lõi của danh hiệu &ldquo;Học sinh 3 tốt&rdquo; —
          tôn vinh học sinh THPT, TTGDNN-GDTX phát triển toàn diện về Đức, Trí, Thể.
        </motion.p>
      </div>

      {/* 3 Thẻ bài kính mờ 3D có hiệu ứng hover phát sáng vàng kim */}
      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        {CRITERIA.map((tc, idx) => (
          <motion.div
            key={tc.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 * idx }}
            className="h-full"
          >
            <TiltCard max={8} className="h-full">
              <div
                className={cn(
                  "group relative flex h-full flex-col overflow-hidden rounded-[24px] p-6 transition-all duration-500",
                  "border border-[#E5C07B]/30 bg-gradient-to-b from-[#2A060A]/85 via-[#1A0306]/85 to-[#0D0103]/95 backdrop-blur-2xl",
                  "shadow-[0_15px_35px_rgba(0,0,0,0.65)] hover:border-[#E5C07B]/70 hover:shadow-[0_0_40px_rgba(229,192,123,0.35)]"
                )}
              >
                {/* Vệt sáng viền vàng kim trên cùng */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#FFE9A8]/80 to-transparent" />

                {/* Vệt sáng vàng kim theo con trỏ khi rê chuột */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background:
                      "radial-gradient(350px circle at var(--gx, 50%) var(--gy, 50%), rgba(229,192,123,0.2), transparent 70%)",
                  }}
                />

                {/* Header card: Số thứ tự tiêu chí & Biểu tượng mạ vàng */}
                <div className="relative flex items-center justify-between">
                  <span className="rounded-full border border-[#E5C07B]/40 bg-[#3B070D]/60 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-[#FFE9A8]">
                    {tc.num}
                  </span>
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5C07B]/50 bg-gradient-to-br from-[#FFE9A8] via-[#E5C07B] to-[#9C7728] text-[#3B070D] shadow-md transition-transform duration-300 group-hover:scale-110">
                    <tc.icon className="h-6 w-6 drop-shadow-xs" />
                  </div>
                </div>

                {/* Tiêu đề & phụ đề */}
                <div className="relative mt-5">
                  <h3 className="font-serif-display text-xl sm:text-2xl font-black text-white group-hover:text-[#FFE9A8] transition-colors">
                    {tc.title}
                  </h3>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-[#E5C07B]/90">
                    {tc.subtitle}
                  </p>
                </div>

                {/* Nội dung mô tả */}
                <p className="relative mt-3 text-xs sm:text-sm leading-relaxed text-[#F3E5AB]/85 text-justify">
                  {tc.desc}
                </p>

                {/* Danh sách gạch đầu dòng tiêu biểu */}
                <div className="relative mt-5 space-y-2 border-t border-[#E5C07B]/20 pt-4 text-[11px] sm:text-xs">
                  {tc.highlights.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 text-[#FFE9A8]/90">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#E5C07B]" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            </TiltCard>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
