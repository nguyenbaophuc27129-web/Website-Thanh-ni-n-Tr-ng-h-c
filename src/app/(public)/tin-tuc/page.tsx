"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { NewsCard } from "@/components/public/news-card";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/public/empty-state";

type Cat = "all" | string;

export default function TinTucPage() {
  const { publishedPosts } = useStore();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Cat>("all");

  const categories = useMemo(() => {
    const names = new Set<string>();
    publishedPosts.filter((p) => p.status === "PUBLISHED").forEach((p) => p.categoryNames.forEach((c) => names.add(c)));
    return Array.from(names);
  }, [publishedPosts]);

  const posts = useMemo(() => {
    return publishedPosts
      .filter((p) => p.status === "PUBLISHED")
      .filter((p) => (cat === "all" ? true : p.categoryNames.includes(cat)))
      .filter((p) =>
        q.trim() === ""
          ? true
          : `${p.title} ${p.excerpt}`.toLowerCase().includes(q.toLowerCase())
      )
      .sort((a, b) => (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt));
  }, [publishedPosts, cat, q]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-display text-2xl font-bold text-stone-900">Tin tức hoạt động</h1>
          <p className="mt-1 text-sm text-stone-500">
            Tin bài do các đơn vị Đoàn cập nhật và biên tập viên biên tập, xuất bản.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm kiếm tin bài…"
            className="pl-9"
          />
        </div>
      </div>

      <div className="mt-5">
        <Tabs
          value={cat}
          onChange={(v) => setCat(v as Cat)}
          tabs={[
            { value: "all", label: "Tất cả" },
            ...categories.map((c) => ({ value: c, label: c })),
          ]}
        />
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {posts.map((p) => (
          <NewsCard key={p.id} post={p} />
        ))}
      </div>
      {posts.length === 0 ? <EmptyState message="Không tìm thấy tin bài phù hợp." /> : null}
    </div>
  );
}
