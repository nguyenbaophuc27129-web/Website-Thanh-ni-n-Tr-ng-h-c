"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Newspaper, FileText, Trophy, LifeBuoy, FolderOpen, ArrowRight, Users, Activity as ActivityIcon, Landmark,
} from "lucide-react";
import { useStore } from "@/lib/store-context";
import { HeroBanner, Hs3tBanner } from "@/components/public/hero-banner";
import { NewsCard } from "@/components/public/news-card";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { formatNumber, formatDate } from "@/lib/utils";

const QUICK_LINKS = [
  { href: "/tin-tuc", label: "Tin tức hoạt động", desc: "Phong trào từ các Đoàn trường, Đoàn phường", icon: Newspaper, tone: "bg-doan-50 text-doan-600" },
  { href: "/van-ban", label: "Văn bản chỉ đạo", desc: "Chỉ thị, kế hoạch, hướng dẫn các cấp", icon: FileText, tone: "bg-sky-50 text-sky-600" },
  { href: "/bang-xep-hang", label: "Bảng xếp hạng thi đua", desc: "Kết quả đã chốt theo kỳ", icon: Trophy, tone: "bg-amber-50 text-amber-600" },
  { href: "/phan-anh", label: "Góp ý — Phản ánh", desc: "Gửi không cần đăng nhập, có mã tra cứu", icon: LifeBuoy, tone: "bg-emerald-50 text-emerald-600" },
  { href: "/tai-nguyen", label: "Kho tài nguyên", desc: "Tài liệu, biểu mẫu, sản phẩm truyền thông", icon: FolderOpen, tone: "bg-violet-50 text-violet-600" },
  { href: "/gioi-thieu", label: "Giới thiệu hệ thống", desc: "Về cổng và hướng dẫn sử dụng", icon: Landmark, tone: "bg-stone-100 text-stone-600" },
];

export default function HomePage() {
  const { publishedPosts, rankingSnapshots, rankingEntries, orgName, activities } = useStore();

  const featured = useMemo(
    () => publishedPosts.filter((p) => p.status === "PUBLISHED" && p.isFeatured).slice(0, 3),
    [publishedPosts]
  );
  const latest = useMemo(
    () =>
      publishedPosts
        .filter((p) => p.status === "PUBLISHED")
        .sort((a, b) => (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt))
        .slice(0, 6),
    [publishedPosts]
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
      <HeroBanner featured={featured.length > 0 ? featured : latest.slice(0, 3)} />

      {/* Stats strip */}
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-6 sm:grid-cols-4">
          {[
            { label: "Hoạt động đã xác nhận", value: formatNumber(totalActivities), icon: ActivityIcon },
            { label: "Lượt đoàn viên tham gia", value: formatNumber(totalParticipants), icon: Users },
            { label: "Tin bài công khai", value: formatNumber(publishedPosts.filter((p) => p.status === "PUBLISHED").length), icon: Newspaper },
            { label: "Đơn vị tham gia hệ thống", value: formatNumber(28), icon: Landmark },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-doan-50 text-doan-600">
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-bold text-stone-900">{s.value}</p>
                <p className="text-[11px] text-stone-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10">
        {/* Quick links */}
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

        {/* Latest news + ranking preview */}
        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          <section className="lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="font-serif-display text-xl font-bold text-stone-900">Tin tức mới nhất</h2>
              <Link href="/tin-tuc" className="inline-flex items-center gap-1 text-xs font-medium text-doan-600 hover:underline">
                Xem tất cả <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {latest.map((p) => (
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
      </div>
    </>
  );
}
