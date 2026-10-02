"use client";

import Link from "next/link";
import { Target, Users, Route, ArrowRight, Home, LogIn } from "lucide-react";
import { Reveal } from "@/components/public/reveal";

const BLOCKS = [
  {
    icon: Target,
    title: "Mục tiêu",
    desc: "Xây dựng nền tảng thi kiến thức trực tuyến thống nhất toàn hệ thống — thi về lịch sử Đoàn, an toàn giao thông, kỹ năng số và các chuyên đề theo tháng.",
  },
  {
    icon: Users,
    title: "Đối tượng tham gia",
    desc: "Học sinh, sinh viên toàn quốc; Đoàn cơ sở tổ chức thi theo vòng trường — cấp huyện, tỉnh — Trung ương, với bảng xếp hạng trực tiếp.",
  },
  {
    icon: Route,
    title: "Cách tham gia",
    desc: "Đề thi được Ban Biên tập soạn và phát hành trên hệ thống → đơn vị mở vòng thi của mình → đoàn viên thi trực tiếp trên Cổng → kết quả tự tổng hợp vào thi đua.",
  },
];

export default function ThiKienThucPage() {
  return (
    <div>
      {/* Hero gradient xanh + chip giai đoạn */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-500 via-orange-600 to-orange-700 text-white">
        <span className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-amber-300/25 blur-3xl" />
        <span className="pointer-events-none absolute -bottom-24 left-1/4 h-56 w-56 rounded-full bg-red-400/20 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4 py-16 sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] ring-1 ring-white/25 backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-200 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-200" />
            </span>
            Giai đoạn 03 — Sắp ra mắt
          </span>
          <h1 className="mt-4 max-w-3xl text-2xl font-black leading-snug sm:text-4xl">
            Thi kiến thức trực tuyến
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-amber-50 sm:text-base">
            Chương trình trọng tâm giai đoạn 03: học tập và thi thử thách kiến thức trực tuyến,
            kết quả tự động tổng hợp vào bảng xếp hạng thi đua của từng đơn vị.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="grid gap-4 md:grid-cols-3">
          {BLOCKS.map((b, i) => (
            <Reveal key={b.title} delay={i * 80}>
              <div className="h-full rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <b.icon className="h-5 w-5" />
                </span>
                <h2 className="mt-3 text-sm font-bold text-stone-900">{b.title}</h2>
                <p className="mt-1.5 text-xs leading-relaxed text-stone-500">{b.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 rounded-2xl bg-amber-50/70 px-5 py-6 ring-1 ring-amber-100">
          <p className="w-full text-center text-sm font-medium text-amber-800 sm:w-auto">
            Theo dõi lộ trình để không bỏ lỡ vòng thi đầu tiên:
          </p>
          <Link
            href="/dang-nhap"
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-700"
          >
            <LogIn className="h-4 w-4" /> Đăng nhập khu quản trị
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50"
          >
            <Home className="h-4 w-4" /> Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
