"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  SearchCheck,
  Nfc,
  Send,
  Inbox,
  Workflow,
  MailCheck,
  Sparkles,
} from "lucide-react";
import QRCode from "react-qr-code";
import { useStore } from "@/lib/store-context";
import { useToast } from "@/lib/toast-context";
import { cn } from "@/lib/utils";

const DEMO_CODES = ["PA-2026-000101", "PA-2026-000102", "PA-2026-000103"];

/* Quy trình 4 bước xử lý phản ánh */
const STEPS = [
  { icon: Send, title: "Gửi phản ánh", desc: "Công dân gửi kèm minh chứng qua biểu mẫu số" },
  { icon: Inbox, title: "Tiếp nhận", desc: "Văn thư đăng ký, phân loại theo lĩnh vực" },
  { icon: Workflow, title: "Xử lý", desc: "Đơn vị thụ lý, phản hồi công khai" },
  { icon: MailCheck, title: "Trả kết quả", desc: "Email thông báo kết quả về mã tra cứu" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export default function TraCuuPage() {
  const { feedbacks } = useStore();
  const { toast } = useToast();
  const router = useRouter();
  const [code, setCode] = useState("");

  const lookup = (e: React.FormEvent) => {
    e.preventDefault();
    const found = feedbacks.find((f) => f.trackingCode.toLowerCase() === code.trim().toLowerCase());
    if (!found) {
      toast(`Không tìm thấy phản ánh với mã "${code.trim()}".`, "warning");
      return;
    }
    router.push(`/phan-anh/${found.trackingCode}`);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      {/* ===== Header ===== */}
      <div>
        <div className="h-1 w-12 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600" />
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
          Tra cứu phản ánh
        </h1>
        <p className="mt-2 max-w-xl text-sm text-slate-500">
          Theo dõi hành trình xử lý phản ánh - kiến nghị của bạn bằng mã tra cứu số.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 items-stretch gap-8 lg:grid-cols-2">
        {/* ===== Digital ID Pass — thẻ kỹ thuật số ===== */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 p-7 text-white shadow-[0_20px_60px_rgb(15,23,42,0.35)]"
        >
          {/* Quầng holographic */}
          <span className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-cyan-500/25 blur-3xl" />
          <span className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-blue-600/25 blur-3xl" />
          {/* Nét trang trí mảnh */}
          <span className="pointer-events-none absolute inset-x-7 top-1/2 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

          {/* Hàng đầu: chip NFC + nhãn */}
          <div className="relative flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 backdrop-blur">
              <Nfc className="h-4 w-4 text-cyan-300" strokeWidth={1.5} />
              <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-300">
                TNTH · Civic Pass
              </span>
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/40">
              Chính quyền số
            </span>
          </div>

          {/* QR phát sáng + mã tra cứu */}
          <div className="relative mt-8 flex items-center gap-6">
            <div className="qr-glow shrink-0 rounded-2xl bg-white p-3">
              <QRCode
                value={code.trim() ? code.trim().toUpperCase() : DEMO_CODES[0]}
                size={120}
                bgColor="#ffffff"
                fgColor="#0f172a"
              />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                Mã tra cứu
              </p>
              <p className="mt-1 truncate font-mono text-2xl font-bold tracking-wider text-cyan-300">
                {code.trim() ? code.trim().toUpperCase() : "PA-2026-·····"}
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-white/55">
                Mã QR cập nhật trực tiếp theo mã bạn nhập — quét để mở phản ánh trên mọi thiết bị.
              </p>
            </div>
          </div>

          {/* Hàng đáy */}
          <div className="relative mt-8 flex items-end justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/85">
                Hệ thống Phản ánh - Kiến nghị
              </p>
              <p className="mt-1 text-[10px] text-white/45">
                Trung ương Đoàn TNCS Hồ Chí Minh
              </p>
            </div>
            <Sparkles className="h-5 w-5 text-amber-400/80" strokeWidth={1.5} />
          </div>
        </motion.div>

        {/* ===== Form tra cứu ===== */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.12 }}
          className="pearl-card flex flex-col justify-center rounded-3xl p-7 sm:p-9"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25">
              <SearchCheck className="h-5 w-5" strokeWidth={1.5} />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">Kiểm tra mã của bạn</h2>
              <p className="text-xs text-slate-400">Nhập mã nhận được khi gửi phản ánh.</p>
            </div>
          </div>

          <form onSubmit={lookup} className="mt-7 space-y-4">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="PA-2026-XXXXX"
              className="w-full rounded-full border border-slate-200 bg-white px-5 py-3 text-center font-mono text-base tracking-[0.15em] text-slate-800 outline-none transition-all duration-200 placeholder:tracking-normal placeholder:text-slate-300 focus:border-cyan-500/60 focus:shadow-[0_0_0_4px_rgba(6,182,212,0.14)]"
            />
            <button
              type="submit"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:brightness-110"
            >
              Tra cứu ngay
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Thử mã demo
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {DEMO_CODES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCode(c)}
                  className={cn(
                    "rounded-full px-3 py-1 font-mono text-[11px] transition-colors",
                    code === c
                      ? "bg-cyan-500 text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-cyan-50 hover:text-cyan-600"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ===== Stepper 4 bước — đường neon chuyển động ===== */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        className="pearl-card mt-10 rounded-3xl p-7 sm:p-9"
      >
        <h2 className="text-center text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
          Hành trình xử lý phản ánh
        </h2>

        {/* Desktop: ngang có đường nối ánh sáng */}
        <div className="mt-8 hidden items-start sm:flex">
          {STEPS.map((s, i) => (
            <div key={s.title} className="contents">
              <div className="flex w-24 shrink-0 flex-col items-center text-center">
                <span
                  className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg transition-colors",
                    i === 0
                      ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-cyan-500/30"
                      : "border border-slate-100 bg-white text-cyan-600 shadow-slate-900/5"
                  )}
                >
                  <s.icon className="h-6 w-6" strokeWidth={1.5} />
                </span>
                <p className="mt-3 text-sm font-bold text-slate-900">{s.title}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{s.desc}</p>
              </div>
              {i < STEPS.length - 1 ? (
                <div className="relative mx-3 mt-7 h-[3px] flex-1 overflow-hidden rounded-full bg-slate-100">
                  <span className="stepper-line absolute inset-0" />
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {/* Mobile: dọc, rail neon bên trái */}
        <div className="mt-6 space-y-0 sm:hidden">
          {STEPS.map((s, i) => (
            <div key={s.title} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-md",
                    i === 0
                      ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-cyan-500/30"
                      : "border border-slate-100 bg-white text-cyan-600"
                  )}
                >
                  <s.icon className="h-5 w-5" strokeWidth={1.5} />
                </span>
                {i < STEPS.length - 1 ? (
                  <div className="relative my-1 w-[3px] flex-1 overflow-hidden rounded-full bg-slate-100" style={{ minHeight: 40 }}>
                    <span className="stepper-line absolute inset-0" />
                  </div>
                ) : null}
              </div>
              <div className="pb-6 pt-1.5">
                <p className="text-sm font-bold text-slate-900">
                  {i + 1}. {s.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
