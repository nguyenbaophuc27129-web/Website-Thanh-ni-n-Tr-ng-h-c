"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Màn chào sân (intro splash) — CHỈ DIỄN Ở TRANG CHỦ (/), MỘT LẦN MỖI PHIÊN TRÌNH DUYỆT (tab).
 * Các trang con (/dien-dan, /tin-tuc, /hoc-sinh-3-tot...) KHÔNG diễn; quay về trang chủ trong cùng phiên cũng
 * không diễn lại, để người dùng không phải chờ ~3 giây mỗi lần bấm logo.
 * Ai không muốn xem trên trang chủ bấm "Bỏ qua" là thoát ngay.
 */
const SEEN_KEY = "tnth_intro_seen";

const SHOW_MS = 2600; // thời gian trình diễn trước khi màn kéo lên
const EXIT_MS = 650; // thời gian màn kéo lên

export function IntroSplash() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<"hidden" | "show" | "exit">("hidden");
  const t1Ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t2Ref = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Báo cho các hiệu ứng phía dưới (vd: reveal chữ Tin tiêu điểm) biết đã diễn xong
  const markSeen = () => {
    try {
      window.sessionStorage.setItem(SEEN_KEY, "1");
    } catch {}
  };
  const finish = () => {
    if (typeof window !== "undefined") {
      (window as unknown as { tnthIntroDone?: boolean }).tnthIntroDone = true;
      window.dispatchEvent(new Event("tnth:intro-done"));
    }
  };

  useEffect(() => {
    // Chỉ kích hoạt màn chào ở trang chủ (/), và chỉ lần đầu của phiên
    let seen = false;
    try {
      seen = pathname === "/" && window.sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {}
    if (pathname !== "/" || seen) {
      setPhase("hidden");
      finish();
      return;
    }

    setPhase("show");
    document.body.style.overflow = "hidden"; // khoá cuộn trong lúc diễn

    t1Ref.current = setTimeout(() => {
      markSeen();
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
  }, [pathname]);

  const skip = () => {
    // Huỷ cả 2 hẹn giờ để màn không tự bật lại sau khi đã bỏ qua
    if (t1Ref.current) clearTimeout(t1Ref.current);
    if (t2Ref.current) clearTimeout(t2Ref.current);
    markSeen();
    setPhase("exit");
    setTimeout(() => {
      setPhase("hidden");
      document.body.style.overflow = "";
      finish();
    }, EXIT_MS);
  };

  if (pathname !== "/" || phase === "hidden") return null;

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

      {/* LOGO CHÍNH THỨC TNTH-03 — Bao gồm cả biểu trưng và chữ nghệ thuật "THANH NIÊN TRƯỜNG HỌC" */}
      <div className="relative flex flex-col items-center justify-center w-full max-w-[320px] sm:max-w-md md:max-w-lg lg:max-w-xl px-4">
        {/* Quầng sáng công nghệ lan tỏa phía sau logo */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-8 -z-10 rounded-3xl bg-gradient-to-r from-blue-600/35 via-cyan-400/25 to-amber-400/20 blur-3xl opacity-80"
        />
        <img
          src="/logo-tnth-03.png"
          alt="Thanh niên Trường học — Trung ương Đoàn TNCS Hồ Chí Minh"
          className="intro-banner-logo relative w-full h-auto object-contain drop-shadow-[0_0_45px_rgba(56,150,255,0.65)]"
        />
      </div>

      <p className="intro-sub mt-6 text-center text-[11px] font-semibold uppercase tracking-[0.35em] text-sky-100/70 sm:text-xs">
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
