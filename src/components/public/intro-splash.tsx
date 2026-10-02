"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Màn chào sân (intro splash) — DIỄN MỖI LẦN VÀO WEB (mỗi lần tải lại trang).
 * LUÔN hiển thị (không bỏ theo reduced-motion — trước đó máy bật "giảm chuyển động"
 * làm màn chào biến mất hoàn toàn); ai không muốn xem bấm "Bỏ qua" là thoát ngay.
 *
 * LOGO: dùng file public/logo.png (bản đã cắt nền đen trong suốt).
 * Muốn đổi logo mới: thay scripts/logo-src/logo-goc.png rồi chạy
 * `node scripts/process-logo.js` để cắt nền lại tự động.
 */

const TITLE = "THANH NIÊN TRƯỜNG HỌC";
const SHOW_MS = 2600; // thời gian trình diễn trước khi màn kéo lên
const EXIT_MS = 650; // thời gian màn kéo lên

export function IntroSplash() {
  const [phase, setPhase] = useState<"hidden" | "show" | "exit">("hidden");
  const t1Ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t2Ref = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Báo cho các hiệu ứng phía dưới (vd: reveal chữ Tin tiêu điểm) biết đã diễn xong
  const finish = () => {
    (window as unknown as { tnthIntroDone?: boolean }).tnthIntroDone = true;
    window.dispatchEvent(new Event("tnth:intro-done"));
  };

  useEffect(() => {
    setPhase("show");
    document.body.style.overflow = "hidden"; // khoá cuộn trong lúc diễn
    t1Ref.current = setTimeout(() => {
      setPhase("exit");
    }, SHOW_MS);
    t2Ref.current = setTimeout(() => {
      setPhase("hidden");
      document.body.style.overflow = "";
      finish();
    }, SHOW_MS + EXIT_MS);
    return () => {
      if (t1Ref.current) clearTimeout(t1Ref.current);
      if (t2Ref.current) clearTimeout(t2Ref.current);
      document.body.style.overflow = "";
    };
  }, []);

  const skip = () => {
    // Huỷ cả 2 hẹn giờ để màn không tự bật lại sau khi đã bỏ qua
    if (t1Ref.current) clearTimeout(t1Ref.current);
    if (t2Ref.current) clearTimeout(t2Ref.current);
    setPhase("exit");
    setTimeout(() => {
      setPhase("hidden");
      document.body.style.overflow = "";
      finish();
    }, EXIT_MS);
  };

  if (phase === "hidden") return null;

  return (
    <div
      /* Nền xanh dương công nghệ — ghép từ tone nền gốc của logo */
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#04101f] ${
        phase === "exit" ? "intro-exit" : ""
      }`}
      style={{
        backgroundImage:
          "radial-gradient(circle at 50% 36%, rgba(37,99,235,0.42) 0%, transparent 55%), radial-gradient(circle at 50% 88%, rgba(34,211,238,0.16) 0%, transparent 50%), url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Cpath d='M48 0H0v48' fill='none' stroke='%230ea5e9' stroke-opacity='0.08'/%3E%3C/svg%3E\")",
      }}
      aria-hidden="true"
    >
      {/* Sao vàng bay lẻ nền (tone vàng trong logo) */}
      {[
        { l: "12%", t: "22%", d: "0s", s: "text-base" },
        { l: "84%", t: "30%", d: "0.3s", s: "text-xl" },
        { l: "22%", t: "74%", d: "0.6s", s: "text-sm" },
        { l: "76%", t: "78%", d: "0.45s", s: "text-base" },
        { l: "50%", t: "12%", d: "0.75s", s: "text-sm" },
      ].map((st, i) => (
        <span
          key={i}
          className={`intro-fade absolute text-vang-300/40 ${st.s}`}
          style={{ left: st.l, top: st.t, animationDelay: st.d, animationDuration: "1.2s" }}
        >
          ★
        </span>
      ))}

      {/* LOGO THẬT — nền đen đã cắt trong suốt tối đa */}
      <div className="intro-star relative flex h-52 w-52 items-center justify-center sm:h-60 sm:w-60">
        {/* Vòng xung lan tỏa quanh logo */}
        <span className="intro-ring absolute inset-4 rounded-full border-2 border-sky-400/50" />
        <span className="intro-ring absolute inset-4 rounded-full border border-vang-300/50" style={{ animationDelay: "0.5s" }} />
        {/* Vòng nét đứt xoay chậm — chất công nghệ */}
        <span className="absolute inset-0 animate-[spin_7s_linear_infinite] rounded-full border border-dashed border-sky-300/35" />
        <span className="absolute inset-0 animate-[spin_11s_linear_infinite_reverse] rounded-full border border-vang-300/40 [clip-path:polygon(0_0,100%_0,100%_18%,0_18%,0_38%,100%_38%,100%_56%,0_56%,0_76%,100%_76%,100%_100%,0_100%)]" />
        <img
          src="/logo.png"
          alt="Logo Thanh niên Trường học"
          className="intro-logo relative h-40 w-auto drop-shadow-[0_0_50px_rgba(56,150,255,0.6)] sm:h-48"
        />
      </div>

      {/* Tên chương trình — chữ unfolds dần, gradient trắng-xanh theo tone chữ gốc */}
      <h1
        className="relative mt-6 px-4 text-center font-serif-display text-[clamp(1.5rem,5.5vw,3.25rem)] font-black tracking-[0.12em]"
        style={{ textShadow: "0 0 34px rgba(56,150,255,0.35)" }}
      >
        {TITLE.split("").map((ch, i) =>
          ch === " " ? (
            <span key={i} className="inline-block w-[0.5em]" />
          ) : (
            <span
              key={i}
              className="intro-letter inline-block bg-gradient-to-b from-white via-sky-100 to-sky-300 bg-clip-text text-transparent"
              style={{ animationDelay: `${0.55 + i * 0.045}s` }}
            >
              {ch}
            </span>
          )
        )}
        {/* Vệt sáng quét ngang qua chữ */}
        <span className="intro-sweep pointer-events-none absolute left-0 top-1/2 h-px w-full bg-gradient-to-r from-transparent via-sky-200/80 to-transparent" />
      </h1>

      <p className="intro-sub mt-4 text-center text-[11px] font-semibold uppercase tracking-[0.4em] text-sky-100/60 sm:text-xs">
        Trung ương Đoàn TNCS Hồ Chí Minh
      </p>
      <p className="intro-sub mt-2 text-center text-xs font-medium text-vang-200/80" style={{ animationDelay: "1.5s" }}>
        Kết nối · Thi đua · Tiên phong
      </p>

      {/* Thanh tiến trình mảnh dưới đáy */}
      <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/5">
        <div className="intro-progress h-full bg-gradient-to-r from-sky-400 via-vang-300 to-doan-500" />
      </div>

      {/* Bỏ qua */}
      <button
        type="button"
        onClick={skip}
        className="absolute bottom-5 right-5 rounded-full border border-white/15 px-3.5 py-1.5 text-[11px] font-medium text-white/50 transition-colors hover:border-sky-300/50 hover:text-sky-200"
      >
        Bỏ qua →
      </button>
    </div>
  );
}
