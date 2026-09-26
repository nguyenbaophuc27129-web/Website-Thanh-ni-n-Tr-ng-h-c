import Link from "next/link";
import { Star, ArrowRight, Sparkles } from "lucide-react";
import type { PublishedPost } from "@/types";
import { PhotoPlaceholder } from "@/components/ui/photo-placeholder";
import { formatDate, formatNumber } from "@/lib/utils";

export function HeroBanner({ featured }: { featured: PublishedPost[] }) {
  const [main, ...rest] = featured;
  if (!main) return null;

  return (
    <section className="hero-star-bg relative overflow-hidden text-white">
      <div className="mx-auto max-w-7xl px-4 py-10 lg:py-14">
        <div className="grid items-start gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-vang-200">
              <Sparkles className="h-3.5 w-3.5" /> Tin nổi bật
            </div>
            <h1 className="mt-4 font-serif-display text-2xl font-black leading-snug sm:text-3xl lg:text-4xl">
              <Link href={`/tin-tuc/${main.slug}`} className="hover:underline">
                {main.title}
              </Link>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/80">
              {main.excerpt}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-white/70">
              <span>{formatDate(main.publishedAt ?? main.createdAt)}</span>
              <span>{main.authorOrgUnitName}</span>
              <span>{formatNumber(main.viewCount)} lượt xem</span>
            </div>
            <Link
              href={`/tin-tuc/${main.slug}`}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-vang-300 px-5 py-2.5 text-sm font-semibold text-doan-800 shadow hover:bg-vang-200"
            >
              Đọc chi tiết <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="space-y-3 lg:col-span-2">
            {rest.map((p) => (
              <Link
                key={p.id}
                href={`/tin-tuc/${p.slug}`}
                className="flex items-center gap-3 rounded-xl bg-white/10 p-3 backdrop-blur transition-colors hover:bg-white/15"
              >
                <PhotoPlaceholder seed={p.coverSeed} className="h-16 w-24 shrink-0 rounded-lg" icon={false} />
                <div className="min-w-0">
                  <p className="line-clamp-2 text-xs font-semibold leading-snug">{p.title}</p>
                  <p className="mt-1 text-[10px] text-white/60">{formatDate(p.publishedAt ?? p.createdAt)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
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
