"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { ArrowLeft, CalendarDays, Eye, Building2, Tag, PenLine } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { PhotoPlaceholder } from "@/components/ui/photo-placeholder";
import { NewsCard } from "@/components/public/news-card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatNumber } from "@/lib/utils";

function renderBold(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const boldRegex = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <strong key={match.index} className="font-semibold text-stone-900">
        {match[1]}
      </strong>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length > 0 ? parts : text;
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(renderBold(text.slice(lastIndex, match.index)));
    }
    parts.push(
      <a
        key={match.index}
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-800"
      >
        {match[1]}
      </a>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(renderBold(text.slice(lastIndex)));
  }
  return parts.length > 0 ? parts : text;
}

function renderBlock(block: string, key: number): React.ReactNode {
  const trimmed = block.trim();
  if (!trimmed) return null;

  // Heading 2
  if (trimmed.startsWith("## ")) {
    return (
      <h2
        key={key}
        className="mt-8 mb-3 border-l-4 border-doan-600 pl-3.5 font-serif-display text-xl font-bold tracking-tight text-stone-900 sm:text-2xl"
      >
        {trimmed.slice(3)}
      </h2>
    );
  }

  // Heading 3
  if (trimmed.startsWith("### ")) {
    return (
      <h3 key={key} className="mt-6 mb-2.5 text-base font-bold text-stone-800 sm:text-lg">
        {trimmed.slice(4)}
      </h3>
    );
  }

  // Markdown Image: ![caption](url) + optional caption line
  const imgMatch = trimmed.match(/^!\[(.*?)\]\((https?:\/\/[^\s)]+)\)(?:\s*\n\*([\s\S]*?)\*)?$/);
  if (imgMatch) {
    const caption = imgMatch[3] || imgMatch[1];
    const url = imgMatch[2];
    return (
      <figure
        key={key}
        className="my-6 overflow-hidden rounded-2xl border border-stone-200/80 bg-stone-50/60 shadow-sm"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={caption || "Hình ảnh bài viết"}
          className="max-h-[540px] w-full object-cover"
        />
        {caption ? (
          <figcaption className="border-t border-stone-100 bg-stone-100/50 px-4 py-2.5 text-center text-xs italic text-stone-500">
            {caption}
          </figcaption>
        ) : null}
      </figure>
    );
  }

  // Standalone italic caption
  if (/^\*[^*]+\*$/.test(trimmed)) {
    return (
      <p key={key} className="-mt-3 mb-5 text-center text-xs italic text-stone-500">
        {trimmed.slice(1, -1)}
      </p>
    );
  }

  // Blockquote: > text
  if (trimmed.startsWith("> ")) {
    return (
      <blockquote
        key={key}
        className="my-4 border-l-4 border-cyan-500 bg-cyan-50/50 px-4 py-3 text-sm italic text-stone-700"
      >
        {renderInline(trimmed.slice(2))}
      </blockquote>
    );
  }

  // Standard paragraph
  return (
    <p key={key} className="leading-relaxed text-stone-700">
      {renderInline(trimmed)}
    </p>
  );
}

export default function ChiTietTinPage() {
  const params = useParams<{ slug: string }>();
  const { publishedPosts, accounts, orgName } = useStore();

  const post = useMemo(
    () => publishedPosts.find((p) => p.slug === params.slug && p.status === "PUBLISHED"),
    [publishedPosts, params.slug]
  );

  const related = useMemo(
    () =>
      post
        ? publishedPosts
            .filter((p) => p.status === "PUBLISHED" && p.id !== post.id)
            .filter((p) => p.categoryNames.some((c) => post.categoryNames.includes(c)))
            .slice(0, 3)
        : [],
    [publishedPosts, post]
  );

  if (!post) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="font-serif-display text-xl font-bold text-stone-800">Không tìm thấy bài viết</h1>
        <p className="mt-2 text-sm text-stone-500">Bài viết có thể đã bị gỡ hoặc chưa được xuất bản.</p>
        <Link href="/tin-tuc" className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-doan-600 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Về trang tin tức
        </Link>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/tin-tuc" className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-doan-600">
        <ArrowLeft className="h-3.5 w-3.5" /> Tin tức
      </Link>

      <h1 className="mt-3 font-serif-display text-2xl font-black leading-snug text-stone-900 sm:text-3xl">
        {post.title}
      </h1>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-stone-200 py-3 text-xs text-stone-500">
        <span className="inline-flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5" /> {post.authorOrgUnitName}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" /> {formatDate(post.publishedAt ?? post.createdAt)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5" /> {formatNumber(post.viewCount)} lượt xem
        </span>
        {post.categoryNames.length > 0 ? (
          <span className="inline-flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5" /> {post.categoryNames.join(", ")}
          </span>
        ) : null}
      </div>

      <PhotoPlaceholder seed={post.coverSeed} src={post.coverDataUrl} className="mt-6 h-64 w-full rounded-xl sm:h-80" />

      {post.excerpt ? (
        <p className="mt-6 border-l-4 border-doan-600 bg-doan-50/60 px-4 py-3 text-sm font-medium italic leading-relaxed text-stone-700">
          {post.excerpt}
        </p>
      ) : null}

      <div className="mt-6 space-y-4 text-[15px] leading-8 text-stone-700">
        {post.content.split("\n\n").map((para, i) => renderBlock(para, i))}
      </div>

      {post.contributorAccountId ? (
        <div className="mt-8 flex flex-wrap items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white">
            <PenLine className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-stone-800">
              Bài viết đóng góp từ{" "}
              {accounts.find((a) => a.id === post.contributorAccountId)?.contactPerson ?? "Đoàn viên"}
              {" · "}
              {accounts.find((a) => a.id === post.contributorAccountId)
                ? orgName(accounts.find((a) => a.id === post.contributorAccountId)!.orgUnitId)
                : "Cộng đồng đoàn viên"}
            </p>
            <p className="text-[11px] text-stone-500">
              Nội dung qua AI kiểm duyệt và được Ban Biên tập duyệt trước khi đăng.
            </p>
          </div>
          <Badge tone="blue">Đóng góp cộng đồng</Badge>
        </div>
      ) : null}

      {related.length > 0 ? (
        <section className="mt-12">
          <h2 className="font-serif-display text-lg font-bold text-stone-900">Tin liên quan</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-3">
            {related.map((p) => (
              <NewsCard key={p.id} post={p} compact />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
