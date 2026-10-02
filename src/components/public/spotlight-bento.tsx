"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Eye } from "lucide-react";
import { formatNumber, cn } from "@/lib/utils";
import { PhotoPlaceholder } from "@/components/ui/photo-placeholder";
import type { PublishedPost } from "@/types";

/**
 * 🫧 TIN TIÊU ĐIỂM — Premium Digital Portal (The Verge / Apple News style)
 *
 * - Nền slate-50 + quầng sáng radial xanh da trời phía sau.
 * - Tiêu đề serif Xanh than + underline gradient xanh dương → cyan.
 * - Khối 01: bài lớn bên trái (col-span-3) — ảnh phủ kín, overlay đen từ dưới,
 *   số watermark "01" text-9xl opacity-10 cắt lẹm góc, tag kính mờ chấm nhấp nháy,
 *   tiêu đề serif hover cyan.
 * - Khối 02: bài vừa trên cùng bên phải (col-span-2) — cùng ngôn ngữ thị giác.
 * - Khối 03–06: danh sách tương tác không hộp — border-b mảnh, số mảnh xám →
 *   tag + tiêu đề 2 dòng → thumbnail vuông bo góc; hover row loang gradient
 *   via-blue-50/50 + thumbnail phóng 105% (Framer Motion).
 */

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" as const } },
};

/** Khối 01 & 02 — thẻ ảnh phủ kín với overlay + watermark số thứ tự */
function SpotlightHero({
  post,
  index,
  className,
}: {
  post: PublishedPost;
  index: number;
  className?: string;
}) {
  return (
    <motion.article
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      className={cn(
        "group relative overflow-hidden rounded-3xl shadow-xl shadow-blue-900/10 ring-1 ring-slate-900/5",
        className
      )}
    >
      <Link href={`/tin-tuc/${post.slug}`} className="absolute inset-0 z-20">
        <span className="sr-only">{post.title}</span>
      </Link>

      {/* Ảnh nền phủ kín — phóng nhẹ khi hover */}
      <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-105">
        <PhotoPlaceholder
          seed={post.coverSeed}
          src={post.coverDataUrl}
          className="h-full w-full"
          icon={false}
        />
      </div>

      {/* Overlay đen loang từ đáy lên */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-transparent" />

      {/* Số watermark cắt lẹm mép phải */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-3 -top-7 z-10 select-none font-serif-display text-9xl font-black leading-none text-white opacity-10"
      >
        {String(index).padStart(2, "0")}
      </span>

      {/* Nội dung neo đáy */}
      <div className="relative z-10 flex h-full flex-col justify-end p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/20 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-md">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" />
            {post.categoryNames[0] ?? "Tin tức"}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-light text-white/70">
            <Eye className="h-3 w-3" /> {formatNumber(post.viewCount)} lượt xem
          </span>
        </div>
        <h3
          className={cn(
            "mt-3 font-serif-display font-bold leading-snug text-white transition-colors duration-300 group-hover:text-cyan-200",
            index === 1 ? "text-2xl sm:text-3xl lg:text-[2.5rem]" : "text-xl sm:text-2xl"
          )}
        >
          {post.title}
        </h3>
        {index === 1 ? (
          <p className="mt-2.5 hidden line-clamp-2 max-w-xl text-sm font-light leading-relaxed text-white/70 sm:block">
            {post.excerpt}
          </p>
        ) : null}
      </div>
    </motion.article>
  );
}

/** Khối 03–06 — dòng danh sách tương tác, không hộp trắng */
function SpotlightRow({ post, index }: { post: PublishedPost; index: number }) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
      whileHover="hover"
      className="group border-b border-slate-200 last:border-b-0"
    >
      <Link
        href={`/tin-tuc/${post.slug}`}
        className="relative flex items-center gap-4 overflow-hidden py-4 pl-2 pr-2 sm:gap-5 sm:pl-3"
      >
        {/* Loang gradient khi hover dòng */}
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-blue-50/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Số mảnh xám — sáng xanh khi hover */}
        <span className="relative w-8 shrink-0 select-none text-right font-serif-display text-xl font-light tabular-nums text-slate-300 transition-colors duration-300 group-hover:text-blue-600">
          {String(index).padStart(2, "0")}
        </span>

        <div className="relative min-w-0 flex-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600/90">
            {post.categoryNames[0] ?? "Tin tức"}
          </span>
          <h4 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-slate-900 transition-colors duration-300 group-hover:text-blue-700">
            {post.title}
          </h4>
        </div>

        {/* Thumbnail phóng 105% qua Framer Motion */}
        <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl ring-1 ring-slate-900/5 sm:h-[4.5rem] sm:w-24">
          <motion.div
            variants={{ hover: { scale: 1.05 } }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="h-full w-full"
          >
            <PhotoPlaceholder
              seed={post.coverSeed}
              src={post.coverDataUrl}
              className="h-full w-full"
              icon={false}
            />
          </motion.div>
        </div>
      </Link>
    </motion.div>
  );
}

export function SpotlightBento({ posts }: { posts: PublishedPost[] }) {
  if (posts.length === 0) return null;
  const [hero, second, ...rest] = posts;
  const rows = rest.slice(0, 4);

  return (
    <section aria-label="Tin tiêu điểm" className="relative mt-14 overflow-hidden bg-slate-50 py-12 sm:py-14">
      {/* Quầng sáng radial xanh da trời */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-140px] h-[420px] w-[840px] -translate-x-1/2 rounded-full bg-sky-300/25 blur-[120px]"
      />

      <div className="relative mx-auto max-w-7xl px-4">
        {/* ===== Header — Serif Xanh than + underline gradient xanh–cyan ===== */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-600">
            Truyền thông phong trào
          </p>
          <h2 className="mt-1.5 font-serif-display text-3xl font-bold tracking-tight text-slate-900">
            Tin tiêu điểm
          </h2>
          <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500" />
        </div>

        {/* ===== Grid: Khối 01 lớn trái · Khối 02 + danh sách 03–06 phải ===== */}
        <div className="mt-9 grid gap-6 lg:grid-cols-5 lg:gap-7">
          <SpotlightHero
            post={hero}
            index={1}
            className="min-h-[380px] sm:min-h-[460px] lg:col-span-3 lg:min-h-[560px]"
          />
          <div className="flex flex-col gap-6 lg:col-span-2">
            <SpotlightHero post={second} index={2} className="min-h-[250px] sm:min-h-[300px]" />
            {rows.length > 0 ? <div className="lg:flex-1">{rows.map((p, i) => <SpotlightRow key={p.id} post={p} index={i + 3} />)}</div> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
