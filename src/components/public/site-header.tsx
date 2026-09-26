"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, LayoutDashboard, LogIn, Star } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Trang chủ" },
  { href: "/tin-tuc", label: "Tin tức" },
  { href: "/van-ban", label: "Văn bản" },
  { href: "/bang-xep-hang", label: "Bảng xếp hạng" },
  { href: "/tai-nguyen", label: "Tài nguyên" },
  { href: "/phan-anh", label: "Phản ánh" },
  { href: "/gioi-thieu", label: "Giới thiệu" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { session } = useAuth();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40">
      {/* Top strip */}
      <div className="bg-doan-800 text-[11px] text-white/85">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5">
          <p className="hidden sm:block">Cổng thông tin điện tử về công tác thanh niên trường học — Bản demo giao diện</p>
          <div className="flex items-center gap-4">
            <span>Liên hệ: tnth@doanthanhnienvn.vn</span>
            <span className="hidden sm:inline">ĐT: 024.38253271</span>
          </div>
        </div>
      </div>

      {/* Main bar */}
      <div className="hero-star-bg text-white shadow-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-vang-300 shadow">
              <Star className="h-6 w-6 fill-doan-700 text-doan-700" />
            </div>
            <div>
              <p className="font-serif-display text-base font-bold leading-tight sm:text-lg">
                Cổng Thanh niên Trường học
              </p>
              <p className="text-[11px] text-white/75">
                Trung ương Đoàn TNCS Hồ Chí Minh
              </p>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-white/20 text-vang-200"
                    : "text-white/90 hover:bg-white/10"
                )}
              >
                {item.label}
              </Link>
            ))}
            {session ? (
              <Link
                href="/quan-tri"
                className="ml-2 inline-flex items-center gap-1.5 rounded-lg bg-vang-300 px-3.5 py-2 text-sm font-semibold text-doan-800 shadow hover:bg-vang-200"
              >
                <LayoutDashboard className="h-4 w-4" /> Khu quản trị
              </Link>
            ) : (
              <Link
                href="/dang-nhap"
                className="ml-2 inline-flex items-center gap-1.5 rounded-lg bg-vang-300 px-3.5 py-2 text-sm font-semibold text-doan-800 shadow hover:bg-vang-200"
              >
                <LogIn className="h-4 w-4" /> Đăng nhập
              </Link>
            )}
          </nav>

          {/* Mobile toggle */}
          <button
            className="rounded-md p-2 hover:bg-white/10 lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile nav */}
        {open ? (
          <nav className="border-t border-white/15 px-4 pb-3 lg:hidden">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "block rounded-md px-3 py-2.5 text-sm font-medium",
                  isActive(item.href) ? "bg-white/15 text-vang-200" : "text-white/90 hover:bg-white/10"
                )}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={session ? "/quan-tri" : "/dang-nhap"}
              onClick={() => setOpen(false)}
              className="mt-2 block rounded-md bg-vang-300 px-3 py-2.5 text-center text-sm font-semibold text-doan-800"
            >
              {session ? "Khu quản trị" : "Đăng nhập"}
            </Link>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
