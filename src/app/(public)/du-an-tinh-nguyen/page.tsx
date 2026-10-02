"use client";

import Link from "next/link";
import { Target, Users, Route, ArrowRight, Home, LogIn } from "lucide-react";
import { Reveal } from "@/components/public/reveal";

const BLOCKS = [
  {
    icon: Target,
    title: "Mục tiêu",
    desc: "Mỗi trường THPT xây dựng tối thiểu 01 dự án tình nguyện vì cộng đồng mỗi năm học — có mục tiêu đo lường được, có kết quả kiểm chứng và báo cáo minh bạch trên Cổng TNTH.",
  },
  {
    icon: Users,
    title: "Đối tượng tham gia",
    desc: "Toàn bộ Đoàn trường THPT, PTDT và tương đương trên toàn hệ thống; đoàn viên, thanh niên các trường cùng chung tay thực hiện dự án của đơn vị mình.",
  },
  {
    icon: Route,
    title: "Cách tham gia",
    desc: "Đăng ký dự án qua Ban Chỉ huy Đoàn trường → cập nhật tiến độ, hình ảnh minh chứng trên Cổng → cấp trên xác nhận và chấm điểm thi đua → tổng kết, tuyên dương cuối kỳ.",
  },
];

export default function DuAnTinhNguyenPage() {
  return (
    <div>
      {/* Hero gradient xanh + chip giai đoạn */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-indigo-700 to-blue-900 text-white">
        <span className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
        <span className="pointer-events-none absolute -bottom-24 left-1/4 h-56 w-56 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4 py-16 sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] ring-1 ring-white/25 backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300" />
            </span>
            Giai đoạn 02 — Sắp ra mắt
          </span>
          <h1 className="mt-4 max-w-3xl text-2xl font-black leading-snug sm:text-4xl">
            Mỗi trường THPT — 01 dự án tình nguyện vì cộng đồng
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-blue-100 sm:text-base">
            Chương trình trọng tâm giai đoạn 02 của Thanh niên Trường học: biến phong trào tình nguyện
            thành các dự án cụ thể, đo lường được kết quả vì cộng đồng.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="grid gap-4 md:grid-cols-3">
          {BLOCKS.map((b, i) => (
            <Reveal key={b.title} delay={i * 80}>
              <div className="h-full rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-doan-50 text-doan-600">
                  <b.icon className="h-5 w-5" />
                </span>
                <h2 className="mt-3 text-sm font-bold text-stone-900">{b.title}</h2>
                <p className="mt-1.5 text-xs leading-relaxed text-stone-500">{b.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 rounded-2xl bg-doan-50/70 px-5 py-6 ring-1 ring-doan-100">
          <p className="w-full text-center text-sm font-medium text-doan-800 sm:w-auto">
            Đơn vị của bạn sẵn sàng cho giai đoạn 02?
          </p>
          <Link
            href="/dang-nhap"
            className="inline-flex items-center gap-1.5 rounded-lg bg-doan-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-doan-700"
          >
            <LogIn className="h-4 w-4" /> Đăng nhập khu quản trị
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-doan-200 bg-white px-4 py-2 text-sm font-semibold text-doan-700 hover:bg-doan-50"
          >
            <Home className="h-4 w-4" /> Về trang chủ
          </Link>
          <span className="w-full text-center text-[11px] text-doan-600/80 sm:w-auto">
            Tài khoản demo: tw.admin · bd.province · mật khẩu demo123
          </span>
        </div>
      </div>
    </div>
  );
}
