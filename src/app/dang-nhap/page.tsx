"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  LogIn,
  Network,
  Trophy,
  Globe2,
  KeyRound,
  CheckCircle2,
  X,
  AlertCircle,
  Loader2,
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
  const [successMsg, setSuccessMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Modal đặt lại mật khẩu qua mã xác nhận gửi email: bước 1 gửi mã, bước 2 nhập mã + mật khẩu mới
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetStep, setResetStep] = useState<"request" | "confirm">("request");
  const [resetIdentifier, setResetIdentifier] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  useEffect(() => {
    if (ready && session) router.replace(destFor(session.role));
  }, [ready, session, router]);

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (submitting) return;
    setError("");
    setSuccessMsg("");
    setSubmitting(true);
    try {
      const res = await login(username.trim(), password);
      if (res.ok) {
        // Auth context handles session & redirect via useEffect
      } else {
        setError(res.error || "Tên đăng nhập hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openResetModal = () => {
    setResetIdentifier(username);
    setResetStep("request");
    setResetCode("");
    setResetError("");
    setResetSuccess("");
    setResetModalOpen(true);
  };

  const handleRequestCode = async () => {
    setResetSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request", identifier: resetIdentifier.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setResetSuccess(data.message || "Đã gửi mã xác nhận tới email đăng ký.");
        setResetStep("confirm");
      } else {
        setResetError(data?.error || "Không thể gửi mã xác nhận. Vui lòng thử lại sau.");
      }
    } catch {
      setResetError("Không thể kết nối đến máy chủ. Vui lòng thử lại sau.");
    } finally {
      setResetSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    setResetSuccess("");

    if (!resetIdentifier.trim()) {
      setResetError("Vui lòng nhập tên đăng nhập hoặc email tài khoản.");
      return;
    }
    if (resetStep === "request") {
      await handleRequestCode();
      return;
    }
    if (!/^\d{6}$/.test(resetCode.trim())) {
      setResetError("Vui lòng nhập mã xác nhận 6 chữ số đã gửi tới email.");
      return;
    }
    if (!resetNewPassword || resetNewPassword.length < 6) {
      setResetError("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setResetError("Mật khẩu xác nhận không trùng khớp.");
      return;
    }

    setResetSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm",
          identifier: resetIdentifier.trim(),
          code: resetCode.trim(),
          newPassword: resetNewPassword,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setResetSuccess(data.message || "Đặt lại mật khẩu thành công!");
        setUsername(data.username || resetIdentifier.trim());
        setPassword(resetNewPassword);
        setSuccessMsg("Mật khẩu đã được cập nhật thành công. Bạn có thể nhấn Đăng nhập ngay!");
        setTimeout(() => {
          setResetModalOpen(false);
          setResetCode("");
          setResetNewPassword("");
          setResetConfirmPassword("");
          setResetSuccess("");
        }, 1500);
      } else {
        setResetError(data?.error || "Không thể đặt lại mật khẩu. Vui lòng kiểm tra lại thông tin.");
      }
    } catch {
      setResetError("Không thể kết nối đến máy chủ. Vui lòng thử lại sau.");
    } finally {
      setResetSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen bg-slate-50">
      {/* ===== Nút ra màn hình chính — nổi góc trên phải, hiện mọi breakpoint ===== */}
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
            giao nhiệm vụ, chấm điểm từng điều kiện, xuất bản tin bài và theo dõi toàn diện.
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

          {successMsg ? (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </motion.div>
          ) : null}

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-600">Tên đăng nhập / Email đơn vị</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập hoặc email"
                autoComplete="username"
                required
                className="mt-1.5 w-full rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-300 focus:border-blue-500/70 focus:shadow-[0_0_0_4px_rgba(37,99,235,0.12)]"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-600">Mật khẩu</label>
                <button
                  type="button"
                  onClick={openResetModal}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Quên mật khẩu?
                </button>
              </div>
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
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-600 ring-1 ring-rose-200"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
                <span>{error}</span>
              </motion.div>
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

          {/* Khối tự đặt lại mật khẩu qua mã xác nhận gửi email */}
          <div className="mt-8 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-sky-50/60 p-4 text-center">
            <p className="text-xs font-semibold text-slate-700">
              Quên mật khẩu hoặc cần khởi tạo lại mật khẩu quản trị đơn vị?
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Nhận mã xác nhận qua email đăng ký của tài khoản để tự đặt mật khẩu mới.
            </p>
            <button
              type="button"
              onClick={openResetModal}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-blue-700 shadow-sm ring-1 ring-blue-200 transition-all hover:bg-blue-600 hover:text-white"
            >
              <KeyRound className="h-3.5 w-3.5" /> Tự đặt lại mật khẩu mới ngay
            </button>
          </div>
        </motion.div>
      </div>

      {/* ===== Modal Tự đặt lại mật khẩu mới ===== */}
      <AnimatePresence>
        {resetModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !resetSubmitting && setResetModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl ring-1 ring-slate-900/10"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                    <KeyRound className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Đặt lại mật khẩu mới</h3>
                    <p className="text-xs text-slate-500">
                      {resetStep === "request"
                        ? "Bước 1/2: nhận mã xác nhận qua email"
                        : "Bước 2/2: nhập mã xác nhận và mật khẩu mới"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !resetSubmitting && setResetModalOpen(false)}
                  className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleResetPassword} className="mt-5 space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Tên đăng nhập hoặc Email đã cấp</label>
                  <input
                    type="text"
                    value={resetIdentifier}
                    onChange={(e) => setResetIdentifier(e.target.value)}
                    placeholder="Ví dụ: tuoitrenghean hoặc email đơn vị"
                    required
                    readOnly={resetStep === "confirm"}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition read-only:bg-slate-50 read-only:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {resetStep === "confirm" ? (
                <>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-600">Mã xác nhận (6 số trong email)</label>
                    <button
                      type="button"
                      disabled={resetSubmitting}
                      onClick={() => {
                        setResetError("");
                        setResetSuccess("");
                        void handleRequestCode();
                      }}
                      className="text-[11px] font-semibold text-blue-600 hover:underline disabled:opacity-60"
                    >
                      Gửi lại mã
                    </button>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="______"
                    required
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-center text-lg font-bold tracking-[0.5em] text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">Mật khẩu mới (tối thiểu 6 ký tự)</label>
                  <input
                    type="password"
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới"
                    required
                    minLength={6}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">Xác nhận lại mật khẩu mới</label>
                  <input
                    type="password"
                    value={resetConfirmPassword}
                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    required
                    minLength={6}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                </>
                ) : null}

                {resetError ? (
                  <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-600 ring-1 ring-rose-200">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{resetError}</span>
                  </div>
                ) : null}

                {resetSuccess ? (
                  <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-2.5 text-xs text-emerald-700 ring-1 ring-emerald-200">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{resetSuccess}</span>
                  </div>
                ) : null}

                <div className="mt-5 flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    disabled={resetSubmitting}
                    onClick={() => setResetModalOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={resetSubmitting}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-60"
                  >
                    {resetSubmitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang xử lý...
                      </>
                    ) : resetStep === "request" ? (
                      <>
                        <KeyRound className="h-3.5 w-3.5" /> Gửi mã xác nhận
                      </>
                    ) : (
                      <>
                        <KeyRound className="h-3.5 w-3.5" /> Cập nhật mật khẩu ngay
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
