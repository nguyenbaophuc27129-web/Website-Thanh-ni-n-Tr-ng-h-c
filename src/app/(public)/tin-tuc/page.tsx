"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Search, PenLine, ImagePlus, Loader2, X, ShieldCheck } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { moderateText } from "@/lib/ai-moderation";
import { SPECIAL_CATEGORIES } from "@/data/categories";
import { TechNewsCard } from "@/components/public/tech-news-card";
import { EmptyState } from "@/components/public/empty-state";
import { Modal } from "@/components/ui/modal";
import { Input, Textarea, Select, Field } from "@/components/ui/input";

type Cat = "all" | string;

/** Chuyên mục nhận bài đóng góp — suy ra tag từ SPECIAL_CATEGORIES + mục tin chung */
const CONTRIBUTION_TAGS: string[] = [
  ...SPECIAL_CATEGORIES.map((c) => new URLSearchParams(c.href.split("?")[1] ?? "").get("q")).filter((t): t is string => !!t),
  "Tin tức hoạt động Đoàn",
];

const MAX_COVER_BYTES = 2 * 1024 * 1024; // 2MB — khớp coverDataUrl của modal xuất bản

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
  const { publishedPosts, createMemberContribution } = useStore();
  const { session } = useAuth();
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Cat>("all");
  const searchRef = useRef<HTMLInputElement>(null);

  /* ===== Đóng góp bài viết (login-gated) ===== */
  const [contribOpen, setContribOpen] = useState(false);
  const [cTag, setCTag] = useState(CONTRIBUTION_TAGS[0]);
  const [cTitle, setCTitle] = useState("");
  const [cExcerpt, setCExcerpt] = useState("");
  const [cContent, setCContent] = useState("");
  const [cCover, setCCover] = useState<string | undefined>(undefined);
  const [cCoverName, setCCoverName] = useState("");
  const [cBusy, setCBusy] = useState(false);

  const openContribute = () => {
    if (!session) {
      toast("Bạn cần đăng nhập để đóng góp bài viết. Tài khoản demo: dv.demo / demo123", "warning");
      return;
    }
    setContribOpen(true);
  };

  const pickCover = (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_COVER_BYTES) {
      toast("Ảnh bìa vượt quá 2MB — hãy chọn ảnh nhỏ hơn.", "warning");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCCover(String(reader.result));
      setCCoverName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const submitContribution = async () => {
    if (!session) return;
    if (cTitle.trim().length < 8 || cContent.trim().length < 40) {
      toast("Cần tiêu đề tối thiểu 8 ký tự và nội dung tối thiểu 40 ký tự.", "warning");
      return;
    }
    setCBusy(true);
    const mod = await moderateText(`${cTitle}\n${cContent}`);
    createMemberContribution(
      session,
      { categoryTag: cTag, title: cTitle, excerpt: cExcerpt || cContent.slice(0, 150), content: cContent, coverDataUrl: cCover },
      mod
    );
    setCBusy(false);
    setContribOpen(false);
    setCTitle(""); setCExcerpt(""); setCContent(""); setCCover(undefined); setCCoverName("");
    toast(
      mod.verdict === "CLEAN"
        ? "Đã gửi bài đóng góp — nội dung đạt kiểm duyệt AI, chờ Ban TNTH duyệt đăng."
        : `AI gắn cờ nội dung (${mod.reason ?? "đáng ngờ"}) — bài ở trạng thái chờ kiểm duyệt thủ công.`,
      mod.verdict === "CLEAN" ? "success" : "warning"
    );
  };

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
        <button
          type="button"
          onClick={openContribute}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-blue-500/25 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/30"
        >
          <PenLine className="h-4 w-4" /> Đóng góp bài viết
        </button>
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

      {/* ===== Modal đóng góp bài viết ===== */}
      <Modal
        open={contribOpen}
        onClose={() => !cBusy && setContribOpen(false)}
        title={
          <span className="inline-flex items-center gap-2">
            <PenLine className="h-4 w-4 text-cyan-500" /> Đóng góp bài viết chuyên mục
          </span>
        }
        footer={
          <>
            <button
              type="button"
              onClick={() => setContribOpen(false)}
              disabled={cBusy}
              className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={submitContribution}
              disabled={cBusy}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
            >
              {cBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {cBusy ? "AI đang kiểm duyệt…" : "Gửi qua kiểm duyệt AI"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Chuyên mục">
            <Select value={cTag} onChange={(e) => setCTag(e.target.value)}>
              {CONTRIBUTION_TAGS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Tiêu đề" required hint="Tối thiểu 8 ký tự">
            <Input value={cTitle} onChange={(e) => setCTitle(e.target.value)} placeholder="Ví dụ: Tin tốt #42: Lớp 12A1 trồng 200 cây xanh…" />
          </Field>
          <Field label="Tóm tắt" hint="Để trống sẽ tự lấy 150 ký tự đầu của nội dung">
            <Textarea value={cExcerpt} onChange={(e) => setCExcerpt(e.target.value)} className="min-h-16" placeholder="1–2 câu tóm tắt ý nghĩa bài viết" />
          </Field>
          <Field label="Nội dung" required hint="Tối thiểu 40 ký tự — nội dung rõ ràng, lành mạnh sẽ qua AI ngay">
            <Textarea value={cContent} onChange={(e) => setCContent(e.target.value)} className="min-h-36" />
          </Field>
          <Field label="Ảnh bìa (không bắt buộc)" hint="PNG/JPG tối đa 2MB">
            {cCover ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cCover} alt="Ảnh bìa" className="h-16 w-28 rounded-lg object-cover ring-1 ring-stone-200" />
                <span className="min-w-0 flex-1 truncate text-xs text-stone-500">{cCoverName}</span>
                <button
                  type="button"
                  onClick={() => { setCCover(undefined); setCCoverName(""); }}
                  className="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-red-500"
                  aria-label="Bỏ ảnh"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-stone-300 px-3 py-4 text-sm text-stone-500 hover:border-doan-400 hover:text-doan-600">
                <ImagePlus className="h-4 w-4" /> Chọn ảnh từ máy
                <input type="file" accept="image/*" className="hidden" onChange={(e) => pickCover(e.target.files?.[0] ?? null)} />
              </label>
            )}
          </Field>
          <p className="rounded-lg bg-sky-50 px-3 py-2 text-[11px] leading-relaxed text-sky-700">
            Bài của bạn sẽ đi qua AI kiểm duyệt tự động. Nội dung đạt → Ban TNTH duyệt đăng và cộng
            15 điểm đóng góp vào trang Tài khoản của bạn.
          </p>
        </div>
      </Modal>

      {session ? null : (
        <p className="mt-6 text-center text-[11px] text-stone-400">
          Đoàn viên đăng nhập có thể{" "}
          <Link href="/dang-nhap" className="text-doan-600 hover:underline">đóng góp bài viết</Link>{" "}
          và nhận điểm thưởng.
        </p>
      )}
    </div>
  );
}
