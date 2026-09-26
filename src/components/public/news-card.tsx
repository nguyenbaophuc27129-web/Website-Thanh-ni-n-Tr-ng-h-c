import Link from "next/link";
import { Eye, CalendarDays } from "lucide-react";
import type { PublishedPost } from "@/types";
import { PhotoPlaceholder } from "@/components/ui/photo-placeholder";
import { formatDate, formatNumber } from "@/lib/utils";

export function NewsCard({ post, compact }: { post: PublishedPost; compact?: boolean }) {
  return (
    <Link
      href={`/tin-tuc/${post.slug}`}
      className="group block overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative">
        <PhotoPlaceholder
          seed={post.coverSeed}
          className="h-40 w-full"
        />
        {post.isFeatured ? (
          <span className="absolute left-2.5 top-2.5 rounded bg-vang-300 px-2 py-0.5 text-[10px] font-bold text-doan-800">
            NỔI BẬT
          </span>
        ) : null}
      </div>
      <div className="p-4">
        <h3
          className={`font-serif-display font-bold leading-snug text-stone-900 group-hover:text-doan-700 ${
            compact ? "text-sm line-clamp-2" : "text-base line-clamp-3"
          }`}
        >
          {post.title}
        </h3>
        {!compact ? (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-stone-500">
            {post.excerpt}
          </p>
        ) : null}
        <div className="mt-3 flex items-center gap-3 text-[11px] text-stone-400">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3 w-3" /> {formatDate(post.publishedAt ?? post.createdAt)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3 w-3" /> {formatNumber(post.viewCount)}
          </span>
          <span className="ml-auto truncate">{post.authorOrgUnitName}</span>
        </div>
      </div>
    </Link>
  );
}
