"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, X, ZoomIn } from "lucide-react";
import type { PublishedPost } from "@/types";

/**
 * 🌌 STORY FLOW — Dòng Chảy Câu Chuyện Bất Tận (Horizontal Storytelling Flow)
 *
 * Bản tin HSSV — NGHIÊN CỨU KHOA HỌC (full-bleed ultra-wide):
 *   - Poster nghiên cứu LỚN dẫn dắt + các poster vuông/chữ nhật vệ tinh lệch nhịp.
 *   - Đường sóng ánh sáng uốn lượn chạy xuyên suốt dưới chân các tác phẩm —
 *     như đang lật giở từng trang truyện tranh khổng lồ.
 *
 * Không gian: bụi sao lấp lánh + các đường cong ánh sáng dẫn đường xuyên section.
 * Ẩn toàn bộ khi chưa có bài viết.
 */

/* Bụi sao lấp lánh — vị trí seed cứng (tránh lệch hydration) */
const STARS = [
  { top: "7%", left: "11%", d: "0s", s: 2 },
  { top: "15%", left: "78%", d: "1.2s", s: 3 },
  { top: "33%", left: "5%", d: "2.1s", s: 2 },
  { top: "27%", left: "56%", d: "0.7s", s: 2 },
  { top: "51%", left: "88%", d: "1.6s", s: 3 },
  { top: "63%", left: "21%", d: "2.5s", s: 2 },
  { top: "75%", left: "67%", d: "0.4s", s: 2 },
  { top: "88%", left: "41%", d: "1.9s", s: 3 },
  { top: "44%", left: "35%", d: "2.8s", s: 2 },
  { top: "93%", left: "90%", d: "1.1s", s: 2 },
];

/* ===== Tag kim loại khắc mã số ấn phẩm ===== */
function MetalTag({ code }: { code: string }) {
  return (
    <span className="absolute -top-3 left-5 z-20 inline-flex items-center rounded-md bg-gradient-to-b from-slate-100 via-slate-300 to-slate-500 px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.18em] text-slate-800 shadow-[0_4px_12px_rgba(2,6,23,0.6),inset_0_1px_0_rgba(255,255,255,0.85)] ring-1 ring-white/40">
      {code}
    </span>
  );
}

/* ===== Đường kẻ mảnh có chấm sáng quét (nền tối) ===== */
function ScanLine({ mirror = false }: { mirror?: boolean }) {
  return (
    <span
      aria-hidden
      className={`relative hidden h-px flex-1 sm:block ${
        mirror
          ? "bg-gradient-to-l from-transparent via-slate-600/60 to-slate-600/60"
          : "bg-gradient-to-r from-transparent via-slate-600/60 to-slate-600/60"
      }`}
    >
      <span className="scan-dot" style={mirror ? { animationDelay: "1.7s" } : undefined} />
    </span>
  );
}

function SectionTitle({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="mx-auto flex w-full max-w-7xl items-center gap-4 px-5 sm:gap-6 sm:px-8"
    >
      <ScanLine />
      <div className="text-center">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-300/80">{eyebrow}</p>
        <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h2>
        {sub ? <p className="mt-1.5 hidden text-xs font-light text-slate-400 sm:block">{sub}</p> : null}
      </div>
      <ScanLine mirror />
    </motion.div>
  );
}

/* Ảnh bìa bài đăng; bài chưa có ảnh → nền gradient khắc tiêu đề thay ảnh mẫu ngoài */
function PosterFallback({ title, tall = false }: { title: string; tall?: boolean }) {
  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-600 via-[#0a0f24] to-cyan-500 ${
        tall ? "aspect-[16/10]" : ""
      }`}
    >
      <span className="line-clamp-3 px-6 text-center font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-100/90">
        {title}
      </span>
    </div>
  );
}

/* ================================================================
   BẢN TIN HSSV: NGHIÊN CỨU KHOA HỌC (ultra-wide flow)
   ================================================================ */
function ResearchFlow({ posts }: { posts: PublishedPost[] }) {
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(false);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [zoom]);

  const featured = posts[0];
  const satellites = posts.slice(1, 4);
  const featuredDate = (featured.publishedAt ?? featured.createdAt).slice(0, 10).split("-").reverse().join(".");
  const satShape = ["aspect-square w-56 sm:w-64", "aspect-[4/5] w-48 sm:w-56", "aspect-square w-52 sm:w-60"];
  const satOffset = ["-translate-y-10 sm:-translate-y-16", "translate-y-2", "-translate-y-5 sm:-translate-y-9"];

  return (
    <div className="relative">
      <SectionTitle
        eyebrow="#RESEARCH • ẤN PHẨM NGHIÊN CỨU"
        title="Bản tin HSSV: Nghiên cứu khoa học"
        sub="Lật giở từng trang truyện tranh khổng lồ — kéo ngang để khám phá"
      />

      {/* Dải ultra-wide vươn dài hai bên — cuộn ngang mượt */}
      <div className="scrollbar-hide mt-4 overflow-x-auto pb-8 pl-5 pt-6 sm:pl-8">
        <div className="relative flex min-w-max items-end gap-8 pr-8 lg:gap-12">
          {/* Đường sóng ánh sáng dưới chân các tác phẩm */}
          <svg
            aria-hidden
            className="pointer-events-none absolute bottom-2 left-0 h-28 w-full"
            viewBox="0 0 1600 120"
            preserveAspectRatio="none"
            fill="none"
          >
            <defs>
              <linearGradient id="storyWaveGrad" x1="0" y1="0" x2="1600" y2="0" gradientUnits="userSpaceOnUse">
                <stop stopColor="#22d3ee" stopOpacity="0" />
                <stop offset="0.2" stopColor="#22d3ee" stopOpacity="0.9" />
                <stop offset="0.55" stopColor="#3b82f6" stopOpacity="0.85" />
                <stop offset="0.85" stopColor="#6366f1" stopOpacity="0.9" />
                <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Sóng phụ mờ */}
            <path
              d="M -20 84 C 260 40, 520 110, 820 66 C 1060 34, 1320 42, 1620 62"
              stroke="#67e8f9"
              strokeOpacity="0.28"
              strokeWidth="1.5"
            />
            {/* Sóng chính phát glow — vẽ dần khi reveal */}
            <motion.path
              d="M -20 96 C 260 30, 520 118, 820 74 C 1060 40, 1320 34, 1620 70"
              strokeWidth="2.5"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 2, ease: "easeInOut" }}
              style={{
                stroke: "url(#storyWaveGrad)",
                filter: "drop-shadow(0 0 6px rgba(34,211,238,0.7))",
              }}
            />
            {/* Bụi sáng chạy dọc sóng */}
            <path
              d="M -20 96 C 260 30, 520 118, 820 74 C 1060 40, 1320 34, 1620 70"
              stroke="#ecfeff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="3 70"
              className="curve-dust"
              style={{ animationDuration: "20s" }}
            />
            {[
              { cx: 300, cy: 52, r: 3, d: "0s" },
              { cx: 700, cy: 88, r: 2.5, d: "0.9s" },
              { cx: 1100, cy: 44, r: 3.5, d: "1.7s" },
              { cx: 1460, cy: 48, r: 2.5, d: "2.3s" },
            ].map((p) => (
              <circle
                key={p.cx}
                cx={p.cx}
                cy={p.cy}
                r={p.r}
                fill="#22d3ee"
                className="animate-pulse"
                style={{ animationDelay: p.d, filter: "drop-shadow(0 0 6px rgba(34,211,238,0.95))" }}
              />
            ))}
          </svg>

          {/* POSTER LỚN dẫn dắt dòng chảy */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="group relative w-[min(86vw,680px)] shrink-0"
          >
            <span
              aria-hidden
              className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-r from-blue-600 via-cyan-400 to-indigo-500 opacity-30 blur-2xl transition-opacity duration-500 group-hover:opacity-50"
            />
            <button
              type="button"
              onClick={() => setZoom(true)}
              aria-label={`Phóng to poster: ${featured.title}`}
              className="relative block w-full cursor-zoom-in overflow-hidden rounded-[2rem] border border-white/25 shadow-2xl shadow-black/50"
            >
              {featured.coverDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- ảnh data URL do đơn vị tải lên
                <img src={featured.coverDataUrl} alt={featured.title} className="aspect-[16/10] w-full object-cover" />
              ) : (
                <PosterFallback title={featured.title} tall />
              )}
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-slate-950/10" />
              <span className="pointer-events-none absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 scale-75 items-center justify-center rounded-full border border-white/30 bg-slate-950/50 opacity-0 backdrop-blur-md transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
                <ZoomIn className="h-6 w-6 text-cyan-200" strokeWidth={1.5} />
              </span>
              {/* Thanh tiêu đề kính dưới chân poster */}
              <span className="absolute inset-x-4 bottom-4 flex items-center gap-3 rounded-2xl border border-white/15 bg-slate-950/65 px-4 py-3 backdrop-blur-md">
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-bold text-white">{featured.title}</span>
                  <span className="mt-0.5 block font-mono text-[9.5px] uppercase tracking-[0.2em] text-cyan-200/80">
                    {featured.authorOrgUnitName} • {featuredDate}
                  </span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-cyan-100">
                  <ZoomIn className="h-3 w-3" /> Phóng to
                </span>
              </span>
            </button>
            <MetalTag code="#POSTER.01" />
          </motion.div>

          {/* POSTER VỆ TINH — vuông / chữ nhật, lệch nhịp như trang sách */}
          {satellites.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.65, delay: 0.12 * (i + 1), ease: "easeOut" }}
              className={`group relative shrink-0 ${satShape[i]} ${satOffset[i]}`}
            >
              <span
                aria-hidden
                className={`absolute -inset-3 rounded-[2rem] bg-gradient-to-br opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-50 ${
                  i % 2 === 0 ? "from-cyan-400 to-blue-600" : "from-indigo-500 to-cyan-400"
                }`}
              />
              <Link
                href={`/tin-tuc/${p.slug}`}
                className="relative block h-full w-full overflow-hidden rounded-3xl border border-white/25 shadow-2xl shadow-black/50"
              >
                {p.coverDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- ảnh data URL do đơn vị tải lên
                  <img
                    src={p.coverDataUrl}
                    alt={p.title}
                    className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                ) : (
                  <PosterFallback title={p.title} />
                )}
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                <span className="absolute inset-x-3 bottom-3 rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 backdrop-blur-md">
                  <span className="line-clamp-2 text-[11.5px] font-semibold leading-snug text-white">{p.title}</span>
                </span>
              </Link>
              <MetalTag code={`#POSTER.0${i + 2}`} />
            </motion.div>
          ))}

          {/* CTA khép dòng chảy */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="relative flex shrink-0 items-center pb-10"
          >
            <Link
              href={`/tin-tuc?q=${encodeURIComponent("Nghiên cứu khoa học")}`}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.07] px-6 py-3.5 text-sm font-semibold text-cyan-100 backdrop-blur-md transition-all duration-300 hover:border-cyan-300/50 hover:bg-white/[0.12] hover:shadow-[0_0_30px_rgba(34,211,238,0.25)]"
            >
              Xem tất cả ấn phẩm <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </div>

      {/* LIGHTBOX phóng to poster lớn */}
      <AnimatePresence>
        {zoom ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[95] flex items-center justify-center bg-[#050914]/95 p-4 backdrop-blur-md"
            onClick={() => setZoom(false)}
          >
            <button
              type="button"
              aria-label="Đóng xem poster"
              onClick={() => setZoom(false)}
              className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
            <motion.div
              key={featured.id}
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[84vh] w-auto max-w-full rounded-2xl border border-white/20 object-contain shadow-2xl"
            >
              {featured.coverDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- ảnh data URL do đơn vị tải lên
                <img src={featured.coverDataUrl} alt={featured.title} className="max-h-[84vh] w-auto max-w-full rounded-2xl object-contain" />
              ) : (
                <div className="flex h-[60vh] w-[80vw] max-w-3xl items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-[#0a0f24] to-cyan-500">
                  <span className="px-8 text-center font-mono text-sm font-bold uppercase tracking-[0.18em] text-cyan-100/90">
                    {featured.title}
                  </span>
                </div>
              )}
            </motion.div>
            <p className="absolute bottom-5 left-1/2 w-full max-w-2xl -translate-x-1/2 truncate px-6 text-center font-mono text-[10.5px] uppercase tracking-[0.2em] text-slate-400">
              #POSTER.01 — {featured.title}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* ================================================================
   SECTION CHÍNH — một cuộc hành trình thị giác kéo dài theo ngang
   ================================================================ */
export function StoryFlow({ posts }: { posts: PublishedPost[] }) {
  if (posts.length === 0) return null;

  return (
    <section aria-label="Dòng chảy ấn phẩm TNTH" className="relative overflow-hidden border-y border-white/5 bg-[#0a0f24] py-16 sm:py-20">
      {/* Ánh sáng radian tạo chiều sâu */}
      <div aria-hidden className="pointer-events-none absolute -left-40 top-24 h-96 w-96 rounded-full bg-blue-600/15 blur-[120px]" />
      <div aria-hidden className="pointer-events-none absolute -right-40 top-[55%] h-[28rem] w-[28rem] rounded-full bg-cyan-500/10 blur-[120px]" />
      <div aria-hidden className="pointer-events-none absolute left-1/3 top-[78%] h-80 w-80 rounded-full bg-indigo-600/10 blur-[110px]" />

      {/* Bụi sao lấp lánh */}
      {STARS.map((st) => (
        <span
          key={`${st.top}-${st.left}`}
          aria-hidden
          className="absolute animate-pulse rounded-full bg-cyan-200"
          style={{ top: st.top, left: st.left, width: st.s, height: st.s, animationDelay: st.d, boxShadow: "0 0 8px rgba(165,243,252,0.9)" }}
        />
      ))}

      {/* Đường cong ánh sáng dẫn đường */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 1440 1600"
        preserveAspectRatio="none"
        fill="none"
      >
        <path d="M -40 430 C 320 300, 700 570, 1480 380" stroke="#22d3ee" strokeOpacity="0.12" strokeWidth="1.5" />
        <path
          d="M -40 1150 C 420 1000, 860 1290, 1480 1060"
          stroke="#a5f3fc"
          strokeOpacity="0.4"
          strokeWidth="1.5"
          strokeDasharray="2 90"
          className="curve-dust"
          style={{ animationDuration: "26s" }}
        />
      </svg>

      <div className="relative">
        <ResearchFlow posts={posts} />
      </div>
    </section>
  );
}
