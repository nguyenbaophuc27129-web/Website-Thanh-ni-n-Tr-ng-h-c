"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  LogIn,
  Network,
  Trophy,
  Globe2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

/** Đoàn viên chỉ tương tác diễn đàn — còn lại vào trang quản trị */
const destFor = (role: string) => (role === "DOAN_VIEN" ? "/dien-dan" : "/quan-tri");

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export default function DangNhapPage() {
  const { login, session, ready } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (ready && session) router.replace(destFor(session.role));
  }, [ready, session, router]);

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (submitting) return;
    setError("");
    setSubmitting(true);
    try {
      if (await login(username.trim(), password)) {
        // Auth context handles session & redirect via useEffect
      } else {
        setError("Tên đăng nhập hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen bg-slate-50">
      {/* ===== Nút ra màn hình chính — nổi góc trên trái, hiện mọi breakpoint ===== */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
        className="absolute right-5 top-5 z-20 sm:right-8 sm:top-7"
      >
        <Link
          href="/"
          className="group inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/85 py-1.5 pl-1.5 pr-4 text-xs font-semibold text-slate-600 shadow-[0_8px_24px_rgb(15,23,42,0.10)] backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-600 hover:shadow-[0_12px_32px_rgb(37,99,235,0.18)]"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-sm shadow-blue-600/30 transition-transform duration-300 group-hover:-translate-x-0.5">
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
          Về màn hình chính
        </Link>
      </motion.div>

      {/* ===== Nửa trái — Animated Mesh Gradient ===== */}
      <div className="login-mesh relative hidden w-1/2 overflow-hidden text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* Lưới kỹ thuật + khối sáng trôi */}
        <div className="login-grid-overlay pointer-events-none absolute inset-0" />
        <div className="hero-glow-1 pointer-events-none absolute -left-24 top-1/4 h-80 w-80 rounded-full bg-blue-500/25 blur-3xl" />
        <div className="hero-glow-2 pointer-events-none absolute -right-16 top-8 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="hero-glow-3 pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />

        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative flex items-center gap-3"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 p-1.5 ring-1 ring-white/20 backdrop-blur">
            <img src="/logo-tnth-03.png" alt="Logo TNTH" className="h-full w-full object-contain" />
          </span>
          <div>
            <p className="text-[15px] font-bold leading-tight tracking-tight">Cổng Thanh niên Trường học</p>
            <p className="text-[11px] text-white/55">Trung ương Đoàn TNCS Hồ Chí Minh</p>
          </div>
        </motion.div>

        {/* Headline gradient text */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="relative"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300 backdrop-blur">
            <Network className="h-3 w-3" /> Nền tảng số · GovTech 2026
          </span>
          <h1 className="mt-5 max-w-lg text-4xl font-black leading-[1.18] tracking-tight xl:text-5xl">
            <span className="bg-gradient-to-r from-white via-sky-100 to-cyan-300 bg-clip-text text-transparent">
              Quản trị thi đua &amp; hoạt động thanh niên trường học
            </span>
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-white/65">
            Một hệ thống duy nhất cho phân quyền 4 cấp — từ Trung ương Đoàn đến trường THPT:
            giao nhiệm vụ, chấm điểm từng điều kiện, xuất bản tin bài và lắng nghe người dân.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {[
              { icon: Network, label: "Phân quyền 4 cấp" },
              { icon: Trophy, label: "Thi đua KPI từng điều kiện" },
              { icon: Globe2, label: "Cổng công khai số" },
            ].map((c) => (
              <span
                key={c.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1.5 text-xs font-medium text-white/80 backdrop-blur"
              >
                <c.icon className="h-3.5 w-3.5 text-cyan-300" strokeWidth={1.75} />
                {c.label}
              </span>
            ))}
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="relative text-xs text-white/40"
        >
          © 2026 Ban Công tác Thanh Thiếu Nhi — Trung ương Đoàn TNCS Hồ Chí Minh
        </motion.p>
      </div>

      {/* ===== Nửa phải — Form nổi ===== */}
      <div className="relative flex w-full flex-col justify-center px-5 py-10 sm:px-10 lg:w-1/2 lg:px-16 xl:px-24">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="mx-auto w-full max-w-md rounded-3xl bg-white p-8 shadow-[0_24px_80px_rgb(15,23,42,0.10)] sm:p-9"
        >
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Đăng nhập hệ thống</h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Dành cho cán bộ Đoàn các cấp và đơn vị trường học quản lý nghiệp vụ.
          </p>

          <form onSubmit={handleLogin} className="mt-7 space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-600">Tên đăng nhập / Email đơn vị</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập được cấp"
                autoComplete="username"
                required
                className="mt-1.5 w-full rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-300 focus:border-blue-500/70 focus:shadow-[0_0_0_4px_rgba(37,99,235,0.12)]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Mật khẩu</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="mt-1.5 w-full rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-300 focus:border-blue-500/70 focus:shadow-[0_0_0_4px_rgba(37,99,235,0.12)]"
              />
            </div>

            {error ? (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-600"
              >
                {error}
              </motion.p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all duration-200 hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
            >
              <LogIn className="h-4 w-4" /> {submitting ? "Đang xử lý..." : "Đăng nhập"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-slate-500">
            Chưa có tài khoản?{" "}
            <Link href="/dang-ky" className="font-semibold text-blue-600 hover:underline">
              Đăng ký Đoàn viên
            </Link>
          </p>

          <div className="mt-8 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-center">
            <p className="text-xs leading-relaxed text-slate-500">
              Cán bộ Đoàn cơ sở quên mật khẩu hoặc cần cấp mới tài khoản quản trị đơn vị, vui lòng liên hệ Ban Công tác Thanh Thiếu Nhi — Trung ương Đoàn qua email{" "}
              <a href="mailto:tnth@doanthanhnienvn.vn" className="font-semibold text-blue-600 hover:underline">
                tnth@doanthanhnienvn.vn
              </a>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
