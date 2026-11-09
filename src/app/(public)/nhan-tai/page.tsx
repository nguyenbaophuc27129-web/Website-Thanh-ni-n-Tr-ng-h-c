"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  Telescope,
  GraduationCap,
  Trophy,
  ArrowRight,
  Quote,
  Lightbulb,
  FileText,
  Megaphone,
  Award,
  BookOpen,
  MapPin,
  Calendar,
} from "lucide-react";
import { Reveal } from "@/components/public/reveal";
import { useStore } from "@/lib/store-context";
import { fetchNominations } from "@/lib/de-cu";
import type { Nomination } from "@/types";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

/** Ba trụ cột của cổng nhân tài */
const PILLARS = [
  {
    icon: Telescope,
    title: "Phát hiện",
    grad: "from-amber-400 to-orange-500",
    desc: "Khai thác dữ liệu thành tích học tập, nghiên cứu khoa học và các sân chơi trí tuệ trên Cổng TNTH để tìm kiếm gương mặt tiềm năng sớm nhất có thể.",
  },
  {
    icon: GraduationCap,
    title: "Bồi dưỡng",
    grad: "from-blue-500 to-indigo-600",
    desc: "Kết nối học bổng, cố vấn chuyên môn, khóa rèn luyện kỹ năng và chương trình giao lưu quốc tế dành riêng cho nhân tài trẻ trường học.",
  },
  {
    icon: Trophy,
    title: "Vinh danh — Kết nối",
    grad: "from-emerald-500 to-teal-600",
    desc: "Tôn vinh gương mặt tiêu biểu theo quý; mở sàn giao đổi cơ hội giữa nhân tài trẻ với doanh nghiệp, viện nghiên cứu và cựu học sinh thành đạt.",
  },
];

const ACTIONS = [
  {
    icon: Megaphone,
    title: "Đề cử gương mặt",
    desc: "Đoàn trường đề cử học sinh, sinh viên tiêu biểu kèm minh chứng qua cổng — xét công khai theo quý.",
    href: "/nhan-tai/de-cu",
    cta: "Đề cử gương mặt ngay",
  },
  {
    icon: FileText,
    title: "Chủ trương, chính sách",
    desc: "Văn bản chỉ đạo, bộ tiêu chí phát hiện và chính sách bồi dưỡng nhân tài được tập hợp tại kho tài nguyên.",
    href: "/tai-nguyen?type=CHU_TRUONG_CHINH_SACH",
    cta: "Xem chủ trương, chính sách",
  },
  {
    icon: Lightbulb,
    title: "Giới thiệu nghiên cứu",
    desc: "Có sản phẩm, đề tài khoa học muốn phổ biến? Gửi bài về Ban biên tập qua chức năng đóng góp bài viết.",
    href: `/tin-tuc?cat=${encodeURIComponent("Hành trình khoa học trẻ")}`,
    cta: "Xem Hành trình khoa học trẻ",
  },
];

export default function NhanTaiPage() {
  const { publishedPosts } = useStore();
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [nominationsLoading, setNominationsLoading] = useState(true);
  const [selectedNomination, setSelectedNomination] = useState<Nomination | null>(null);

  useEffect(() => {
    fetchNominations({ limit: 12 })
      .then((res) => {
        if (res.ok) setNominations(res.nominations);
      })
      .catch(() => undefined)
      .finally(() => setNominationsLoading(false));
  }, []);

  const posts = useMemo(
    () =>
      publishedPosts
        .filter((p) => p.status === "PUBLISHED" && p.categoryNames.includes("Nhân tài"))
        .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "")),
    [publishedPosts]
  );

  return (
    <div>
      {/* ===== Hero vàng — tinh tú ===== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1a1405] via-[#2e2410] to-[#0c1e33] text-white">
        <span className="pointer-events-none absolute -right-16 -top-24 h-80 w-80 rounded-full bg-amber-400/20 blur-3xl" />
        <span className="pointer-events-none absolute -bottom-28 left-1/5 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] ring-1 ring-white/25 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Thực hiện kết luận của Tổng Bí thư
          </span>
          <h1 className="mt-4 max-w-3xl text-2xl font-black leading-snug sm:text-4xl">
            Cổng thông tin về nhân tài
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-amber-100/90 sm:text-base">
            Đầu tư cho nhân tài trẻ là đầu tư cho tương lai đất nước. Chuyên trang tập hợp chủ trương,
            chính sách và hoạt động phát hiện — bồi dưỡng — vinh danh những gương mặt xuất sắc của
            tuổi trẻ trường học trên toàn quốc.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pb-14 pt-10">
        {/* ===== Trích chủ trương ===== */}
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-white p-7 shadow-[0_8px_30px_rgb(15,23,42,0.05)] ring-1 ring-slate-200 sm:p-9">
            <Quote className="absolute right-6 top-6 h-10 w-10 text-amber-100" />
            <p className="max-w-3xl text-sm font-medium italic leading-relaxed text-slate-700 sm:text-base">
              “Công tác nhân tài là việc của toàn Đảng, toàn dân; phát hiện, bồi dưỡng, trọng dụng
              nhân tài — nhất là nhân tài trẻ — phải đi liền với tạo môi trường sống, làm việc và
              cống hiến.”
            </p>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Định hướng từ kết luận của Tổng Bí thư về công tác nhân tài
            </p>
          </div>
        </Reveal>

        {/* ===== Ba trụ cột ===== */}
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {PILLARS.map((p, i) => (
            <Reveal key={p.title} delay={i * 80}>
              <div className="flex h-full flex-col rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgb(15,23,42,0.05)] ring-1 ring-slate-200">
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${p.grad} text-white`}>
                  <p.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-base font-bold text-slate-900">{p.title}</h3>
                <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-500">{p.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* ===== Hành động ===== */}
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {ACTIONS.map((a, i) => (
            <Reveal key={a.title} delay={i * 80}>
              <Link
                href={a.href}
                className="flex h-full flex-col rounded-2xl border border-dashed border-slate-300 bg-white/60 p-5 transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50/40"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100/70 text-amber-600">
                  <a.icon className="h-4.5 w-4.5" />
                </span>
                <h3 className="mt-3 text-sm font-bold text-slate-900">{a.title}</h3>
                <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-500">{a.desc}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-amber-600">
                  {a.cta} <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>

        {/* ===== Gương mặt nhân tài tiêu biểu (Được đề cử & Phê duyệt) ===== */}
        <div className="mt-14">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="inline-flex items-center gap-2 text-xl font-bold text-slate-900">
                <Award className="h-5 w-5 text-amber-500" /> Gương mặt nhân tài được vinh danh
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Hồ sơ đề cử từ Đoàn các trường được hội đồng phê duyệt và vinh danh
              </p>
            </div>
            <Link
              href="/nhan-tai/de-cu"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:brightness-110"
            >
              <Megaphone className="h-3.5 w-3.5" /> Gửi hồ sơ đề cử
            </Link>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {nominationsLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center sm:col-span-2 lg:col-span-3 xl:col-span-4">
                <p className="text-xs text-slate-500">Đang tải danh sách gương mặt nhân tài...</p>
              </div>
            ) : nominations.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white/70 p-8 text-center sm:col-span-2 lg:col-span-3 xl:col-span-4">
                <Award className="mx-auto h-10 w-10 text-amber-400/80 mb-2" />
                <h3 className="text-sm font-bold text-slate-800">Chưa có hồ sơ nhân tài trong đợt này</h3>
                <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
                  Các tổ chức Đoàn trường có thể gửi hồ sơ đề cử gương mặt tiêu biểu qua nút &ldquo;Gửi hồ sơ đề cử&rdquo;.
                </p>
                <div className="mt-4">
                  <Link
                    href="/nhan-tai/de-cu"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100"
                  >
                    Đề cử gương mặt ngay
                  </Link>
                </div>
              </div>
            ) : (
              nominations.map((n) => (
                <div
                  key={n.id}
                  onClick={() => setSelectedNomination(n)}
                  className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition-all hover:-translate-y-1 hover:border-amber-300 hover:shadow-lg"
                >
                  <div className="relative aspect-4/3 w-full overflow-hidden bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={n.evidenceThumbDataUrl}
                      alt={n.nomineeName}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <span className="absolute left-2.5 top-2.5 rounded-full bg-slate-900/75 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 backdrop-blur-sm border border-amber-400/30">
                      {n.field}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="font-serif-display text-base font-bold text-slate-900 group-hover:text-amber-800 transition-colors">
                      {n.nomineeName}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {n.nomineePosition ? `${n.nomineePosition} · ` : ""}
                      {n.orgUnitName}
                    </p>
                    {n.provinceName && (
                      <p className="mt-1 text-[11px] text-slate-400 flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-400" /> {n.provinceName}
                      </p>
                    )}

                    {n.quote && (
                      <p className="mt-2 text-xs italic text-slate-600 line-clamp-2 border-l-2 border-amber-400 pl-2">
                        &ldquo;{n.quote}&rdquo;
                      </p>
                    )}

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-600">
                      <span>Xem hồ sơ thành tích</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ===== Gương mặt — tin tức ===== */}
        <div className="mt-14">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="inline-flex items-center gap-2 text-lg font-bold text-slate-900">
              <BookOpen className="h-5 w-5 text-blue-500" /> Tin tức &amp; Hoạt động bồi dưỡng nhân tài
            </h2>
            <Link href="/tin-tuc" className="text-xs font-semibold text-blue-600 hover:underline">
              Xem tất cả tin tức →
            </Link>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {posts.length === 0 ? (
              <p className="rounded-2xl bg-stone-50 px-5 py-8 text-center text-sm text-stone-500 md:col-span-2 xl:col-span-3">
                Các bài viết về công tác nhân tài sẽ được cập nhật trong chuyên mục này.
              </p>
            ) : (
              posts.slice(0, 6).map((p, i) => (
                <Reveal key={p.id} delay={Math.min(i, 5) * 60}>
                  <Link
                    href={`/tin-tuc/${p.slug}`}
                    className="flex h-full flex-col rounded-2xl bg-white p-5 shadow-[0_8px_30px_rgb(15,23,42,0.04)] ring-1 ring-slate-100 transition-all hover:-translate-y-0.5 hover:ring-amber-200"
                  >
                    <h3 className="text-sm font-bold leading-snug text-stone-900">{p.title}</h3>
                    <p className="mt-1.5 line-clamp-3 flex-1 text-xs leading-relaxed text-stone-500">{p.excerpt}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-amber-600">
                      Đọc tiếp <ArrowRight className="h-3 w-3" />
                    </span>
                  </Link>
                </Reveal>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal chi tiết nhân tài */}
      <Modal
        open={!!selectedNomination}
        onClose={() => setSelectedNomination(null)}
        title={selectedNomination ? `Hồ sơ nhân tài: ${selectedNomination.nomineeName}` : ""}
        wide
      >
        {selectedNomination ? (
          <div className="grid gap-6 md:grid-cols-[240px_1fr] items-start">
            <div className="space-y-3">
              <div className="overflow-hidden rounded-2xl border border-amber-300 bg-amber-50 p-1.5 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedNomination.evidenceThumbDataUrl}
                  alt={selectedNomination.nomineeName}
                  className="w-full rounded-xl object-cover max-h-72"
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-1.5">
                <span className="inline-block rounded-md bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold text-amber-950 border border-amber-300">
                  {selectedNomination.field}
                </span>
                <p className="font-bold text-slate-800">{selectedNomination.nomineeName}</p>
                <p className="text-slate-600">
                  {selectedNomination.nomineePosition ? `${selectedNomination.nomineePosition} · ` : ""}
                  {selectedNomination.orgUnitName}
                </p>
                {selectedNomination.provinceName && (
                  <p className="text-slate-500">{selectedNomination.provinceName}</p>
                )}
                {selectedNomination.createdAt && (
                  <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-200 flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Được vinh danh:{" "}
                    {new Date(selectedNomination.createdAt).toLocaleDateString("vi-VN")}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {selectedNomination.quote && (
                <div className="rounded-xl border-l-4 border-amber-500 bg-amber-50/80 p-3.5 text-xs italic text-slate-700 shadow-2xs">
                  &ldquo;{selectedNomination.quote}&rdquo;
                </div>
              )}

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-2 flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-amber-600" /> Quá trình phấn đấu &amp; Thành tích nổi bật
                </h4>
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-700 whitespace-pre-line shadow-xs">
                  {selectedNomination.achievements}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setSelectedNomination(null)}>
                  Đóng
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
