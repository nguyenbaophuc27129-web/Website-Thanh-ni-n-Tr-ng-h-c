"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Newspaper, FileText, Trophy, LifeBuoy, FolderOpen, ArrowRight, Users, Activity as ActivityIcon, Landmark,
  ArrowUpRight, GraduationCap, QrCode, Award, Heart, FlaskConical, Globe2, Flag,
} from "lucide-react";

import { useStore } from "@/lib/store-context";
import { HeroBanner, Hs3tBanner } from "@/components/public/hero-banner";
import { NewsCard } from "@/components/public/news-card";
import { Reveal, CountUp } from "@/components/public/reveal";
import { PhotoPlaceholder } from "@/components/ui/photo-placeholder";
import { GlowCarousel } from "@/components/public/glow-carousel";
import { SpotlightBento } from "@/components/public/spotlight-bento";
import { StoryFlow } from "@/components/public/story-flow";
import { SponsorStrip } from "@/components/public/sponsor-strip";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { formatDate, formatNumber } from "@/lib/utils";
import { PROGRAMS, CERT_PORTAL_URL } from "@/data/programs";
import { SPECIAL_CATEGORIES } from "@/data/categories";

/** Icon của hệ thống nút chuyên mục đặc biệt (thứ tự khớp SPECIAL_CATEGORIES) */
const SPECIAL_ICONS = [Award, Heart, FlaskConical, Globe2, Flag, Newspaper];
const SPECIAL_TONES = [
  "bg-vang-100 text-vang-600",
  "bg-rose-50 text-rose-600",
  "bg-cyan-50 text-cyan-600",
  "bg-sky-50 text-sky-600",
  "bg-red-50 text-red-600",
  "bg-doan-50 text-doan-600",
];

const QUICK_LINKS = [
  { href: "/tin-tuc", label: "Tin tức hoạt động", desc: "Phong trào từ các Đoàn trường, Đoàn phường", icon: Newspaper, tone: "bg-doan-50 text-doan-600" },
  { href: "/van-ban", label: "Văn bản chỉ đạo", desc: "Chỉ thị, kế hoạch, hướng dẫn các cấp", icon: FileText, tone: "bg-sky-50 text-sky-600" },
  { href: "/bang-xep-hang", label: "Bảng xếp hạng thi đua", desc: "Kết quả đã chốt theo kỳ", icon: Trophy, tone: "bg-amber-50 text-amber-600" },
  { href: "/phan-anh", label: "Góp ý — Phản ánh", desc: "Gửi không cần đăng nhập, có mã tra cứu", icon: LifeBuoy, tone: "bg-emerald-50 text-emerald-600" },
  { href: "/tai-nguyen", label: "Kho tài nguyên", desc: "Tài liệu, biểu mẫu, sản phẩm truyền thông", icon: FolderOpen, tone: "bg-violet-50 text-violet-600" },
  { href: "/gioi-thieu", label: "Giới thiệu hệ thống", desc: "Về cổng và hướng dẫn sử dụng", icon: Landmark, tone: "bg-stone-100 text-stone-600" },
];

/* 🔗 CỔNG DỊCH VỤ LIÊN THÔNG — CERT_PORTAL_URL / HS3T_PORTAL_URL chuyển sang @/data/programs */

/* Icon Facebook dạng SVG nhúng (lucide đã bỏ brand icon) */
function FbIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.52 1.5-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.45 2.9h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
    </svg>
  );
}

export default function HomePage() {
  const { publishedPosts, rankingSnapshots, rankingEntries, orgName, activities } = useStore();

  const published = useMemo(
    () =>
      publishedPosts
        .filter((p) => p.status === "PUBLISHED")
        .sort((a, b) => (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt)),
    [publishedPosts]
  );
  const featured = useMemo(
    () => {
      const f = published.filter((p) => p.isFeatured);
      return f.length > 0 ? f : published.slice(0, 3);
    },
    [published]
  );
  // Tin tiêu điểm 01–06; lưới "mới nhất" = 6 tin tiếp theo
  const gridNews = published.slice(6, 12);
  const ticker = published.slice(0, 8).map((p) => p.title);
  // Tin tiêu điểm: loại bài đang đứng ở hero để không trùng — 1 chính + 1 vừa + 4 dòng
  const bentoPosts = useMemo(
    () => published.filter((q) => q.id !== featured[0]?.id).slice(0, 6),
    [published, featured]
  );
  // Chuyên mục trang chủ — bài gắn tag tự động chảy vào khu vực tương ứng
  const storyPosts = useMemo(
    () => published.filter((p) => p.categoryNames.includes("Mỗi tuần một câu chuyện đẹp")),
    [published]
  );
  // Chuyên mục bản tin nghiên cứu — mảng bài cho Ambilight Theatre
  const researchPosts = useMemo(
    () =>
      published.filter(
        (p) =>
          p.categoryNames.includes("Bản tin nghiên cứu khoa học") ||
          p.categoryNames.includes("Nghiên cứu khoa học")
      ),
    [published]
  );

  const publishedSnapshot = useMemo(
    () => rankingSnapshots.filter((s) => s.status === "FINALIZED").sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0],
    [rankingSnapshots]
  );
  const topEntries = useMemo(() => {
    if (!publishedSnapshot) return [];
    return rankingEntries
      .filter((e) => e.snapshotId === publishedSnapshot.id)
      .sort((a, b) => a.rankPosition - b.rankPosition)
      .slice(0, 5);
  }, [rankingEntries, publishedSnapshot]);

  const totalActivities = activities.filter((a) => a.confirmStatus === "CONFIRMED").length;
  const totalParticipants = activities.reduce((s, a) => s + (a.participantCount ?? 0), 0);

  return (
    <>
      <HeroBanner featured={featured} ticker={ticker} />

      {/* Khối thống kê kính mờ — nổi trên ranh giới dưới hero */}
      <div className="relative z-20 mx-auto -mt-10 max-w-6xl px-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-3xl border border-white/15 bg-[#0b1730]/85 px-6 py-5 shadow-[0_24px_60px_-22px_rgba(8,47,73,0.55)] backdrop-blur-xl sm:grid-cols-4 sm:px-8">
          {/* 2 ô số liệu trực tiếp từ hệ thống */}
          {[
            { label: "Hoạt động đã xác nhận", value: totalActivities, icon: ActivityIcon },
            { label: "Lượt đoàn viên tham gia", value: totalParticipants, icon: Users },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-300/25 bg-cyan-400/10 text-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.25)]">
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-black text-white">
                  <CountUp value={s.value} />
                </p>
                <p className="text-[10.5px] leading-tight text-sky-200/65">{s.label}</p>
              </div>
            </div>
          ))}

          {/* 2 ô cổng dịch vụ — chứng nhận mở website riêng, HS3T là trang nội bộ */}
          {[
            { label: "Tra cứu chứng nhận TW", sub: "Học sinh 3 tốt · quét QR kiểm thực", href: CERT_PORTAL_URL, icon: QrCode, internal: false },
            { label: "Học sinh 3 TỐT", sub: "Hồ sơ thành tích số · xét danh hiệu", href: "/hoc-sinh-3-tot", icon: GraduationCap, internal: true },
          ].map((s) => (
            <a
              key={s.label}
              href={s.href}
              {...(s.internal ? {} : { target: "_blank", rel: "noreferrer" })}
              className="group flex items-center gap-3 rounded-xl border border-cyan-300/25 bg-cyan-400/10 px-3 py-2 transition-all duration-300 hover:border-cyan-300/60 hover:bg-cyan-400/20 hover:shadow-[0_0_26px_rgba(34,211,238,0.28)]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-400/15 text-cyan-200">
                <s.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-bold text-white">{s.label}</span>
                <span className="block text-[10.5px] leading-tight text-sky-200/70">{s.sub}</span>
              </span>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-cyan-300 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          ))}
        </div>
      </div>

      {/* ⭐ Ba chương trình trọng tâm — 1 đang chạy + 2 giai đoạn sắp ra mắt */}
      <Reveal className="mx-auto mt-14 max-w-6xl px-4">
        <section>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-serif-display text-xl font-bold text-stone-900">Ba chương trình trọng tâm</h2>
              <p className="mt-1 text-sm text-stone-500">Hành trình triển khai của chương trình Thanh niên Trường học theo 3 giai đoạn.</p>
            </div>
            <span className="hidden items-center gap-1.5 text-xs font-medium text-stone-400 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Giai đoạn 1 đang chạy
            </span>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {PROGRAMS.map((p, i) => {
              const inner = (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/30 backdrop-blur">
                      <p.icon className="h-5.5 w-5.5 text-white" />
                    </span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${p.phase === 1 ? "bg-white text-emerald-700" : "bg-white/15 text-white ring-1 ring-white/30"}`}>
                      {p.phase === 1 ? (
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        </span>
                      ) : null}
                      {p.phaseLabel}
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-bold leading-snug text-white">{p.title}</h3>
                  <p className="mt-1.5 flex-1 text-xs leading-relaxed text-white/80">{p.desc}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-white">
                    {p.phase === 1 ? "Mở cổng chương trình" : "Xem lộ trình triển khai"}
                    {p.external ? (
                      <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    ) : (
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    )}
                  </span>
                </>
              );
              const cls = `group relative flex min-h-52 flex-col overflow-hidden rounded-3xl bg-gradient-to-br ${p.grad} p-5 shadow-lg shadow-slate-900/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`;
              return p.external ? (
                <a key={p.key} href={p.href} target="_blank" rel="noreferrer" className={cls}>
                  {inner}
                </a>
              ) : (
                <Link key={p.key} href={p.href} className={cls}>
                  {inner}
                </Link>
              );
            })}
          </div>
        </section>
      </Reveal>

      {/* 🫧 Tin tiêu điểm — Bento Master & Satellite (đồng bộ sắc xanh nhạt) */}
      {bentoPosts.length > 0 ? <SpotlightBento posts={bentoPosts} /> : null}

      {/* ❤️ MỖI NGÀY MỘT TIN TỐT, MỖI TUẦN MỘT CÂU CHUYỆN ĐẸP — Dòng truyện ánh sáng (chuyên mục riêng, trống thì lấy bài mới) */}
      {published.length > 0 ? (
        <GlowCarousel posts={(storyPosts.length > 0 ? storyPosts : published).slice(0, 12)} />
      ) : null}

      {/* 🌌 STORY FLOW — Dòng chảy ấn phẩm: Infographic số liệu + Poster NCKH, nền đêm liền mạch */}
      <StoryFlow posts={researchPosts} />

      <div className="mx-auto max-w-7xl px-4 py-10">
        {/* Hệ thống nút chuyên mục đặc biệt — lọc trang tin theo tag, giai đoạn sau nâng thành trang riêng */}
        <Reveal>
          <section>
            <h2 className="font-serif-display text-xl font-bold text-stone-900">Chuyên mục nổi bật</h2>
            <p className="mt-1 text-sm text-stone-500">Gương mặt tiêu biểu, tin tốt và hành trình tuổi trẻ — chọn chuyên mục để xem bài liên quan.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {SPECIAL_CATEGORIES.map((c, i) => {
                const Icon = SPECIAL_ICONS[i] ?? Newspaper;
                return (
                  <Link
                    key={c.name}
                    href={c.href}
                    className="group flex items-center gap-3.5 rounded-2xl border border-stone-200 bg-white px-4 py-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-doan-200 hover:shadow-md"
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${SPECIAL_TONES[i] ?? "bg-stone-100 text-stone-600"}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-semibold leading-snug text-stone-800 group-hover:text-doan-700">{c.name}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-stone-300 transition-all group-hover:translate-x-0.5 group-hover:text-doan-500" />
                  </Link>
                );
              })}
            </div>
          </section>
        </Reveal>

        {/* Quick links */}
        <Reveal className="mt-10">
          <section>
            <h2 className="font-serif-display text-xl font-bold text-stone-900">Dịch vụ công khai</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {QUICK_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="group flex items-start gap-3.5 rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-doan-200 hover:shadow-md"
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${l.tone}`}>
                    <l.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-stone-900 group-hover:text-doan-700">{l.label}</p>
                    <p className="mt-0.5 text-xs text-stone-500">{l.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </Reveal>

      </div>

      <div className="mx-auto max-w-7xl px-4 pb-12">
        {/* Latest news + ranking preview */}
        <Reveal className="mt-12">
          <div className="grid gap-8 lg:grid-cols-3">
            <section className="lg:col-span-2">
              <div className="flex items-center justify-between">
                <h2 className="font-serif-display text-xl font-bold text-stone-900">Tin tức mới nhất</h2>
                <Link href="/tin-tuc" className="inline-flex items-center gap-1 text-xs font-medium text-doan-600 hover:underline">
                  Xem tất cả <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {gridNews.map((p) => (
                  <NewsCard key={p.id} post={p} />
                ))}
              </div>
            </section>

            <aside className="space-y-8">
              {publishedSnapshot ? (
                <Card>
                  <CardHeader
                    title={
                      <Link href="/bang-xep-hang" className="hover:text-doan-700">
                        {publishedSnapshot.name}
                      </Link>
                    }
                    subtitle={`${formatDate(publishedSnapshot.periodStart)} — ${formatDate(publishedSnapshot.periodEnd)} · ${publishedSnapshot.totalUnits} đơn vị`}
                  />
                  <CardBody className="p-0">
                    <ol className="divide-y divide-stone-100">
                      {topEntries.map((e) => (
                        <li key={e.id} className="flex items-center gap-3 px-5 py-2.5">
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                              e.rankPosition === 1
                                ? "bg-vang-300 text-doan-800"
                                : e.rankPosition === 2
                                  ? "bg-stone-200 text-stone-700"
                                  : e.rankPosition === 3
                                    ? "bg-orange-100 text-orange-700"
                                    : "bg-stone-100 text-stone-500"
                            }`}
                          >
                            {e.rankPosition}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-stone-800">{orgName(e.orgUnitId)}</p>
                          </div>
                          <span className="text-xs font-bold text-doan-700">{e.totalScore}đ</span>
                        </li>
                      ))}
                    </ol>
                    <div className="px-5 pb-4">
                      <Link
                        href="/bang-xep-hang"
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-doan-200 py-2 text-xs font-medium text-doan-700 hover:bg-doan-50"
                      >
                        Xem đầy đủ <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </CardBody>
                </Card>
              ) : null}

              <Hs3tBanner />
            </aside>
          </div>
        </Reveal>

        {/* Kênh Facebook — màn hình trực tiếp từ fanpage, tin + ảnh thật tự cập nhật */}
        <Reveal className="mt-14">
          <section className="relative overflow-hidden rounded-2xl shadow-xl">
            <div className="hero-star-bg absolute inset-0" />
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-vang-300/15 blur-3xl" />
            <div className="absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
            <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-5 lg:py-12">
              <div className="flex flex-col justify-center text-white lg:col-span-2">
                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-vang-200 backdrop-blur">
                  <FbIcon className="h-3.5 w-3.5" /> @thanhnientruonghoctwd
                </span>
                <h2 className="mt-4 font-serif-display text-2xl font-black leading-snug sm:text-3xl">
                  Bức tranh tuổi trẻ trường học — cập nhật mỗi ngày trên Facebook
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-white/75">
                  Fanpage chính thức của chương trình Thanh niên Trường học: hình ảnh hoạt động,
                  khoảnh khắc thi đua và thông báo mới nhất, phát trực tiếp các sự kiện lớn.
                </p>
                <ul className="mt-5 space-y-2.5 text-sm text-white/85">
                  {[
                    "Tin & ảnh hoạt động từ các đơn vị, đăng ngay trong ngày",
                    "Phát trực tiếp lễ phát động, hội thi, lễ tuyên dương",
                    "Thông báo văn bản, kế hoạch quan trọng tới đoàn viên",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2.5">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-vang-300" />
                      {t}
                    </li>
                  ))}
                </ul>
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <a
                    href="https://www.facebook.com/thanhnientruonghoctwd"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#1877F2] px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-[#0e6ae5]"
                  >
                    <FbIcon className="h-4 w-4" /> Theo dõi fanpage
                  </a>
                  <span className="inline-flex items-center gap-2 text-xs text-white/70">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    </span>
                    Bảng tin trực tiếp bên cạnh
                  </span>
                </div>
              </div>

              <div className="lg:col-span-3">
                <div className="mx-auto max-w-[520px] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/25">
                  <div className="flex items-center gap-2.5 border-b border-stone-100 px-4 py-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1877F2] text-white">
                      <FbIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-stone-900">Thanh niên Trường học — Trung ương Đoàn</p>
                      <p className="truncate text-[10px] text-stone-400">facebook.com/thanhnientruonghoctwd</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-doan-50 px-2 py-0.5 text-[10px] font-bold text-doan-700">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-doan-500 opacity-70" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-doan-500" />
                      </span>
                      TRỰC TIẾP
                    </span>
                  </div>
                  <div className="flex justify-center overflow-x-auto bg-stone-50 p-2 thin-scrollbar">
                    <iframe
                      src="https://www.facebook.com/plugins/page.php?href=https%3A%2F%2Fwww.facebook.com%2Fthanhnientruonghoctwd&tabs=timeline&width=500&height=580&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true&locale=vi_VN"
                      width={500}
                      height={580}
                      style={{ border: "none", overflow: "hidden" }}
                      scrolling="no"
                      allow="encrypted-media"
                      loading="lazy"
                      title="Bảng tin fanpage Thanh niên Trường học — Trung ương Đoàn"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </Reveal>
      </div>

      <SponsorStrip />
    </>
  );
}
