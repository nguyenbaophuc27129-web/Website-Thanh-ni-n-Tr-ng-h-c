"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { TechNewsCard } from "@/components/public/tech-news-card";
import { EmptyState } from "@/components/public/empty-state";

type Cat = "all" | string;

/* Staggered fade-up — mỗi thẻ lệch nhau 60ms */
const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

export default function TinTucPage() {
  const { publishedPosts } = useStore();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Cat>("all");
  const searchRef = useRef<HTMLInputElement>(null);

  // Nhận từ khóa chủ đề từ liên kết hashtag ở trang chủ (?q=...)
  useEffect(() => {
    const k = new URLSearchParams(window.location.search).get("q");
    if (k) setQ(k);
  }, []);

  // Phím tắt ⌘K / Ctrl+K focus vào ô tìm kiếm
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
    <div className="mx-auto max-w-7xl px-4 py-12">
      {/* ===== Header ===== */}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="h-1 w-12 rounded-full bg-gradient-to-r from-blue-600 to-cyan-400" />
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            Tin tức hoạt động
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-500">
            Tin bài do các đơn vị Đoàn cập nhật và biên tập viên biên tập, xuất bản trên cổng thông tin.
          </p>
        </div>
      </div>

      {/* ===== 1. TRẠM ĐIỀU KHIỂN THÔNG MINH — Control Bar kính mờ nổi trên nền trang ===== */}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white/60 p-3 shadow-[0_8px_30px_rgb(15,23,42,0.05)] backdrop-blur-xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* Search phong cách command prompt — kính lúp phát sáng nhẹ + ⌘K */}
          <div className="relative w-full lg:w-96 lg:shrink-0">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-500 drop-shadow-[0_0_6px_rgba(34,211,238,0.65)]" />
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm tin bài, chủ đề, đơn vị…"
              className="w-full rounded-xl border border-slate-200/80 bg-white/80 py-2.5 pl-11 pr-14 text-sm text-slate-700 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-cyan-400 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.14)]"
            />
            <kbd className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-400">
              ⌘K
            </kbd>
          </div>

          {/* Vạch phân cách dọc */}
          <span aria-hidden className="hidden h-6 w-px shrink-0 bg-slate-200 lg:block" />

          {/* Tab danh mục — pill tối kiểu Linear, cuộn ngang khi chật */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
            {(["all", ...categories] as Cat[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
                className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all duration-200 ${
                  cat === c
                    ? "bg-slate-900 text-white shadow-md shadow-slate-900/15"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                }`}
              >
                {c === "all" ? "Tất cả" : c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== 2. LƯỚI BENTO BẤT ĐỐI XỨNG — Mega-Card 2x2 dẫn dắt, thẻ thường xếp xung quanh ===== */}
      {posts.length > 0 ? (
        <motion.div
          key={`${cat}|${q}`}
          variants={gridVariants}
          initial="hidden"
          animate="show"
          className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 lg:gap-8"
        >
          {posts.map((p, i) => (
            <motion.div
              key={p.id}
              variants={itemVariants}
              className={i === 0 ? "md:col-span-2 md:row-span-2" : undefined}
            >
              <TechNewsCard post={p} featured={i === 0} />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="mt-10">
          <EmptyState message="Không tìm thấy tin bài phù hợp." />
        </div>
      )}
    </div>
  );
}
