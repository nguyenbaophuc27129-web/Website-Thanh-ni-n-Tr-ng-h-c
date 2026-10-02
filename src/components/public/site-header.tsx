"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  LayoutDashboard,
  LogIn,
  Award,
  SearchCheck,
  BookOpen,
  MessagesSquare,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Trang chủ" },
  { href: "/tin-tuc", label: "Tin tức" },
  { href: "/dien-dan", label: "Diễn đàn" },
  { href: "/van-ban", label: "Văn bản" },
  { href: "/bang-xep-hang", label: "Xếp hạng" },
  { href: "/tai-nguyen", label: "Tài nguyên" },
  { href: "/phan-anh", label: "Phản ánh" },
  { href: "/gioi-thieu", label: "Giới thiệu" },
];

/** Tiện ích hệ sinh thái — nút icon tròn trên navbar kính */
const UTILITIES = [
  { href: "/chung-nhan/tra-cuu", label: "Tra cứu chứng nhận", icon: Award },
  { href: "/phan-anh/tra-cuu", label: "Tra cứu phản ánh", icon: SearchCheck },
  { href: "/huong-dan", label: "Hướng dẫn sử dụng", icon: BookOpen },
];

/**
 * Floating Glass Navbar — thanh kính mờ bo tròn lơ lửng trên đỉnh trang,
 * menu pill trượt con nhộng (framer-motion layoutId).
 */
export function SiteHeader() {
  const pathname = usePathname();
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4 sm:pt-4">
      <motion.div
        initial={{ y: -18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "glass-nav mx-auto flex max-w-7xl items-center justify-between gap-3 rounded-2xl py-2 pl-3 pr-2 transition-shadow duration-300 sm:pl-4 sm:pr-3",
          scrolled
            ? "shadow-[0_14px_44px_rgb(15,23,42,0.13)]"
            : "shadow-[0_8px_30px_rgb(15,23,42,0.06)]"
        )}
      >
        {/* Logo + thương hiệu */}
        <Link href="/" className="group flex min-w-0 items-center gap-2.5">
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-900/5 transition-transform duration-300 group-hover:scale-105">
            <img
              src="/logo.png"
              alt="Logo Thanh niên Trường học"
              className="h-full w-full object-contain"
            />
            <span className="pointer-events-none absolute -inset-1 rounded-xl bg-cyan-400/25 opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-black leading-tight tracking-tight text-slate-900">
              Thanh niên{" "}
              <span className="bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">
                Trường học
              </span>
            </span>
            <span className="hidden truncate text-[9.5px] font-semibold uppercase tracking-[0.15em] text-slate-400 sm:block">
              Cổng thông tin số · TW Đoàn TNCS HCM
            </span>
          </span>
        </Link>

        {/* Desktop nav — dải pill trượt con nhộng */}
        <nav className="hidden items-center gap-0.5 rounded-full bg-slate-900/[0.045] p-1 lg:flex">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors duration-200",
                  active ? "text-slate-900" : "text-slate-500 hover:text-slate-900"
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="nav-pill"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    className="absolute inset-0 rounded-full bg-white shadow-[0_2px_12px_rgb(15,23,42,0.10)] ring-1 ring-slate-900/5"
                  />
                ) : null}
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Cụm phải: tiện ích + CTA */}
        <div className="flex shrink-0 items-center gap-1">
          <div className="hidden items-center gap-0.5 xl:flex">
            {UTILITIES.map((u) => (
              <Link
                key={u.href}
                href={u.href}
                title={u.label}
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-cyan-50 hover:text-cyan-600"
              >
                <u.icon className="h-4 w-4" strokeWidth={1.75} />
              </Link>
            ))}
            <span className="mx-1.5 h-5 w-px bg-slate-200" />
          </div>
          <Link
            href={session ? (session.role === "DOAN_VIEN" ? "/dien-dan" : "/quan-tri") : "/dang-nhap"}
            className="hidden items-center gap-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-[13px] font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:brightness-110 sm:inline-flex"
          >
            {session ? (session.role === "DOAN_VIEN" ? <MessagesSquare className="h-4 w-4" /> : <LayoutDashboard className="h-4 w-4" />) : <LogIn className="h-4 w-4" />}
            {session ? (session.role === "DOAN_VIEN" ? "Diễn đàn" : "Khu quản trị") : "Đăng nhập"}
          </Link>
          <button
            className="rounded-full p-2 text-slate-600 transition-colors hover:bg-slate-900/5 lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </motion.div>

      {/* Mobile dropdown — tấm kính thứ hai trượt xuống */}
      <AnimatePresence>
        {open ? (
          <motion.nav
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="glass-nav mx-auto mt-2 max-w-7xl rounded-2xl p-3 shadow-[0_14px_44px_rgb(15,23,42,0.12)] lg:hidden"
          >
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium",
                  isActive(item.href)
                    ? "bg-gradient-to-r from-cyan-50 to-blue-50 text-slate-900"
                    : "text-slate-600 hover:bg-slate-900/[0.04]"
                )}
              >
                {item.label}
                {isActive(item.href) ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                ) : null}
              </Link>
            ))}
            <div className="mt-2 grid grid-cols-3 gap-2">
              {UTILITIES.map((u) => (
                <Link
                  key={u.href}
                  href={u.href}
                  onClick={() => setOpen(false)}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-white/70 bg-white/70 px-2 py-2.5 text-center text-[10.5px] font-medium text-slate-600"
                >
                  <u.icon className="h-4 w-4 text-cyan-600" strokeWidth={1.75} />
                  {u.label}
                </Link>
              ))}
            </div>
            <Link
              href={session ? (session.role === "DOAN_VIEN" ? "/dien-dan" : "/quan-tri") : "/dang-nhap"}
              onClick={() => setOpen(false)}
              className="mt-2 block rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-2.5 text-center text-sm font-semibold text-white shadow-lg shadow-cyan-500/25"
            >
              {session ? (session.role === "DOAN_VIEN" ? "Vào Diễn đàn" : "Khu quản trị") : "Đăng nhập"}
            </Link>
          </motion.nav>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
