"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogIn, ShieldCheck, Building2, Newspaper, Landmark, School } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useAuth, DEMO_ACCOUNTS, ROLE_LABELS, type DemoAccount } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { cn } from "@/lib/utils";

const roleIcons: Record<string, typeof ShieldCheck> = {
  QUAN_TRI_TW: Landmark,
  QUAN_TRI_TINH: Building2,
  QUAN_TRI_CAP3: Building2,
  DON_VI: School,
  BIEN_TAP_VIEN: Newspaper,
};

export default function DangNhapPage() {
  const { login, loginAs, session, ready } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (ready && session) router.replace("/quan-tri");
  }, [ready, session, router]);

  const handleLogin = (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");
    if (!login(username, password)) {
      setError("Tên đăng nhập hoặc mật khẩu không đúng. Hãy chọn nhanh một tài khoản demo bên dưới.");
    }
  };

  const quickLogin = (acc: DemoAccount) => {
    loginAs(acc);
    toast(`Đã đăng nhập với tư cách ${ROLE_LABELS[acc.role]} — ${acc.orgUnitName}`);
    router.push("/quan-tri");
  };

  return (
    <div className="flex min-h-screen">
      {/* Left brand panel */}
      <div className="hero-star-bg relative hidden w-1/2 flex-col justify-between p-10 text-white lg:flex">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-vang-300 text-doan-700">
            ★
          </div>
          <div>
            <p className="font-serif-display text-lg font-bold leading-tight">Cổng Thanh niên Trường học</p>
            <p className="text-xs text-white/70">Trung ương Đoàn TNCS Hồ Chí Minh</p>
          </div>
        </Link>
        <div>
          <h1 className="font-serif-display text-4xl font-black leading-snug">
            Hệ thống quản lý <br /> hoạt động &amp; thi đua <br /> thanh niên trường học
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/80">
            Bản demo giao diện — dữ liệu mẫu, không kết nối máy chủ. Chọn nhanh một trong 5 tài khoản bên phải để
            trải nghiệm phân quyền 4 cấp: Trung ương → Tỉnh → Phường/Xã → Trường.
          </p>
        </div>
        <p className="text-xs text-white/50">© 2026 Ban Thanh niên Trường học — Trung ương Đoàn</p>
      </div>

      {/* Right form panel */}
      <div className="flex w-full flex-col justify-center bg-stone-50 px-6 py-10 lg:w-1/2 lg:px-16">
        <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-doan-600 lg:hidden">
          <ArrowLeft className="h-4 w-4" /> Về trang chủ
        </Link>

        <h2 className="font-serif-display text-2xl font-bold text-stone-900">Đăng nhập hệ thống</h2>
        <p className="mt-1 text-sm text-stone-500">Dành cho cán bộ Đoàn quản lý đơn vị của mình.</p>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <Field label="Tên đăng nhập" required>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="VD: bd.province"
              autoComplete="username"
            />
          </Field>
          <Field label="Mật khẩu" required hint="Mật khẩu chung tất cả tài khoản demo: demo123">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </Field>
          {error ? (
            <p className="rounded-lg bg-doan-50 px-3 py-2 text-xs text-doan-700">{error}</p>
          ) : null}
          <Button type="submit" size="lg" className="w-full">
            <LogIn className="h-4 w-4" /> Đăng nhập
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-stone-200" />
          <span className="text-xs uppercase tracking-wide text-stone-400">Đăng nhập nhanh (demo)</span>
          <div className="h-px flex-1 bg-stone-200" />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {DEMO_ACCOUNTS.map((acc) => {
            const Icon = roleIcons[acc.role] ?? ShieldCheck;
            return (
              <button
                key={acc.username}
                onClick={() => quickLogin(acc)}
                className={cn(
                  "group flex items-start gap-3 rounded-xl border border-stone-200 bg-white p-3.5 text-left transition-all",
                  "hover:border-doan-300 hover:shadow-md"
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-doan-50 text-doan-600 group-hover:bg-doan-600 group-hover:text-white">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-stone-900">{acc.orgUnitName}</p>
                  <p className="mt-0.5 text-[11px] text-stone-500">{ROLE_LABELS[acc.role]}</p>
                  <code className="mt-1 inline-block rounded bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-600">
                    {acc.username} / demo123
                  </code>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
