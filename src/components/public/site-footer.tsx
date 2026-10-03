"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Mail, MapPin, Phone, Send } from "lucide-react";
import { useToast } from "@/lib/toast-context";
import { ScrollTopButton } from "./scroll-top-button";

function FbIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.52 1.5-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.45 2.9h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
    </svg>
  );
}

function YtIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z" />
    </svg>
  );
}

/** Tiêu đề cột — gạch gradient cyan trước chữ uppercase */
function ColTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
      <span className="h-px w-4 bg-gradient-to-r from-cyan-400 to-transparent" />
      {children}
    </h4>
  );
}

/** Link cột — chevron cyan trượt vào khi hover */
function ColLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-1 text-[13px] text-slate-400 transition-colors duration-200 hover:text-white"
    >
      {label}
      <ChevronRight className="h-3 w-3 -translate-x-1 text-cyan-400 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
    </Link>
  );
}

export function SiteFooter() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      toast("Vui lòng nhập email hợp lệ.", "warning");
      return;
    }
    toast(`Đã đăng ký nhận tin tại ${email} — bản demo.`);
    setEmail("");
  };

  return (
    <footer className="portal-footer-bg relative mt-16 overflow-hidden text-slate-300">
      {/* Viền sáng hai lớp trên đỉnh footer */}
      <div className="h-1 bg-gradient-to-r from-cyan-400 via-blue-600 to-indigo-500" />
      <div className="h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

      {/* ===== Band đăng ký nhận tin ===== */}
      <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300/90">
            Bản tin TNTH
          </p>
          <h3 className="mt-1.5 font-serif-display text-2xl font-bold tracking-tight text-white">
            Theo dõi dòng chảy Thanh niên Trường học
          </h3>
          <p className="mt-1.5 max-w-lg text-[13px] font-light leading-relaxed text-slate-400">
            Tin hoạt động, văn bản chỉ đạo và lịch thi đua mới nhất — gửi thẳng vào hộp thư của bạn mỗi tuần.
          </p>
        </div>
        <form
          onSubmit={handleSubscribe}
          className="flex w-full max-w-md shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1.5 backdrop-blur transition-colors duration-300 focus-within:border-cyan-400/50 focus-within:shadow-[0_0_24px_rgba(6,182,212,0.15)]"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email nhận tin của bạn…"
            className="min-w-0 flex-1 bg-transparent px-3.5 text-sm text-white outline-none placeholder:text-slate-500"
          />
          <button
            type="submit"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all duration-300 hover:brightness-110"
          >
            <Send className="h-3.5 w-3.5" />
            Đăng ký
          </button>
        </form>
      </div>

      <div className="mx-auto max-w-7xl px-4">
        <div className="border-t border-white/5" />
      </div>

      {/* ===== Lưới chính ===== */}
      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr_1.15fr]">
        {/* Thương hiệu */}
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white p-1 shadow-[0_0_24px_rgba(6,182,212,0.35)] ring-1 ring-white/25">
              <img src="/logo.png" alt="Logo Thanh niên Trường học" className="h-full w-full object-contain" />
            </span>
            <span>
              <span className="block font-serif-display text-sm font-bold text-white">
                Thanh niên Trường học
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300/80">
                Cổng thông tin số
              </span>
            </span>
          </div>
          <p className="mt-4 text-xs font-light leading-relaxed text-slate-400">
            Cổng thông tin điện tử quản lý hoạt động, thi đua và truyền thông
            thanh niên trường học của Đoàn TNCS Hồ Chí Minh. Bản demo giao diện,
            dữ liệu mẫu không phải dữ liệu thật.
          </p>
          <div className="mt-5 flex items-center gap-2.5">
            <a
              href="https://www.facebook.com/thanhnientruonghoctwd"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 backdrop-blur transition-all duration-300 hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-cyan-300 hover:shadow-[0_0_18px_rgba(6,182,212,0.35)]"
              aria-label="Facebook"
            >
              <FbIcon className="h-4 w-4" />
            </a>
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 backdrop-blur transition-all duration-300 hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-cyan-300 hover:shadow-[0_0_18px_rgba(6,182,212,0.35)]"
              aria-label="YouTube"
            >
              <YtIcon className="h-4 w-4" />
            </span>
          </div>
        </div>

        {/* Khám phá */}
        <div>
          <ColTitle>Khám phá</ColTitle>
          <ul className="mt-4 space-y-2.5">
            {[
              ["/tin-tuc", "Tin tức hoạt động"],
              ["/bang-xep-hang", "Bảng xếp hạng thi đua"],
              ["/dien-dan", "Diễn đàn ẩn danh"],
              ["/tai-nguyen", "Tài nguyên & văn bản"],
            ].map(([href, label]) => (
              <li key={href}>
                <ColLink href={href} label={label} />
              </li>
            ))}
          </ul>
        </div>

        {/* Hệ thống */}
        <div>
          <ColTitle>Hệ thống</ColTitle>
          <ul className="mt-4 space-y-2.5">
            <li><ColLink href="/gioi-thieu" label="Giới thiệu cổng" /></li>
            <li><ColLink href="/huong-dan" label="Hướng dẫn sử dụng" /></li>
            <li><ColLink href="/dang-nhap" label="Đăng nhập khu quản trị" /></li>
            <li><ColLink href="/phan-anh" label="Góp ý — Phản ánh" /></li>
            <li><ColLink href="/phan-anh/tra-cuu" label="Tra cứu phản ánh" /></li>
          </ul>
        </div>

        {/* Liên hệ */}
        <div>
          <ColTitle>Liên hệ</ColTitle>
          <ul className="mt-4 space-y-3.5 text-xs font-light leading-relaxed text-slate-400">
            <li className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-400/20">
                <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />
              </span>
              Số 64 Bà Triệu, Hoàn Kiếm, Hà Nội
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-400/20">
                <Phone className="h-3.5 w-3.5" strokeWidth={1.5} />
              </span>
              Hotline 024.38253271
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-400/20">
                <Mail className="h-3.5 w-3.5" strokeWidth={1.5} />
              </span>
              tnth@doanthanhnienvn.vn
            </li>
          </ul>
        </div>
      </div>

      {/* ===== Bottom bar + watermark TNTH khổng lồ mờ ===== */}
      <div className="relative">
        <p
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -bottom-5 select-none text-center font-serif-display text-[6.5rem] font-black leading-none text-white/[0.04] sm:-bottom-8 sm:text-[9rem]"
        >
          TNTH
        </p>
        <div className="relative mx-auto max-w-7xl px-4">
          <div className="flex flex-col items-center justify-between gap-3 border-t border-white/5 py-5 text-[11px] font-light text-slate-500 sm:flex-row">
            <p>
              © 2026 Ban Thanh niên Trường học — Trung ương Đoàn TNCS Hồ Chí Minh. Bản demo phục vụ trình duyệt chức năng.
            </p>
            <div className="flex items-center gap-5">
              <Link href="/gioi-thieu" className="transition-colors hover:text-cyan-300">Giới thiệu</Link>
              <Link href="/huong-dan" className="transition-colors hover:text-cyan-300">Hướng dẫn</Link>
              <Link href="/phan-anh" className="transition-colors hover:text-cyan-300">Phản ánh</Link>
            </div>
          </div>
        </div>
      </div>
      <ScrollTopButton />
    </footer>
  );
}
