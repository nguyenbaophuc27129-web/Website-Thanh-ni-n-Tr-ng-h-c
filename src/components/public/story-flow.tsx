"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode } from "swiper/modules";
import "swiper/css";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  HeartHandshake,
  Landmark,
  Recycle,
  Rocket,
  ShieldCheck,
  Star,
  Trophy,
  X,
  ZoomIn,
  type LucideIcon,
} from "lucide-react";
import type { PublishedPost } from "@/types";
import { CountUp } from "@/components/public/reveal";

/**
 * 🌌 STORY FLOW — Dòng Chảy Câu Chuyện Bất Tận (Horizontal Storytelling Flow)
 *
 * Một hành trình thị giác ngang liền mạch trên nền đêm #0a0f24 (đồng bộ khối
 * "Mỗi ngày một tin tốt"), gồm 2 khu vực nối tiếp:
 *
 * 1️⃣ DÒNG CHẢY INFOGRAPHIC "Những con số biết nói":
 *    - Swiper freeMode + grabCursor + loop → dải cuộn ngang vô tận.
 *    - Thẻ VUÔNG 1:1 (The Square Canvas): khung kính siêu mỏng border-white/30
 *      backdrop-blur-md, bên trong là "bức ảnh" ấn phẩm infographic (DataPoster).
 *    - Tag kim loại khắc mã [#DATA.01] góc trên, font Mono.
 *    - Hover: nghiêng nhẹ 3D + ambient glow rực sau thẻ + nút kính lúp giữa tâm
 *      → click mở Lightbox phóng to ấn phẩm.
 *
 * 2️⃣ BẢN TIN HSSV — NGHIÊN CỨU KHOA HỌC (full-bleed ultra-wide):
 *    - Poster nghiên cứu LỚN dẫn dắt + các poster vuông/chữ nhật vệ tinh lệch nhịp.
 *    - Đường sóng ánh sáng uốn lượn chạy xuyên suốt dưới chân các tác phẩm —
 *      như đang lật giở từng trang truyện tranh khổng lồ.
 *
 * Không gian: bụi sao lấp lánh + các đường cong ánh sáng dẫn đường xuyên section.
 */

/* ===== Dữ liệu ấn phẩm infographic ===== */
type DataNode = {
  code: string;
  icon: LucideIcon;
  grad: string;
  value: number;
  suffix: string;
  label: string;
  href: string;
};

const DATA_NODES: DataNode[] = [
  { code: "#DATA.01", icon: Rocket, grad: "from-blue-500 to-cyan-400", value: 5210, suffix: "", label: "Lượt truy cập Cổng TNTH ngay ngày đầu vận hành", href: "/tin-tuc/cong-thanh-nien-truong-hoc-chinh-thuc-van-hanh" },
  { code: "#DATA.02", icon: Trophy, grad: "from-amber-400 to-orange-500", value: 1200, suffix: "", label: "Thí sinh dự Hội thi Học sinh 3 tốt cấp tỉnh", href: "/tin-tuc/hoi-thi-hoc-sinh-3-tot-cap-tinh-2026-binh-duong" },
  { code: "#DATA.03", icon: ShieldCheck, grad: "from-cyan-500 to-blue-600", value: 50000, suffix: "", label: "Học sinh hoàn thành khoá Kỹ năng số chống lừa đảo", href: "/tin-tuc/50-nghin-hoc-sinh-khoa-ky-nang-so-chong-lua-dao" },
  { code: "#DATA.04", icon: HeartHandshake, grad: "from-violet-500 to-indigo-500", value: 3500, suffix: "", label: "Tình nguyện viên trong mùa Tiếp sức mùa thi", href: "/tin-tuc/nhin-lai-tiep-suc-mua-thi-2026" },
  { code: "#DATA.05", icon: Recycle, grad: "from-emerald-500 to-teal-500", value: 500, suffix: " kg", label: "Rác thải nhựa được thu gom Chủ nhật xanh", href: "/tin-tuc/chu-nhat-xanh-tuoi-tre-hiep-thanh-500kg-rac-thai-nhua" },
  { code: "#DATA.06", icon: Star, grad: "from-blue-600 to-indigo-500", value: 95, suffix: " năm", label: "Lịch sử vẻ vang Đoàn TNCS Hồ Chí Minh", href: "/tin-tuc/95-nam-ngay-thanh-lap-doan-tncs-ho-chi-minh" },
  { code: "#DATA.07", icon: Landmark, grad: "from-indigo-500 to-blue-600", value: 28, suffix: "", label: "Đơn vị Đoàn trường cùng vận hành cổng trên toàn quốc", href: "/gioi-thieu" },
];

/* Cột dữ liệu trang trí trên chân ấn phẩm */
const BAR_HEIGHTS = [38, 62, 84, 52];

/* Ảnh mẫu cho poster nghiên cứu khi bài chưa có ảnh bìa */
const FALLBACKS = [
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=1600&auto=format&fit=crop",
];

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

const pad2 = (n: number) => String(n).padStart(2, "0");

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

/* ===== BỨC ẢNH INFOGRAPHIC (nội dung thẻ vuông) ===== */
function DataPoster({ node, large = false }: { node: DataNode; large?: boolean }) {
  return (
    <div className="relative flex h-full w-full flex-col justify-between overflow-hidden bg-[#0a0f24] p-5 sm:p-6">
      {/* Sắc màu ấn phẩm */}
      <span aria-hidden className={`absolute inset-0 bg-gradient-to-br opacity-20 ${node.grad}`} />
      <span aria-hidden className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-cyan-400/20 blur-3xl" />
      <span aria-hidden className={`absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-gradient-to-br opacity-30 blur-3xl ${node.grad}`} />
      {/* Lưới kỹ thuật */}
      <span
        aria-hidden
        className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(to_right,#94a3b8_1px,transparent_1px),linear-gradient(to_bottom,#94a3b8_1px,transparent_1px)] [background-size:26px_26px]"
      />
      {/* Vòng tròn dữ liệu */}
      <span aria-hidden className="absolute right-6 top-16 h-24 w-24 rounded-full border border-white/10" />
      <span aria-hidden className="absolute right-12 top-24 h-24 w-24 rounded-full border border-cyan-300/20" />

      {/* Đầu ấn phẩm */}
      <div className="relative flex items-start justify-between">
        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg ring-1 ring-white/25 ${node.grad}`}>
          <node.icon className={large ? "h-6 w-6" : "h-5 w-5"} strokeWidth={1.75} />
        </span>
        <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.24em] text-cyan-200/70">
          TNTH • 09.2026
        </span>
      </div>

      {/* Số liệu trung tâm */}
      <div className="relative">
        <p className={`font-mono font-black leading-none tracking-tight ${large ? "text-6xl sm:text-7xl" : "text-[2.35rem]"}`}>
          <span className={`bg-gradient-to-br bg-clip-text text-transparent ${node.grad}`}>
            <CountUp value={node.value} suffix={node.suffix} />
          </span>
        </p>
        <p className={`mt-3 font-medium leading-snug text-slate-200 ${large ? "max-w-md text-lg" : "line-clamp-2 max-w-[26ch] text-[12.5px]"}`}>
          {node.label}
        </p>
      </div>

      {/* Chân ấn phẩm — cột dữ liệu + nguồn */}
      <div className="relative flex items-end justify-between gap-4">
        <div className="flex h-12 items-end gap-1.5">
          {BAR_HEIGHTS.map((h, i) => (
            <span key={i} style={{ height: `${h}%` }} className={`w-2.5 rounded-sm bg-gradient-to-t opacity-70 ${node.grad}`} />
          ))}
        </div>
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">Nguồn: Cổng TNTH</span>
      </div>
    </div>
  );
}

/* ===== THẺ VUÔNG 1:1 — nghiêng 3D khi hover, click mở lightbox ===== */
function PosterCard({ node, onZoom }: { node: DataNode; onZoom: () => void }) {
  return (
    <motion.article
      whileHover={{ rotateX: -4, rotateY: 6, y: -8, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 240, damping: 18 }}
      style={{ transformPerspective: 900 }}
      onClick={onZoom}
      className="group relative aspect-square w-[272px] shrink-0 cursor-zoom-in sm:w-[320px] lg:w-[356px]"
    >
      {/* Ambient glow tỏa sau thẻ */}
      <span
        aria-hidden
        className={`absolute -inset-4 rounded-[2.75rem] bg-gradient-to-br opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-60 ${node.grad}`}
      />
      {/* Khung kính siêu mỏng */}
      <div className="relative h-full w-full rounded-3xl border border-white/30 bg-white/[0.06] p-2.5 shadow-2xl shadow-black/40 backdrop-blur-md">
        <div className="h-full w-full overflow-hidden rounded-[1.15rem]">
          <DataPoster node={node} />
        </div>
        {/* Nút kính lúp trung tâm — Phóng to xem chi tiết */}
        <span className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 scale-75 items-center justify-center rounded-full border border-white/30 bg-slate-950/50 opacity-0 backdrop-blur-md transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
          <ZoomIn className="h-6 w-6 text-cyan-200" strokeWidth={1.5} />
        </span>
      </div>
      <MetalTag code={node.code} />
    </motion.article>
  );
}

/* ================================================================
   KHU VỰC 2 — BẢN TIN HSSV: NGHIÊN CỨU KHOA HỌC (ultra-wide flow)
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

  if (posts.length === 0) return null;
  const featured = posts[0];
  const satellites = posts.slice(1, 4);
  const featuredSrc = featured.coverDataUrl ?? FALLBACKS[0];
  const featuredDate = (featured.publishedAt ?? featured.createdAt).slice(0, 10).split("-").reverse().join(".");
  const satShape = ["aspect-square w-56 sm:w-64", "aspect-[4/5] w-48 sm:w-56", "aspect-square w-52 sm:w-60"];
  const satOffset = ["-translate-y-10 sm:-translate-y-16", "translate-y-2", "-translate-y-5 sm:-translate-y-9"];

  return (
    <div className="relative mt-24">
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
              {/* eslint-disable-next-line @next/next/no-img-element -- ảnh data URL bài đăng + ảnh mẫu ngoài */}
              <img src={featuredSrc} alt={featured.title} className="aspect-[16/10] w-full object-cover" />
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
                {/* eslint-disable-next-line @next/next/no-img-element -- ảnh data URL bài đăng + ảnh mẫu ngoài */}
                <img
                  src={p.coverDataUrl ?? FALLBACKS[(i + 1) % FALLBACKS.length]}
                  alt={p.title}
                  className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />
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
            <motion.img
              key={featured.id}
              src={featuredSrc}
              alt={featured.title}
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[84vh] w-auto max-w-full rounded-2xl border border-white/20 object-contain shadow-2xl"
            />
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
  const [zoomIdx, setZoomIdx] = useState<number | null>(null);
  const open = zoomIdx !== null;

  const close = useCallback(() => setZoomIdx(null), []);
  const step = useCallback(
    (dir: 1 | -1) =>
      setZoomIdx((i) => (i === null ? 0 : (i + dir + DATA_NODES.length) % DATA_NODES.length)),
    []
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close, step]);

  const zoomNode = zoomIdx !== null ? DATA_NODES[zoomIdx] : null;

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

      {/* Đường cong ánh sáng dẫn đường xuyên suốt 2 khu vực */}
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
        {/* ===== KHU VỰC 1 — DÒNG CHẢY INFOGRAPHIC ===== */}
        <SectionTitle
          eyebrow="#TELEMETRY • ẤN PHẨM SỐ LIỆU"
          title="Những con số biết nói"
          sub="Kéo để lật bộ sưu tập ấn phẩm infographic — bấm để phóng to"
        />
        <div className="mt-2 pl-5 pt-4 sm:pl-8">
          <Swiper
            modules={[FreeMode]}
            freeMode={{ enabled: true, momentumBounce: false }}
            grabCursor
            slidesPerView="auto"
            spaceBetween={26}
            loop
            loopAdditionalSlides={2}
          >
            {DATA_NODES.map((n, i) => (
              <SwiperSlide key={n.code} className="!w-auto">
                <PosterCard node={n} onZoom={() => setZoomIdx(i)} />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        {/* ===== KHU VỰC 2 — BẢN TIN HSSV: NGHIÊN CỨU KHOA HỌC ===== */}
        <ResearchFlow posts={posts} />
      </div>

      {/* ===== LIGHTBOX ấn phẩm infographic ===== */}
      <AnimatePresence>
        {zoomNode ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[95] flex flex-col items-center justify-center bg-[#050914]/95 p-4 backdrop-blur-md"
            onClick={close}
          >
            <button
              type="button"
              aria-label="Đóng xem ấn phẩm"
              onClick={close}
              className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Ấn phẩm trước"
              onClick={(e) => {
                e.stopPropagation();
                step(-1);
              }}
              className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition-colors hover:bg-white/20 sm:left-6"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Ấn phẩm sau"
              onClick={(e) => {
                e.stopPropagation();
                step(1);
              }}
              className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-6"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <motion.div
              key={zoomNode.code}
              initial={{ scale: 0.93, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative aspect-square w-full max-w-[460px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-full w-full rounded-3xl border border-white/25 bg-white/[0.06] p-2.5 shadow-2xl backdrop-blur-md">
                <div className="h-full w-full overflow-hidden rounded-[1.15rem]">
                  <DataPoster node={zoomNode} large />
                </div>
              </div>
              <MetalTag code={zoomNode.code} />
            </motion.div>

            <Link
              href={zoomNode.href}
              onClick={close}
              className="relative mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300 transition-colors hover:text-cyan-200"
            >
              Đọc bài viết gốc <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <p className="relative mt-2 font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500">
              {pad2((zoomIdx ?? 0) + 1)} / {pad2(DATA_NODES.length)} ẤN PHẨM
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
