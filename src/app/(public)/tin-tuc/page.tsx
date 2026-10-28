"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  PenLine,
  ImagePlus,
  Loader2,
  X,
  ShieldCheck,
  Filter,
  ChevronDown,
  TrendingUp,
  Flame,
  Clock,
  Sparkles,
  ChevronRight,
  Eye,
  Bookmark,
  Share2,
  Camera,
  PlayCircle,
  Award,
  BookOpen,
} from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { SPECIAL_CATEGORIES, SECTION_TAGS } from "@/data/categories";
import { PhotoPlaceholder } from "@/components/ui/photo-placeholder";
import { postCoverRaw } from "@/lib/cover";
import { Modal } from "@/components/ui/modal";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { formatDateTime, formatNumber } from "@/lib/utils";
import { uploadFile } from "@/lib/upload-client";
import type { PublishedPost } from "@/types";

type Cat = "all" | string;

const TUOI_TRE_CATEGORIES = [
  "Tất cả",
  "Thanh niên trường học",
  "Hoạt động Đoàn - Hội",
  "Học sinh 3 tốt",
  "Chuyển đổi số & Sáng tạo",
  "Khen thưởng - Gương sáng",
  "Khoa học trẻ",
  "Đảng viên trẻ",
  "Kỹ năng & Hướng nghiệp",
];

const CONTRIBUTION_TAGS: string[] = [
  "Thanh niên trường học",
  "Hoạt động Đoàn - Hội",
  "Học sinh 3 tốt",
  "Khoa học trẻ",
  "Tin tức hoạt động Đoàn cơ sở",
];

const MAX_COVER_BYTES = 10 * 1024 * 1024; // 10MB

export default function TinTucPage() {
  const { publishedPosts, createMemberContribution } = useStore();
  const { session } = useAuth();
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [selectedCat, setSelectedCat] = useState<Cat>("all");
  const searchRef = useRef<HTMLInputElement>(null);

  /* ===== Đóng góp bài viết ===== */
  const [contribOpen, setContribOpen] = useState(false);
  const [cTag, setCTag] = useState(CONTRIBUTION_TAGS[0]);
  const [cTitle, setCTitle] = useState("");
  const [cExcerpt, setCExcerpt] = useState("");
  const [cContent, setCContent] = useState("");
  const [cCover, setCCover] = useState<string | undefined>(undefined);
  const [cCoverName, setCCoverName] = useState("");
  const [cCoverUploading, setCCoverUploading] = useState(false);
  const [cBusy, setCBusy] = useState(false);

  const openContribute = () => {
    if (!session) {
      toast("Bạn cần đăng nhập để đóng góp bài viết.", "warning");
      return;
    }
    setContribOpen(true);
  };

  const pickCover = (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_COVER_BYTES) {
      toast("Ảnh bìa vượt quá 10MB — hãy chọn ảnh nhỏ hơn.", "warning");
      return;
    }
    // Ảnh bìa lưu trên máy chủ — chỉ giữ đường dẫn /uploads/...
    setCCoverUploading(true);
    uploadFile(file, "dong-gop")
      .then((uploaded) => {
        setCCover(uploaded.url);
        setCCoverName(file.name);
      })
      .catch((e: unknown) => toast(e instanceof Error ? e.message : "Không tải được ảnh bìa lên máy chủ.", "warning"))
      .finally(() => setCCoverUploading(false));
  };

  const submitContribution = async () => {
    if (!session) return;
    if (cCoverUploading) {
      toast("Ảnh bìa đang được tải lên máy chủ — vui lòng đợi trong giây lát.", "warning");
      return;
    }
    if (cTitle.trim().length < 8 || cContent.trim().length < 40) {
      toast("Cần tiêu đề tối thiểu 8 ký tự và nội dung tối thiểu 40 ký tự.", "warning");
      return;
    }
    // Máy chủ tự kiểm duyệt AI rồi lưu bài ở trạng thái chờ duyệt
    setCBusy(true);
    const res = await createMemberContribution({
      categoryTag: cTag, title: cTitle, excerpt: cExcerpt || cContent.slice(0, 150), content: cContent, coverDataUrl: cCover,
    });
    setCBusy(false);
    if (!res.ok) {
      toast(res.error, "warning");
      return;
    }
    setContribOpen(false);
    setCTitle(""); setCExcerpt(""); setCContent(""); setCCover(undefined); setCCoverName("");
    const clean = res.mod?.verdict !== "FLAGGED";
    toast(
      clean
        ? "Đã gửi bài đóng góp — nội dung đạt kiểm duyệt AI, chờ Ban Biên tập duyệt đăng."
        : `AI gắn cờ nội dung (${res.mod?.reason ?? "đáng ngờ"}) — bài ở trạng thái chờ kiểm duyệt thủ công.`,
      clean ? "success" : "warning"
    );
  };

  // URL query parameter ?q=...
  useEffect(() => {
    const k = new URLSearchParams(window.location.search).get("q");
    if (k) setQ(k);
  }, []);

  // Keyboard shortcut Ctrl+K
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

  // Tất cả bài viết ĐÃ XUẤT BẢN từ DB
  const allPublishedPosts = useMemo(() => {
    return publishedPosts
      .filter((p) => p.status === "PUBLISHED")
      .sort((a, b) => (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt));
  }, [publishedPosts]);

  // Bộ lọc bài viết hiện tại
  const filteredPosts = useMemo(() => {
    return allPublishedPosts
      .filter((p) => (selectedCat === "all" || selectedCat === "Tất cả" ? true : p.categoryNames?.includes(selectedCat)))
      .filter((p) => {
        if (!q.trim()) return true;
        const searchStr = `${p.title} ${p.excerpt} ${p.content} ${p.categoryNames?.join(" ") || ""}`.toLowerCase();
        return searchStr.includes(q.toLowerCase());
      });
  }, [allPublishedPosts, selectedCat, q]);

  // Phân chia layout báo Tuổi Trẻ:
  // 1. Hero Lead story (Bài đinh lớn nhất: ưu tiên bài isFeatured hoặc bài mới nhất)
  const heroLead = useMemo(() => {
    return filteredPosts.find((p) => p.isFeatured || p.postAttributes?.includes("TIEU_DIEM")) || filteredPosts[0] || null;
  }, [filteredPosts]);

  // 2. 3 bài tin nóng kề bên
  const subFeaturedPosts = useMemo(() => {
    if (!heroLead) return [];
    return filteredPosts.filter((p) => p.id !== heroLead.id).slice(0, 3);
  }, [filteredPosts, heroLead]);

  // 3. Top 5 bài đọc nhiều nhất (Top trending sidebar)
  const topTrendingPosts = useMemo(() => {
    return [...allPublishedPosts]
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
      .slice(0, 5);
  }, [allPublishedPosts]);

  // 4. Khối chuyên mục "Thanh niên trường học"
  const schoolPosts = useMemo(() => {
    return allPublishedPosts
      .filter((p) => p.categoryNames?.some((c) => c.includes("trường học") || c.includes("Học sinh")))
      .slice(0, 4);
  }, [allPublishedPosts]);

  // 5. Khối chuyên mục "Hoạt động Đoàn - Hội"
  const doanPosts = useMemo(() => {
    return allPublishedPosts
      .filter((p) => p.categoryNames?.some((c) => c.includes("Đoàn") || c.includes("Hội") || c.includes("Phong trào")))
      .slice(0, 4);
  }, [allPublishedPosts]);

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20">
      {/* ===== Tuổi Trẻ Header Bar & Sub-Nav ===== */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 rounded-full bg-rose-600 animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-rose-600">
                  Tin tức &amp; Sự kiện 24/7
                </span>
              </div>
              <h1 className="mt-1 font-serif text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                Cổng Tin tức Thanh niên Trường học
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={openContribute}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition hover:brightness-110"
              >
                <PenLine className="h-4 w-4" /> Đóng góp tin bài
              </button>
            </div>
          </div>

          {/* Thanh chuyên mục ngang chuẩn Tuổi Trẻ */}
          <nav className="mt-4 flex items-center gap-1 overflow-x-auto border-t border-slate-100 pt-3 text-xs scrollbar-hide">
            {TUOI_TRE_CATEGORIES.map((catName) => {
              const active = selectedCat === catName || (catName === "Tất cả" && selectedCat === "all");
              return (
                <button
                  key={catName}
                  type="button"
                  onClick={() => setSelectedCat(catName === "Tất cả" ? "all" : catName)}
                  className={`shrink-0 rounded-lg px-3.5 py-1.5 font-bold transition-all ${
                    active
                      ? "bg-rose-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {catName}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-7xl px-4 sm:px-6">
        {/* ===== Ô tìm kiếm & Bộ lọc nhanh ===== */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchRef}
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm kiếm bài viết theo từ khóa, tiêu đề, tác giả..."
              className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-12 text-xs text-slate-800 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
              ⌘K
            </kbd>
          </div>

          {q.trim() || (selectedCat !== "all" && selectedCat !== "Tất cả") ? (
            <button
              type="button"
              onClick={() => {
                setQ("");
                setSelectedCat("all");
              }}
              className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
            >
              <X className="h-3.5 w-3.5" /> Xóa bộ lọc
            </button>
          ) : null}
        </div>

        {/* ===== KHỐI HERO TUỔI TRẺ (SPOTLIGHT 3 CỘT) ===== */}
        {filteredPosts.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Cột 1: Bài tiêu điểm chính (To bản sắc nét - 6/12) */}
            {heroLead ? (
              <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md lg:col-span-6">
                <Link href={`/tin-tuc/${heroLead.slug}`} className="block">
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                    <PhotoPlaceholder
                      seed={heroLead.coverSeed}
                      src={postCoverRaw(heroLead)}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute left-3 top-3 flex items-center gap-2">
                      <span className="rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-black uppercase text-white shadow">
                        {heroLead.categoryNames?.[0] || "Tiêu điểm"}
                      </span>
                      {heroLead.isFeatured ? (
                        <span className="rounded-lg bg-amber-400 px-2 py-1 text-[10px] font-bold text-slate-900 shadow">
                          NỔI BẬT
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="p-5 sm:p-6">
                    <h2 className="font-serif text-xl font-black leading-tight text-slate-900 transition group-hover:text-rose-600 sm:text-2xl">
                      {heroLead.title}
                    </h2>

                    <p className="mt-3 font-serif text-sm italic leading-relaxed text-slate-600 line-clamp-3">
                      {heroLead.subtitle || heroLead.excerpt}
                    </p>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400">
                      <span className="font-semibold text-slate-700">{heroLead.authorOrgUnitName}</span>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDateTime(heroLead.publishedAt ?? heroLead.createdAt)}
                        </span>
                        {heroLead.viewCount > 0 ? (
                          <span className="flex items-center gap-1">
                            <Eye className="h-3.5 w-3.5" />
                            {formatNumber(heroLead.viewCount)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Link>
              </article>
            ) : null}

            {/* Cột 2: Danh sách 3 tin nóng kế bên (3/12) */}
            <div className="space-y-4 lg:col-span-3">
              {subFeaturedPosts.map((p) => (
                <article
                  key={p.id}
                  className="group rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-slate-300 hover:shadow"
                >
                  <Link href={`/tin-tuc/${p.slug}`} className="block">
                    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-slate-100">
                      <PhotoPlaceholder
                        seed={p.coverSeed}
                        src={postCoverRaw(p)}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      <span className="absolute left-2 top-2 rounded bg-slate-900/70 px-2 py-0.5 text-[10px] font-bold text-white">
                        {p.categoryNames?.[0] || "Tin tức"}
                      </span>
                    </div>

                    <h3 className="mt-2.5 font-serif text-sm font-bold leading-snug text-slate-900 transition group-hover:text-rose-600 line-clamp-2">
                      {p.title}
                    </h3>

                    <p className="mt-1 text-[11px] text-slate-400">
                      {formatDateTime(p.publishedAt ?? p.createdAt)}
                    </p>
                  </Link>
                </article>
              ))}
            </div>

            {/* Cột 3: Sidebar "ĐỌC NHIỀU NHẤT" chuẩn Tuổi Trẻ (3/12) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3">
              <div className="flex items-center gap-2 border-b border-rose-500 pb-2.5">
                <Flame className="h-5 w-5 text-rose-600" />
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                  Đọc nhiều nhất
                </h3>
              </div>

              <div className="mt-3 divide-y divide-slate-100">
                {topTrendingPosts.map((p, idx) => (
                  <Link
                    key={p.id}
                    href={`/tin-tuc/${p.slug}`}
                    className="group flex items-start gap-3 py-3 transition hover:bg-slate-50/50"
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-serif text-base font-black ${
                        idx === 0
                          ? "bg-rose-600 text-white shadow-sm"
                          : idx === 1
                          ? "bg-amber-500 text-white"
                          : idx === 2
                          ? "bg-blue-500 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-serif text-xs font-bold leading-snug text-slate-800 transition group-hover:text-rose-600 line-clamp-2">
                        {p.title}
                      </p>
                      <span className="mt-1 block text-[10px] text-slate-400">
                        {p.viewCount > 0 ? `${formatNumber(p.viewCount)} lượt xem` : "Mới cập nhật"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-3 font-serif text-base font-bold text-slate-800">
              Không tìm thấy bài viết phù hợp
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Vui lòng thử tìm kiếm với từ khóa khác hoặc chọn chuyên mục khác.
            </p>
          </div>
        )}

        {/* ===== KHỐI CHUYÊN MỤC 1: THANH NIÊN TRƯỜNG HỌC ===== */}
        {schoolPosts.length > 0 ? (
          <section className="mt-12">
            <div className="flex items-center justify-between border-b-2 border-blue-600 pb-2">
              <div className="flex items-center gap-2">
                <span className="h-4 w-1.5 rounded-full bg-blue-600" />
                <h2 className="font-serif text-lg font-black uppercase tracking-tight text-slate-900">
                  Thanh niên Trường học &amp; Học sinh 3 tốt
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCat("Thanh niên trường học")}
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
              >
                Xem tất cả <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {schoolPosts.map((p) => (
                <article
                  key={p.id}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                >
                  <Link href={`/tin-tuc/${p.slug}`} className="block">
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                      <PhotoPlaceholder
                        seed={p.coverSeed}
                        src={postCoverRaw(p)}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-4">
                      <span className="text-[10px] font-bold uppercase text-blue-600">
                        {p.categoryNames?.[0] || "Trường học"}
                      </span>
                      <h3 className="mt-1 font-serif text-sm font-bold leading-snug text-slate-900 transition group-hover:text-blue-600 line-clamp-2">
                        {p.title}
                      </h3>
                      <p className="mt-1.5 text-xs text-slate-500 line-clamp-2">
                        {p.subtitle || p.excerpt}
                      </p>
                      <p className="mt-3 text-[10px] text-slate-400">
                        {p.authorOrgUnitName} · {formatDateTime(p.publishedAt ?? p.createdAt)}
                      </p>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {/* ===== KHỐI CHUYÊN MỤC 2: HOẠT ĐỘNG ĐOÀN - HỘI CƠ SỞ ===== */}
        {doanPosts.length > 0 ? (
          <section className="mt-12">
            <div className="flex items-center justify-between border-b-2 border-emerald-600 pb-2">
              <div className="flex items-center gap-2">
                <span className="h-4 w-1.5 rounded-full bg-emerald-600" />
                <h2 className="font-serif text-lg font-black uppercase tracking-tight text-slate-900">
                  Hoạt động Đoàn - Hội Cơ sở
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCat("Hoạt động Đoàn - Hội")}
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:underline"
              >
                Xem tất cả <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {doanPosts.map((p) => (
                <article
                  key={p.id}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                >
                  <Link href={`/tin-tuc/${p.slug}`} className="block">
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                      <PhotoPlaceholder
                        seed={p.coverSeed}
                        src={postCoverRaw(p)}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-4">
                      <span className="text-[10px] font-bold uppercase text-emerald-600">
                        {p.categoryNames?.[0] || "Đoàn - Hội"}
                      </span>
                      <h3 className="mt-1 font-serif text-sm font-bold leading-snug text-slate-900 transition group-hover:text-emerald-600 line-clamp-2">
                        {p.title}
                      </h3>
                      <p className="mt-1.5 text-xs text-slate-500 line-clamp-2">
                        {p.subtitle || p.excerpt}
                      </p>
                      <p className="mt-3 text-[10px] text-slate-400">
                        {p.authorOrgUnitName} · {formatDateTime(p.publishedAt ?? p.createdAt)}
                      </p>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {/* ===== DANH SÁCH BÀI VIẾT TỔNG HỢP ===== */}
        <section className="mt-12">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <BookOpen className="h-4 w-4 text-slate-600" />
            <h2 className="font-serif text-base font-black uppercase tracking-tight text-slate-900">
              Dòng tin tức mới nhất ({filteredPosts.length})
            </h2>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredPosts.map((p) => (
              <article
                key={p.id}
                className="group flex gap-4 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:shadow-md"
              >
                <Link href={`/tin-tuc/${p.slug}`} className="flex w-full gap-3.5">
                  <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                    <PhotoPlaceholder
                      seed={p.coverSeed}
                      src={postCoverRaw(p)}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase text-rose-600">
                      {p.categoryNames?.[0] || "Tin tức"}
                    </span>
                    <h3 className="font-serif text-xs font-bold leading-snug text-slate-900 transition group-hover:text-rose-600 line-clamp-2">
                      {p.title}
                    </h3>
                    <p className="mt-1 text-[11px] text-slate-500 line-clamp-1">
                      {p.subtitle || p.excerpt}
                    </p>
                    <span className="mt-2 block text-[10px] text-slate-400">
                      {formatDateTime(p.publishedAt ?? p.createdAt)}
                    </span>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </section>
      </div>

      {/* ===== Modal đóng góp bài viết ===== */}
      <Modal
        open={contribOpen}
        onClose={() => !cBusy && setContribOpen(false)}
        title={
          <span className="inline-flex items-center gap-2">
            <PenLine className="h-4 w-4 text-blue-600" /> Đóng góp bài viết chuyên mục
          </span>
        }
        footer={
          <>
            <button
              type="button"
              onClick={() => setContribOpen(false)}
              disabled={cBusy}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={submitContribution}
              disabled={cBusy}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
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
            <Input value={cTitle} onChange={(e) => setCTitle(e.target.value)} placeholder="Ví dụ: Hội thi Tin học trẻ - Khởi nguồn đam mê số…" />
          </Field>
          <Field label="Tóm tắt" hint="Để trống sẽ tự lấy 150 ký tự đầu của nội dung">
            <Textarea value={cExcerpt} onChange={(e) => setCExcerpt(e.target.value)} className="min-h-16" placeholder="1–2 câu tóm tắt ý nghĩa bài viết" />
          </Field>
          <Field label="Nội dung" required hint="Tối thiểu 40 ký tự — nội dung rõ ràng, lành mạnh sẽ qua AI ngay">
            <Textarea value={cContent} onChange={(e) => setCContent(e.target.value)} className="min-h-36" />
          </Field>
          <Field label="Ảnh bìa (không bắt buộc)" hint="PNG/JPG tối đa 10MB">
            {cCover ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cCover} alt="Ảnh bìa" className="h-16 w-28 rounded-lg object-cover ring-1 ring-slate-200" />
                <span className="min-w-0 flex-1 truncate text-xs text-slate-500">{cCoverName}</span>
                <button
                  type="button"
                  onClick={() => { setCCover(undefined); setCCoverName(""); }}
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-red-500"
                  aria-label="Bỏ ảnh"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600">
                <ImagePlus className="h-4 w-4" /> Chọn ảnh từ máy tính
                <input type="file" accept="image/*" className="hidden" onChange={(e) => pickCover(e.target.files?.[0] ?? null)} />
              </label>
            )}
          </Field>
          <p className="rounded-lg bg-blue-50 px-3 py-2 text-[11px] leading-relaxed text-blue-700">
            Bài của bạn sẽ đi qua AI kiểm duyệt tự động. Nội dung đạt → Ban Biên tập duyệt đăng và cộng điểm đóng góp vào tài khoản của bạn.
          </p>
        </div>
      </Modal>
    </div>
  );
}
