import Link from "next/link";
import type { PublishedPost } from "@/types";
import { PhotoPlaceholder } from "@/components/ui/photo-placeholder";
import { formatNumber } from "@/lib/utils";

/**
 * 🗞️ Thẻ Tech-Glass — Bảng tin công nghệ thế hệ mới (Vercel / Linear vibe)
 *
 * - Bề mặt trắng ngọc trai bg-white/80 backdrop-blur, viền hairline [0.5px], bo góc sâu rounded-3xl.
 * - Hover: viền sáng bừng Cyan, bóng sâu xanh blue-500/10, thumbnail zoom scale-105.
 * - Ảnh có lớp phủ lưới kỹ thuật (tech grid pattern) siêu mờ — vibe phòng lab / dữ liệu số.
 * - Metadata font mono kiểu console: SYS.DATE // 26.09.2026 · SYS.VIEW // 1.2K.
 * - Badge "Tiêu điểm" = chấm neon nhấp nháy + chữ in hoa góc cạnh (không pill tròn).
 * - featured=true → Mega-Card chia đôi: ảnh bên trái, nội dung bên phải.
 */

/* Lớp phủ lưới kỹ thuật siêu mờ */
const TECH_GRID =
  "bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:14px_14px]";

/* Ngày kiểu hệ thống: 2026-09-26 → 26.09.2026 */
function metaDate(iso: string) {
  return iso.slice(0, 10).split("-").reverse().join(".");
}

/* Badge chấm neon nhấp nháy — góc cạnh, không pill tròn */
function DotBadge({ label = "TIÊU ĐIỂM" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-slate-950/60 px-2 py-1 text-[9.5px] font-bold tracking-[0.22em] text-cyan-100 backdrop-blur-md">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-300" />
      </span>
      {label}
    </span>
  );
}

/* Metadata mono kiểu console */
function MetaRow({ post, big = false }: { post: PublishedPost; big?: boolean }) {
  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-3 font-mono uppercase tracking-[0.14em] text-slate-400 ${
        big ? "text-[11px]" : "text-[10px]"
      }`}
    >
      <span>SYS.DATE // {metaDate(post.publishedAt ?? post.createdAt)}</span>
      <span>SYS.VIEW // {formatNumber(post.viewCount)}</span>
      <span className="ml-auto inline-flex max-w-full items-center truncate">
        SYS.ORG // {post.authorOrgUnitName}
      </span>
    </div>
  );
}

/* Tag chuyên mục mono góc ngoặc — vibe mã nguồn */
function TopicTag({ topic }: { topic: string }) {
  return (
    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-600">
      [ {topic} ]
    </span>
  );
}

/* Bề mặt thẻ dùng chung */
const SURFACE =
  "group overflow-hidden rounded-3xl border-[0.5px] border-slate-200 bg-white/80 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400 hover:shadow-2xl hover:shadow-blue-500/10";

export function TechNewsCard({ post, featured = false }: { post: PublishedPost; featured?: boolean }) {
  const topic = post.categoryNames[0];

  /* ===== MEGA-CARD — chiếm 2x2, chia đôi ảnh / nội dung ===== */
  if (featured) {
    return (
      <Link href={`/tin-tuc/${post.slug}`} className={`${SURFACE} grid h-full grid-cols-1 sm:grid-cols-2`}>
        {/* Ảnh bên trái — full chiều cao */}
        <div className="relative min-h-56 overflow-hidden">
          <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-105">
            <PhotoPlaceholder seed={post.coverSeed} src={post.coverDataUrl} className="h-full w-full" icon={false} />
          </div>
          <div className={`pointer-events-none absolute inset-0 ${TECH_GRID}`} />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/25 via-transparent to-transparent" />
          {post.isFeatured ? (
            <span className="absolute left-4 top-4">
              <DotBadge />
            </span>
          ) : null}
        </div>

        {/* Nội dung bên phải */}
        <div className="flex flex-col justify-between gap-4 p-6 sm:p-7">
          <div>
            {topic ? <TopicTag topic={topic} /> : null}
            <h3 className="mt-2.5 line-clamp-3 text-xl font-bold leading-snug text-slate-900 transition-colors group-hover:text-cyan-600 sm:text-2xl">
              {post.title}
            </h3>
            <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-slate-500">{post.excerpt}</p>
          </div>
          <MetaRow post={post} big />
        </div>
      </Link>
    );
  }

  /* ===== REGULAR CARD — col-span-1 ===== */
  return (
    <Link href={`/tin-tuc/${post.slug}`} className={`${SURFACE} flex h-full flex-col`}>
      <div className="relative aspect-video overflow-hidden">
        <div className="h-full w-full transition-transform duration-500 ease-out group-hover:scale-105">
          <PhotoPlaceholder seed={post.coverSeed} src={post.coverDataUrl} className="h-full w-full" icon={false} />
        </div>
        <div className={`pointer-events-none absolute inset-0 ${TECH_GRID}`} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/20 via-transparent to-transparent" />
        {post.isFeatured ? (
          <span className="absolute left-3 top-3">
            <DotBadge />
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-5">
        {topic ? <TopicTag topic={topic} /> : null}
        <h3 className="mt-2.5 line-clamp-2 text-base font-bold leading-snug text-slate-900 transition-colors group-hover:text-cyan-600">
          {post.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-slate-500">{post.excerpt}</p>
        <div className="mt-auto pt-4">
          <MetaRow post={post} />
        </div>
      </div>
    </Link>
  );
}
