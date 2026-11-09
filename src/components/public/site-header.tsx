"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  LayoutDashboard,
  LogIn,
  SearchCheck,
  BookOpen,
  MessagesSquare,
  User,
  ChevronDown,
  ClipboardList,
  Trophy,
  FolderOpen,
  ShieldAlert,
  LifeBuoy,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { LanguageSwitcher } from "@/components/public/language-switcher";
import { cn } from "@/lib/utils";

/** Nhóm menu chính xuất hiện trực tiếp trên thanh taskbar/navbar */
const PRIMARY_NAV = [
  { href: "/", label: "Trang chủ" },
  { href: "/gioi-thieu", label: "Giới thiệu" },
  { href: "/tin-tuc", label: "Tin tức" },
  { href: "/binh-chon-hs3t", label: "Học sinh 3 tốt" },
  { href: "/binh-chon-doan-truong", label: "Đoàn trường" },
  { href: "/nhan-tai", label: "Nhân tài" },
  { href: "/dien-dan", label: "Diễn đàn" },
];

/** Nhóm menu phụ nằm trong nút 'Mở rộng ▾' để thanh taskbar không bị quá tải / tràn */
const MORE_NAV = [
  {
    href: "/khao-sat",
    label: "Khảo sát ý kiến",
    icon: ClipboardList,
    desc: "Khảo sát & đóng góp tâm tư học sinh",
  },
  {
    href: "/bang-xep-hang",
    label: "Bảng xếp hạng",
    icon: Trophy,
    desc: "Thi đua công tác Đoàn các cấp",
  },
  {
    href: "/tai-nguyen",
    label: "Kho tài nguyên",
    icon: FolderOpen,
    desc: "Văn bản, biểu mẫu & tài liệu nghiệp vụ",
  },
  {
    href: "/an-toan-hoc-duong",
    label: "An toàn học đường",
    icon: ShieldAlert,
    desc: "Cẩm nang kỹ năng số & học đường an toàn",
  },
  {
    href: "/phan-anh",
    label: "Phản ánh kiến nghị",
    icon: LifeBuoy,
    desc: "Kênh gửi phản ánh tới tổ chức Đoàn",
  },
];

/** Tiện ích hệ sinh thái — nút icon tròn trên navbar kính */
const UTILITIES = [
  { href: "/phan-anh/tra-cuu", label: "Tra cứu phản ánh", icon: SearchCheck },
  { href: "/huong-dan", label: "Hướng dẫn sử dụng", icon: BookOpen },
];

/**
 * Floating Glass Navbar — thanh kính mờ bo tròn lơ lửng trên đỉnh trang,
 * menu pill trượt con nhộng (framer-motion layoutId), có nút 'Mở rộng ▾' chống tràn.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Đóng dropdown khi chuyển trang
  useEffect(() => {
    setMoreOpen(false);
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const isMoreActive = MORE_NAV.some((m) => isActive(m.href));

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4 sm:pt-4">
      {/* Vệ tinh dọn cookie googtrans nếu có */}
      <LanguageSwitcher />

      <motion.div
        initial={{ y: -18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "glass-nav mx-auto flex max-w-7xl items-center justify-between gap-2.5 rounded-2xl py-2 pl-3 pr-2 transition-shadow duration-300 sm:pl-4 sm:pr-3",
          scrolled
            ? "shadow-[0_14px_44px_rgb(15,23,42,0.13)]"
            : "shadow-[0_8px_30px_rgb(15,23,42,0.06)]"
        )}
      >
        {/* Logo + thương hiệu */}
        <Link href="/" className="group flex shrink-0 min-w-0 items-center gap-2.5">
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-900/5 transition-transform duration-300 group-hover:scale-105">
            <img
              src="/logo.png"
              alt="Logo Thanh niên Trường học"
              className="h-full w-full object-contain"
            />
            <span className="pointer-events-none absolute -inset-1 rounded-xl bg-cyan-400/25 opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-black leading-tight tracking-tight text-slate-900 sm:text-[15px]">
              Thanh niên{" "}
              <span className="bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">
                Trường học
              </span>
            </span>
            <span className="hidden truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400 sm:block">
              Cổng thông tin số · TW Đoàn TNCS HCM
            </span>
          </span>
        </Link>

        {/* Desktop nav — dải pill trượt con nhộng + Nút Mở rộng chống tràn taskbar */}
        <nav className="hidden shrink-0 items-center gap-0.5 rounded-full bg-slate-900/[0.045] p-1 lg:flex">
          {PRIMARY_NAV.map((item) => {
            const active = isActive(item.href);
            const className = cn(
              "relative whitespace-nowrap rounded-full px-2 py-1 text-[11.5px] font-medium transition-colors duration-200 xl:px-2.5 xl:py-1.5 xl:text-[12.5px] 2xl:px-3 2xl:text-[13px]",
              active ? "text-slate-900 font-semibold" : "text-slate-500 hover:text-slate-900"
            );
            return (
              <Link key={item.href} href={item.href} className={className}>
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

          {/* NÚT MỞ RỘNG ▾ TRÁNH TRÀN THANH TASKBAR */}
          <div ref={moreRef} className="relative">
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className={cn(
                "relative flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-[11.5px] font-medium transition-colors duration-200 xl:px-2.5 xl:py-1.5 xl:text-[12.5px] 2xl:px-3 2xl:text-[13px]",
                isMoreActive || moreOpen
                  ? "text-slate-900 font-semibold"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              {isMoreActive ? (
                <motion.span
                  layoutId="nav-pill"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  className="absolute inset-0 rounded-full bg-white shadow-[0_2px_12px_rgb(15,23,42,0.10)] ring-1 ring-slate-900/5"
                />
              ) : null}
              <span className="relative z-10">Mở rộng</span>
              <ChevronDown
                className={cn(
                  "relative z-10 h-3 w-3 transition-transform duration-200",
                  moreOpen ? "rotate-180 text-cyan-600" : "text-slate-400"
                )}
              />
            </button>

            {/* Menu Popover mở rộng */}
            <AnimatePresence>
              {moreOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-slate-200/80 bg-white/95 p-2 shadow-[0_20px_50px_rgba(15,23,42,0.15)] backdrop-blur-xl ring-1 ring-slate-900/5 z-50"
                >
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Chuyên mục mở rộng
                  </div>
                  <div className="space-y-1 mt-1">
                    {MORE_NAV.map((m) => {
                      const active = isActive(m.href);
                      const Icon = m.icon;
                      return (
                        <Link
                          key={m.href}
                          href={m.href}
                          onClick={() => setMoreOpen(false)}
                          className={cn(
                            "flex items-start gap-2.5 rounded-xl p-2 text-xs transition-colors",
                            active
                              ? "bg-gradient-to-r from-cyan-50 to-blue-50 text-slate-900 font-bold"
                              : "text-slate-700 hover:bg-slate-100/70"
                          )}
                        >
                          <div
                            className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg mt-0.5",
                              active
                                ? "bg-cyan-500 text-white"
                                : "bg-slate-100 text-slate-600"
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="leading-tight">{m.label}</span>
                              {active && (
                                <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                              )}
                            </div>
                            <p className="mt-0.5 text-[10.5px] font-normal text-slate-400 line-clamp-1">
                              {m.desc}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>

        {/* Cụm phải: tiện ích + CTA */}
        <div className="flex shrink-0 items-center gap-1.5">
          <div className="hidden items-center gap-0.5 2xl:flex">
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
            <span className="mx-1 h-5 w-px bg-slate-200" />
          </div>
          {session?.role === "DOAN_VIEN" ? (
            <Link
              href="/tai-khoan"
              className="hidden shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-[12.5px] font-semibold text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700 sm:inline-flex"
              aria-label="Tài khoản của tôi"
            >
              <User className="h-3.5 w-3.5" /> Tài khoản
            </Link>
          ) : null}
          <Link
            href={session ? (session.role === "DOAN_VIEN" ? "/dien-dan" : "/quan-tri") : "/dang-nhap"}
            className="hidden shrink-0 whitespace-nowrap items-center gap-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-3.5 py-1.5 text-[12.5px] font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:brightness-110 sm:inline-flex"
          >
            {session ? (
              session.role === "DOAN_VIEN" ? (
                <MessagesSquare className="h-3.5 w-3.5" />
              ) : (
                <LayoutDashboard className="h-3.5 w-3.5" />
              )
            ) : (
              <LogIn className="h-3.5 w-3.5" />
            )}
            {session
              ? session.role === "DOAN_VIEN"
                ? "Diễn đàn"
                : "Khu quản trị"
              : "Đăng nhập"}
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

      {/* Mobile dropdown — tấm kính thứ hai trượt xuống chứa đầy đủ tất cả menu */}
      <AnimatePresence>
        {open ? (
          <motion.nav
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="glass-nav thin-scrollbar mx-auto mt-2 max-h-[calc(100dvh-5.5rem)] max-w-7xl overflow-y-auto rounded-2xl p-3 shadow-[0_14px_44px_rgb(15,23,42,0.12)] lg:hidden"
          >
            {[...PRIMARY_NAV, ...MORE_NAV].map((item) => {
              const active = isActive(item.href);
              const className = cn(
                "flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium",
                active
                  ? "bg-gradient-to-r from-cyan-50 to-blue-50 text-slate-900 font-bold"
                  : "text-slate-600 hover:bg-slate-900/[0.04]"
              );
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={className}
                >
                  <span>{item.label}</span>
                  {active ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                  ) : null}
                </Link>
              );
            })}
            <div className="mt-2 grid grid-cols-2 gap-2">
              {UTILITIES.map((u) => (
                <Link
                  key={u.href}
                  href={u.href}
                  onClick={() => setOpen(false)}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-white/70 bg-white/70 px-2 py-2.5 text-center text-[11px] font-medium text-slate-600"
                >
                  <u.icon className="h-4 w-4 text-cyan-600" strokeWidth={1.75} />
                  {u.label}
                </Link>
              ))}
            </div>
            {session?.role === "DOAN_VIEN" ? (
              <Link
                href="/tai-khoan"
                onClick={() => setOpen(false)}
                className="mt-2 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700"
              >
                <User className="h-4 w-4" /> Tài khoản của tôi
              </Link>
            ) : null}
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
