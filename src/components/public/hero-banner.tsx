"use client";

import Link from "next/link";
import { ArrowRight, Flame, Sparkles, Star } from "lucide-react";
import type { PublishedPost } from "@/types";
import { PhotoPlaceholder } from "@/components/ui/photo-placeholder";
import { formatDate, formatNumber } from "@/lib/utils";

/**
 * HERO — "High-tech Digital Portal" (xanh đen chiều sâu + ánh sáng môi trường)
 *
 * - Nền Deep Midnight Blue + 3 vệt sáng Cyan/Electric Blue trôi chậm (ambient glow)
 *   + lưới công nghệ mờ dẫn hướng nhìn vào trung tâm.
 * - Split cinematic: trái = tag kính mờ chữ vàng, tiêu đề gradient, CTA gradient
 *   có shimmer trượt sáng khi hover; phải = ảnh rounded-3xl bóng glow, hover phóng
 *   nhẹ, badge "Cập nhật trực tiếp" chấm cyan nhấp nháy.
 * - Dải ticker kính mờ mỏng chạy ngang vô tận dưới đáy hero.
 */
export function HeroBanner({
  featured,
  ticker = [],
}: {
  featured: PublishedPost[];
  ticker?: string[];
}) {
  const p = featured[0];
  if (!p) return null;

  return (
    <section className="relative overflow-hidden bg-[#040b1c] text-white">
      {/* ===== Ánh sáng môi trường + lưới công nghệ ===== */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="hero-glow-1 absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-cyan-500/25 blur-[110px]" />
        <div className="hero-glow-2 absolute -bottom-48 -right-32 h-[36rem] w-[36rem] rounded-full bg-doan-600/30 blur-[120px]" />
        <div className="hero-glow-3 absolute left-1/3 top-1/4 h-72 w-72 rounded-full bg-sky-400/15 blur-[90px]" />
        <div
          className="absolute inset-0 opacity-[0.13] [background-image:linear-gradient(rgba(125,211,252,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(125,211,252,0.35)_1px,transparent_1px)] [background-size:56px_56px]"
          style={{ maskImage: "radial-gradient(ellipse at 50% 40%, black 30%, transparent 75%)", WebkitMaskImage: "radial-gradient(ellipse at 50% 40%, black 30%, transparent 75%)" }}
        />
      </div>

      {/* ===== Split cinematic 2 cột ===== */}
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:pb-20 lg:pt-16">
        {/* Trái — nội dung tin */}
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/30 bg-white/5 px-4 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.28em] text-amber-200/95 shadow-[inset_0_0_18px_rgba(251,191,36,0.08),0_0_24px_rgba(251,191,36,0.12)] backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5" /> Tin nổi bật
          </span>

          <h1 className="mt-5 max-w-2xl text-2xl font-bold leading-[1.25] tracking-tight sm:text-3xl lg:text-4xl">
            <Link
              href={`/tin-tuc/${p.slug}`}
              className="bg-gradient-to-br from-white via-white to-sky-300/90 bg-clip-text text-transparent transition-colors duration-300 hover:from-cyan-100 hover:via-white hover:to-cyan-300"
            >
              {/* Ngắt dòng chủ động sau dấu ":" để câu ngắt đúng nhịp nghĩa — không xẻ đôi từ ghép tiếng Việt */}
              {p.title.split(":").map((part, i, arr) => (
                <span key={i}>
                  {part}
                  {i < arr.length - 1 ? ":" : ""}
                  {i < arr.length - 1 ? <br className="hidden lg:block" /> : null}
                  {i < arr.length - 1 ? " " : ""}
                </span>
              ))}
            </Link>
          </h1>

          <p className="my-4 line-clamp-3 max-w-2xl text-sm font-normal leading-relaxed text-slate-300 sm:text-[15px]">
            {p.excerpt}
          </p>

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium text-slate-400">
            <span>{p.authorOrgUnitName}</span>
            <span className="text-slate-600">•</span>
            <span>{formatDate(p.publishedAt ?? p.createdAt)}</span>
            <span className="text-slate-600">•</span>
            <span>{formatNumber(p.viewCount)} lượt xem</span>
          </div>

          {/* CTA gradient — shimmer trượt sáng khi hover */}
          <Link
            href={`/tin-tuc/${p.slug}`}
            className="group relative mt-7 inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-doan-600 to-cyan-500 px-7 py-3.5 text-sm font-bold text-white shadow-[0_10px_36px_-8px_rgba(34,211,238,0.65)] ring-1 ring-cyan-300/40 transition-shadow duration-300 hover:shadow-[0_14px_46px_-6px_rgba(34,211,238,0.85)]"
          >
            <span
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
              aria-hidden="true"
            />
            <span className="relative">Đọc chi tiết</span>
            <ArrowRight className="relative h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Phải — ảnh tiêu điểm bóng glow */}
        <div className="relative">
          <div
            className="absolute -inset-5 rounded-[2.5rem] bg-gradient-to-tr from-doan-600/40 via-cyan-400/25 to-transparent blur-2xl"
            aria-hidden="true"
          />
          <Link
            href={`/tin-tuc/${p.slug}`}
            className="group relative block overflow-hidden rounded-3xl border border-white/15 shadow-[0_30px_90px_-24px_rgba(34,211,238,0.45)]"
          >
            <PhotoPlaceholder
              seed={p.coverSeed}
              src={p.coverDataUrl}
              className="aspect-[4/3] w-full transition-transform duration-700 ease-out group-hover:scale-[1.05]"
              icon={false}
            />
            <span
              className="absolute inset-0 bg-gradient-to-t from-[#040b1c]/70 via-transparent to-transparent"
              aria-hidden="true"
            />
            {/* Live indicator */}
            <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/45 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300" />
              </span>
              Cập nhật trực tiếp
            </span>
          </Link>
        </div>
      </div>

      {/* ===== Dải ticker kính mờ ===== */}
      {ticker.length > 0 ? (
        <div className="relative border-t border-white/10 bg-white/[0.04] py-3 backdrop-blur-md">
          <div className="flex w-max animate-marquee gap-10" style={{ animationDuration: "40s" }}>
            {[0, 1].map((dup) => (
              <div key={dup} className="flex shrink-0 items-center gap-10" aria-hidden={dup === 1}>
                {ticker.map((t, i) => (
                  <span
                    key={`${dup}-${i}`}
                    className="flex items-center gap-2.5 whitespace-nowrap text-xs font-medium text-sky-100/85"
                  >
                    <Flame className="h-3.5 w-3.5 shrink-0 text-amber-300" />
                    {t}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function Hs3tBanner() {
  return (
    <Link
      href="https://hoc-sinh-3-tot.vn"
      target="_blank"
      className="group flex items-center gap-4 overflow-hidden rounded-xl border border-vang-300/60 bg-gradient-to-r from-vang-50 via-white to-doan-50 p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-doan-600 text-vang-300 shadow">
        <Star className="h-6 w-6 fill-vang-300 text-vang-300" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-doan-700">Chương trình Học sinh 3 tốt</p>
        <p className="text-xs text-stone-500">
          Cập nhật tiêu chuẩn, đăng ký tham gia và theo dõi kết quả rèn luyện hằng năm.
        </p>
      </div>
      <ArrowRight className="h-5 w-5 shrink-0 text-doan-600 transition-transform group-hover:translate-x-1" />
    </Link>
  );
}
