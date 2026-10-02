"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Network, ClipboardList, Megaphone, Gauge, FileCheck2, Trophy, MessageSquareText, FolderOpen, ArrowRight,
} from "lucide-react";
import { PhotoPlaceholder } from "@/components/ui/photo-placeholder";
import { cn } from "@/lib/utils";

/* Bento không đối xứng: thẻ lớn 4/6 cột xen thẻ vuông 2/6, kết thúc bằng dải ngang 6/6 */
const MODULES: {
  icon: typeof Network;
  title: string;
  desc: string;
  tint: string;
  glow: string;
  span: string;
  chips?: string[];
}[] = [
  {
    icon: Network,
    title: "Tổ chức 4 cấp",
    desc: "Mỗi đơn vị một tài khoản, dữ liệu quản lý theo đúng phạm vi của mình — cấp trên nhìn toàn cảnh, cấp cơ sở cập nhật chi tiết.",
    tint: "bg-blue-50/50 text-blue-600 ring-blue-100",
    glow: "shadow-[0_0_20px_rgba(37,99,235,0.15)]",
    span: "sm:col-span-2 lg:col-span-4",
    chips: ["Trung ương", "Tỉnh/Thành", "Phường/Xã", "Trường học"],
  },
  {
    icon: ClipboardList,
    title: "Hoạt động",
    desc: "Cập nhật hoạt động kèm link minh chứng, cấp trên xác nhận trực tuyến.",
    tint: "bg-cyan-50/50 text-cyan-600 ring-cyan-100",
    glow: "shadow-[0_0_20px_rgba(6,182,212,0.15)]",
    span: "lg:col-span-2",
  },
  {
    icon: Gauge,
    title: "Nhiệm vụ & chỉ tiêu",
    desc: "Giao theo bộ tiêu chí, phân bổ chỉ tiêu nhiều cấp, theo dõi deadline D-7/D-3.",
    tint: "bg-violet-50/50 text-violet-600 ring-violet-100",
    glow: "shadow-[0_0_20px_rgba(139,92,246,0.15)]",
    span: "lg:col-span-2",
  },
  {
    icon: FileCheck2,
    title: "Xác nhận & chấm điểm",
    desc: "Tự động tổng hợp, xác nhận thủ công hoặc hội đồng chuyên gia. Điểm lưu snapshot.",
    tint: "bg-emerald-50/50 text-emerald-600 ring-emerald-100",
    glow: "shadow-[0_0_20px_rgba(16,185,129,0.15)]",
    span: "lg:col-span-2",
  },
  {
    icon: Megaphone,
    title: "Xuất bản truyền thông",
    desc: "Biên tập viên chọn hoạt động đạt chất lượng, biên tập và đăng công khai lên trang tin tức của cổng.",
    tint: "bg-amber-50/50 text-amber-600 ring-amber-100",
    glow: "shadow-[0_0_20px_rgba(245,158,11,0.18)]",
    span: "lg:col-span-2",
  },
  {
    icon: Trophy,
    title: "Xếp hạng & báo cáo",
    desc: "Chốt kỳ theo tháng/quý/năm, báo cáo có bản nháp gợi ý và xuất Word/PDF/Excel.",
    tint: "bg-indigo-50/50 text-indigo-600 ring-indigo-100",
    glow: "shadow-[0_0_20px_rgba(99,102,241,0.15)]",
    span: "lg:col-span-3",
  },
  {
    icon: MessageSquareText,
    title: "Văn bản & phản ánh",
    desc: "Ban hành văn bản theo nhóm đơn vị nhận, kênh phản ánh công dân có mã tra cứu.",
    tint: "bg-sky-50/50 text-sky-600 ring-sky-100",
    glow: "shadow-[0_0_20px_rgba(14,165,233,0.15)]",
    span: "lg:col-span-3",
  },
  {
    icon: FolderOpen,
    title: "Kho tài nguyên",
    desc: "Tài liệu, biểu mẫu, sản phẩm truyền thông dùng chung — phân biệt công khai/nội bộ, chip định dạng file rõ ràng.",
    tint: "bg-blue-50/50 text-blue-600 ring-blue-100",
    glow: "shadow-[0_0_20px_rgba(37,99,235,0.15)]",
    span: "lg:col-span-6",
  },
];

const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

/** Thẻ tính năng 3D Tilt — nghiêng theo con trỏ, bóng đổ kéo dài, luồng sáng lướt viền */
function TiltCard({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ rx: -py * 5, ry: px * 6 });
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => setTilt({ rx: 0, ry: 0 })}
      style={{ transformPerspective: 900, rotateX: tilt.rx, rotateY: tilt.ry }}
      animate={{ y: tilt.rx !== 0 || tilt.ry !== 0 ? -6 : 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className={cn(
        "group relative overflow-hidden rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-200/70 transition-shadow duration-300 hover:shadow-[0_24px_60px_rgb(15,23,42,0.12)] sm:p-7",
        className
      )}
    >
      {/* Luồng sáng lướt qua viền thẻ khi hover */}
      <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
        <span className="absolute -left-3/4 top-0 h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-blue-400/15 to-transparent transition-all duration-700 ease-out group-hover:left-[125%]" />
      </span>
      {children}
    </motion.div>
  );
}

export default function GioiThieuPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      {/* ===== HERO PANORAMIC — một khối canvas nguyên khối ===== */}
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative overflow-hidden rounded-3xl border border-blue-100 bg-sky-50/40 shadow-2xl shadow-blue-900/15"
      >
        <div aria-hidden className="absolute inset-0">
          <div className="hero-glow-1 absolute -left-20 top-0 h-64 w-64 rounded-full bg-sky-300/30 blur-3xl" />
          <div className="hero-glow-2 absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
        </div>

        <div className="relative grid gap-8 md:grid-cols-[42fr_58fr] lg:gap-10">
          {/* --- Trái 42%: thông tin --- */}
          <div className="relative z-10 flex flex-col justify-center p-7 sm:p-10 md:py-12 lg:pl-12">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-teal-50 px-3.5 py-1.5 text-[11px] font-bold tracking-[0.14em] text-teal-600 ring-1 ring-teal-200/70">
              ✦ GIỚI THIỆU CỔNG
            </span>
            <h1 className="mt-4 text-3xl font-black leading-[1.2] tracking-tight sm:text-4xl">
              <span className="bg-gradient-to-r from-blue-800 via-blue-600 to-cyan-500 bg-clip-text text-transparent">
                Cổng Thanh niên Trường học
              </span>
            </h1>
            <p className="mt-4 max-w-md text-sm font-light leading-relaxed text-slate-600">
              Hệ điều hành số của phong trào — quản lý tập trung hoạt động, nhiệm vụ thi đua,
              truyền thông và khen thưởng; phục vụ 4 cấp Đoàn trên cùng một nền tảng.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/dang-nhap"
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/40 active:scale-[0.98]"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
                <span className="relative">Đăng nhập khu quản trị</span>
                <ArrowRight className="relative h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link
                href="/phan-anh"
                className="inline-flex items-center gap-2 rounded-full bg-white/85 px-6 py-3 text-sm font-semibold text-blue-600 ring-1 ring-blue-200 backdrop-blur transition-colors hover:bg-blue-50"
              >
                Gửi phản ánh thử
              </Link>
            </div>
          </div>

          {/* --- Phải 58%: khung trình diễn + widget neo góc --- */}
          <div className="relative flex items-center px-7 pb-10 pt-1 sm:px-10 md:py-12 lg:pr-12">
            <div className="relative w-full">
              <div aria-hidden className="absolute -inset-3 rounded-3xl bg-blue-500/20 blur-2xl" />
              <motion.div
                initial={{ opacity: 0, y: 24, rotate: 1 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
                className="relative aspect-video w-full overflow-hidden rounded-2xl border-2 border-white/60 shadow-2xl shadow-blue-950/25"
              >
                <PhotoPlaceholder seed={88} className="h-full w-full" icon={false} />
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-blue-950/20 via-transparent to-cyan-400/10" />
              </motion.div>

              {/* Widget 1 — NEO góc trên phải */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 190, damping: 17, delay: 0.5 }}
                className="float-y absolute -right-4 -top-4 z-10"
              >
                <div className="flex items-center gap-2.5 rounded-2xl border border-white/60 bg-white/80 px-3.5 py-2.5 shadow-xl shadow-blue-900/15 backdrop-blur-md">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 ring-1 ring-blue-300/60">
                    <Network className="h-4.5 w-4.5 text-blue-600" strokeWidth={1.75} />
                  </span>
                  <span>
                    <span className="block text-[11px] font-black tracking-[0.08em] text-slate-800">4 CẤP ĐOÀN</span>
                    <span className="block text-[10px] font-medium text-blue-700/90">TW · Tỉnh · Phường · Trường</span>
                  </span>
                </div>
              </motion.div>

              {/* Widget 2 — NEO góc dưới trái */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 190, damping: 17, delay: 0.65 }}
                className="float-y absolute -bottom-4 -left-6 z-10"
                style={{ animationDelay: "1.2s" }}
              >
                <div className="flex items-center gap-2.5 rounded-2xl border border-white/60 bg-white/55 px-3.5 py-2.5 shadow-xl shadow-cyan-500/20 backdrop-blur-md">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/25 ring-1 ring-cyan-300/60">
                    <Gauge className="h-4.5 w-4.5 text-cyan-500 drop-shadow-[0_0_10px_rgba(34,211,238,0.9)]" strokeWidth={1.75} />
                  </span>
                  <span>
                    <span className="block text-[11px] font-black tracking-[0.08em] text-slate-800">THI ĐUA KPI</span>
                    <span className="block text-[10px] font-medium text-cyan-700/90">Chấm từng điều kiện</span>
                  </span>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Cyber Ribbon — sóng sáng ôm đáy canvas */}
        <svg
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 z-20 h-[110px] w-full"
          viewBox="0 0 1440 110"
          preserveAspectRatio="none"
          fill="none"
        >
          <defs>
            <linearGradient id="gtRibbon" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
              <stop stopColor="#22d3ee" stopOpacity="0" />
              <stop offset="0.28" stopColor="#22d3ee" stopOpacity="0.85" />
              <stop offset="0.62" stopColor="#3b82f6" stopOpacity="0.8" />
              <stop offset="1" stopColor="#22d3ee" stopOpacity="0.95" />
            </linearGradient>
          </defs>
          <motion.path
            d="M -20 88 C 240 52, 460 100, 760 76 C 1000 56, 1240 42, 1460 64"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.8, ease: "easeInOut", delay: 0.4 }}
            style={{ stroke: "url(#gtRibbon)", filter: "drop-shadow(0 0 6px rgba(34,211,238,0.75))" }}
          />
          <path
            d="M -20 88 C 240 52, 460 100, 760 76 C 1000 56, 1240 42, 1460 64"
            stroke="#ecfeff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="3 70"
            className="curve-dust"
            style={{ animationDuration: "18s" }}
          />
        </svg>
      </motion.div>

      {/* ===== Bento Grid không đối xứng ===== */}
      <motion.div
        variants={gridVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-6"
      >
        {MODULES.map((m) => (
          <motion.div key={m.title} variants={itemVariants} className={m.span}>
            <TiltCard className={cn(m.span.startsWith("lg:col-span-6") && "sm:flex sm:items-center sm:gap-6")}>
              <div className={cn("flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl ring-1 backdrop-blur", m.tint, m.glow)}>
                <m.icon className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <div className={cn(m.span.startsWith("lg:col-span-6") && "min-w-0 flex-1")}>
                <h2 className={cn("mt-4 font-semibold text-slate-800", m.span.startsWith("lg:col-span-4") ? "text-xl" : "text-base", m.span.startsWith("lg:col-span-6") && "sm:mt-0 sm:text-lg")}>
                  {m.title}
                </h2>
                <p className={cn("mt-1.5 leading-relaxed text-slate-500", m.span.startsWith("lg:col-span-4") ? "text-sm" : "text-[13px]")}>
                  {m.desc}
                </p>
                {m.chips ? (
                  <div className="mt-4 flex flex-wrap items-center gap-1.5">
                    {m.chips.map((c, i) => (
                      <span key={c} className="inline-flex items-center gap-1.5">
                        <span className="rounded-full bg-blue-50/70 px-3 py-1 text-[11px] font-semibold text-blue-600 ring-1 ring-blue-100">
                          {c}
                        </span>
                        {i < m.chips!.length - 1 ? <ArrowRight className="h-3 w-3 text-slate-300" /> : null}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </TiltCard>
          </motion.div>
        ))}
      </motion.div>

      {/* ===== Hướng dẫn trải nghiệm demo ===== */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mt-10 rounded-3xl bg-white p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-200 sm:p-9"
      >
        <h2 className="text-lg font-bold text-slate-900">Hướng dẫn trải nghiệm bản demo</h2>
        <ol className="mt-4 list-decimal space-y-2.5 pl-5 text-sm leading-relaxed text-slate-500">
          <li>
            Đăng nhập khu quản trị bằng 1 trong 5 tài khoản demo
            (<code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700">tw.admin</code>,{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700">bd.province</code>,{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700">hc.hiepthanh</code>,{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700">thpt.chanhphu</code>,{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700">btv.tw</code> — mật khẩu chung{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700">demo123</code>) để thấy sự khác biệt
            phạm vi dữ liệu theo cấp.
          </li>
          <li>Đơn vị cơ sở tạo hoạt động → nộp → đăng nhập cấp trên xác nhận → quay lại cập nhật kết quả nhiệm vụ.</li>
          <li>Bạn muốn xem luồng công khai: gửi phản ánh → nhận mã PA-2026-XXXXX → tra cứu tiến độ xử lý.</li>
          <li>Tin bài xuất bản từ khu quản trị sẽ xuất hiện ngay trên trang Tin tức của website công khai.</li>
        </ol>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dang-nhap"
            className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/30"
          >
            Đăng nhập khu quản trị
          </Link>
          <Link
            href="/phan-anh"
            className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-blue-600 ring-1 ring-blue-200 transition-colors hover:bg-blue-50"
          >
            Gửi phản ánh thử
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
