"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { PhotoPlaceholder } from "@/components/ui/photo-placeholder";
import type { PublishedPost } from "@/types";

/**
 * ❤️ DÒNG TRUYỆN ÁNH SÁNG (Glowing Timeline) — carousel ngang cao cấp
 *
 * Kiến trúc:
 * - Đường cong SVG được SINH TỪ CÙNG MỘT HÀM SỐ sóng `waveY(x)` với vị trí thẻ
 *   → thẻ luôn "bám sóng" tuyệt đối chính xác, không lệch nhau dù kéo tới đâu.
 * - Đốm sáng (đom đóm) di chuyển bằng `path.getPointAtLength(progress * totalLength)`
 *   — API gốc của SVG, không cần Framer Motion/GSAP → nhẹ, mượt 60fps.
 * - Tilt 3D tự viết ~20 dòng (tương đương vanilla-tilt), có thêm lớp glare đèn nhấn.
 * - Progress bar = "thanh kiếm ánh sáng" dài theo % cuộn.
 */

/* ===== Hình học dòng chảy ===== */
const GAP = 72; // khoảng cách ngang giữa 2 thẻ
const PAD = 90; // lề 2 đầu lane
const LANE_H = 560; // chiều cao vùng diễn
const CY = 282; // tâm đường sóng
const AMP = 74; // biên độ uốn lượn
const WL = 1150; // bước sóng
const BIG = { w: 320, h: 424 }; // thẻ "Câu chuyện của tuần"
const SMALL = { w: 224, h: 328 }; // thẻ "Tin tốt ngày"
const CTA_W = 300;
const CTA_H = 208;

/** Hàm sóng dùng CHUNG cho đường SVG và vị trí thẻ */
const waveY = (x: number) => CY + AMP * Math.sin(((x - PAD) / WL) * Math.PI * 2);

/** PRNG seed cứng — particle sinh ngẫu nhiên nhưng GIỐNG NHAU giữa SSR và hydration */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ===== Tilt 3D bám chuột (thay vanilla-tilt) ===== */
function Tilt({
  rotate = 0,
  className,
  children,
}: {
  rotate?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(1100px) rotateY(${(px * 10).toFixed(2)}deg) rotateX(${(-py * 10).toFixed(2)}deg) rotate(${rotate}deg) translateY(-10px) scale(1.035)`;
    el.style.setProperty("--gx", `${((px + 0.5) * 100).toFixed(1)}%`);
    el.style.setProperty("--gy", `${((py + 0.5) * 100).toFixed(1)}%`);
  };
  const onLeave = () => {
    const el = ref.current;
    if (el) el.style.transform = `perspective(1100px) rotate(${rotate}deg)`;
  };
  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={cn(
        "h-full w-full transition-transform duration-200 ease-out will-change-transform [transform-style:preserve-3d]",
        className
      )}
      style={{ transform: `perspective(1100px) rotate(${rotate}deg)` }}
    >
      {children}
    </div>
  );
}

/* ===== Thẻ truyện kính mờ ===== */
function StoryCard({
  post,
  big,
  index,
}: {
  post: PublishedPost;
  big: boolean;
  index: number;
}) {
  return (
    <Link
      href={`/tin-tuc/${post.slug}`}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-white/[0.07] backdrop-blur-xl",
        "shadow-[0_14px_44px_rgba(2,6,23,0.55)] transition-colors duration-300",
        "border-white/15 hover:border-white/40",
        big && "ring-1 ring-amber-200/25"
      )}
    >
      {/* Glare đèn nhấn bám chuột */}
      <span
        className="pointer-events-none absolute inset-0 z-20 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(420px circle at var(--gx,50%) var(--gy,50%), rgba(255,255,255,0.16), transparent 55%)",
        }}
      />
      {/* Số thứ tự editorial mờ */}
      <span className="pointer-events-none absolute right-3 top-1.5 z-0 font-serif-display text-5xl font-black text-white/[0.08]">
        {String(index + 1).padStart(2, "0")}
      </span>

      {/* Ảnh bìa */}
      <div className="relative h-[54%] w-full shrink-0 overflow-hidden">
        <PhotoPlaceholder
          seed={post.coverSeed}
          src={post.coverDataUrl}
          className="h-full w-full"
          icon={false}
        />
        <span className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#0a0f24]/90 to-transparent" />
        {big ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-200 to-rose-200 px-2.5 py-1 text-[9.5px] font-black uppercase tracking-wider text-rose-950 shadow-lg">
            <Heart className="h-3 w-3 fill-rose-600 text-rose-600" /> Câu chuyện của tuần
          </span>
        ) : (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-100 backdrop-blur">
            ❤️ Tin tốt ngày
          </span>
        )}
      </div>

      {/* Nội dung */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col p-4">
        <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-200/70">
          {post.authorOrgUnitName} · {formatDate(post.publishedAt ?? post.createdAt)}
        </p>
        <h3
          className={cn(
            "mt-1.5 font-serif-display font-bold leading-snug text-white",
            big ? "text-[17px] line-clamp-3" : "text-[13.5px] line-clamp-3"
          )}
        >
          {post.title}
        </h3>
        {/* Trích dẫn hiện lên khi hover */}
        <p className="mt-auto max-h-0 overflow-hidden border-l-2 border-rose-300/60 pl-2.5 opacity-0 transition-all duration-500 ease-out group-hover:max-h-24 group-hover:opacity-100">
          <span className={cn("italic leading-relaxed text-white/75", big ? "text-xs line-clamp-3" : "text-[11px] line-clamp-2")}>
            “{post.excerpt}”
          </span>
        </p>
      </div>
    </Link>
  );
}

/* ===== Main ===== */
export function GlowCarousel({ posts }: { posts: PublishedPost[] }) {
  /* Hình học lane: vị trí từng thẻ + đường cong SVG sinh từ cùng waveY */
  const { meta, laneW, d, cta } = useMemo(() => {
    let x = PAD;
    const cards = posts.map((post, i) => {
      const big = i % 4 === 0; // mỗi tuần 1 câu chuyện (thẻ to), ngày thường là tin tốt (thẻ nhỏ)
      const w = big ? BIG.w : SMALL.w;
      const h = big ? BIG.h : SMALL.h;
      const left = x;
      const cx = left + w / 2;
      const top = Math.min(LANE_H - h - 16, Math.max(16, waveY(cx) - h / 2));
      x = left + w + GAP;
      return { post, big, w, h, left, top, rot: (i % 2 === 0 ? -1 : 1) * (big ? 1.1 : 1.8) };
    });
    const ctaLeft = x;
    const ctaTop = Math.max(16, waveY(ctaLeft + CTA_W / 2) - CTA_H / 2);
    const width = ctaLeft + CTA_W + PAD;
    /* Đường cong: lấy mẫu dày 24px → polyline mịn như bezier, đúng hàm sóng */
    const pts: string[] = [];
    for (let px = PAD - 34; px <= width - PAD + 34; px += 24) {
      pts.push(`${pts.length === 0 ? "M" : "L"}${px.toFixed(1)} ${waveY(px).toFixed(1)}`);
    }
    return {
      meta: cards,
      laneW: width,
      d: pts.join(" "),
      cta: { left: ctaLeft, top: ctaTop },
    };
  }, [posts]);

  /* Bụi sáng lơ lửng nền */
  const particles = useMemo(() => {
    const rnd = mulberry32(20260928);
    const palette = ["#93c5fd", "#c4b5fd", "#fbcfe8", "#fde68a", "#ffffff"];
    return Array.from({ length: 46 }, (_, i) => ({
      key: i,
      left: rnd() * 100,
      top: rnd() * 100,
      size: 1 + rnd() * 2.4,
      color: palette[Math.floor(rnd() * palette.length)],
      dur: 6 + rnd() * 9,
      delay: -rnd() * 12,
      dx: (rnd() - 0.5) * 48,
      o: 0.35 + rnd() * 0.5,
    }));
  }, []);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const lenRef = useRef(0);
  const rafRef = useRef(false);
  const [progress, setProgress] = useState(0);
  const [fly, setFly] = useState(() => ({ x: PAD, y: waveY(PAD) }));
  const [trail, setTrail] = useState<{ x: number; y: number }[]>([]);

  /* Cuộn → % tiến trình + đom đóm bám đường cong */
  const update = useCallback(() => {
    const el = scrollerRef.current;
    const path = pathRef.current;
    if (!el || !path) return;
    if (!lenRef.current) lenRef.current = path.getTotalLength();
    const max = el.scrollWidth - el.clientWidth;
    const p = max > 0 ? Math.min(1, Math.max(0, el.scrollLeft / max)) : 0;
    setProgress(p);
    const L = lenRef.current;
    const head = path.getPointAtLength(p * L);
    setFly({ x: head.x, y: head.y });
    setTrail(
      [52, 100].map((back) => {
        const pt = path.getPointAtLength(Math.max(0, p * L - back));
        return { x: pt.x, y: pt.y };
      })
    );
  }, []);

  useEffect(() => {
    update();
    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = true;
      requestAnimationFrame(() => {
        rafRef.current = false;
        update();
      });
    };
    const el = scrollerRef.current;
    el?.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      el?.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [update]);

  const nudge = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    el?.scrollBy({ left: dir * el.clientWidth * 0.72, behavior: "smooth" });
  };

  const current = Math.round(progress * (posts.length - 1)) + 1;

  return (
    <section
      aria-label="Dòng truyện thanh niên trường học"
      className="relative overflow-hidden border-y border-white/5 bg-[#0a0f24]"
    >
      {/* ===== Khí quyển: quầng màu + bụi sao lơ lửng ===== */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-doan-600/20 blur-3xl" />
        <div className="absolute right-1/4 top-10 h-72 w-72 rounded-full bg-fuchsia-600/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
        {particles.map((pt) => (
          <span
            key={pt.key}
            className="tnth-particle absolute rounded-full"
            style={{
              left: `${pt.left}%`,
              top: `${pt.top}%`,
              width: pt.size,
              height: pt.size,
              background: pt.color,
              boxShadow: `0 0 ${pt.size * 3}px ${pt.color}`,
              ["--dx" as string]: `${pt.dx}px`,
              ["--dur" as string]: `${pt.dur}s`,
              ["--delay" as string]: `${pt.delay}s`,
              ["--o" as string]: pt.o,
            }}
          />
        ))}
      </div>

      {/* ===== Tiêu đề ===== */}
      <div className="relative mx-auto max-w-7xl px-4 pb-2 pt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-sky-300/70">
              Chiến dịch chữa lành của tuổi trẻ trường học
            </p>
            <h2 className="mt-2 flex flex-wrap items-center gap-x-3 font-serif-display text-xl font-black sm:text-2xl">
              <Heart className="h-5 w-5 fill-rose-400 text-rose-400" />
              <span className="bg-gradient-to-r from-rose-200 via-fuchsia-200 to-amber-100 bg-clip-text text-transparent">
                Mỗi ngày một tin tốt, mỗi tuần một câu chuyện đẹp
              </span>
              <Heart className="h-5 w-5 fill-rose-400 text-rose-400" />
            </h2>
          </div>
          <p className="hidden text-[11px] text-white/50 sm:block">
            Cuộn ngang hoặc bấm mũi tên · Rê chuột lên thẻ để hiện trích dẫn
          </p>
        </div>
      </div>

      {/* ===== Sân khấu cuộn ngang ===== */}
      <div className="relative">
        <div
          ref={scrollerRef}
          role="region"
          tabIndex={0}
          aria-label="Các câu chuyện, cuộn ngang để xem tiếp"
          className="scrollbar-hide snap-x overflow-x-auto outline-none focus-visible:ring-2 focus-visible:ring-sky-300/40"
        >
          <div className="relative" style={{ width: laneW, height: LANE_H }}>
            {/* --- Dòng chảy ánh sáng (SVG) --- */}
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox={`0 0 ${laneW} ${LANE_H}`}
              fill="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="glow-flow" x1="0" y1="0" x2={laneW} y2="0" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="#22d3ee" stopOpacity="0" />
                  <stop offset="0.05" stopColor="#22d3ee" />
                  <stop offset="0.5" stopColor="#818cf8" />
                  <stop offset="0.95" stopColor="#f0abfc" />
                  <stop offset="1" stopColor="#f0abfc" stopOpacity="0" />
                </linearGradient>
                <filter id="glow-soft" x="-30%" y="-260%" width="160%" height="620%">
                  <feGaussianBlur stdDeviation="7" />
                </filter>
              </defs>

              {/* Quầng neon mờ */}
              <path d={d} stroke="url(#glow-flow)" strokeWidth="13" strokeLinecap="round" opacity="0.16" filter="url(#glow-soft)" />
              {/* Thân đường sáng chính */}
              <path ref={pathRef} d={d} stroke="url(#glow-flow)" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
              {/* Hạt bụi chạy dọc đường (cảm giác dòng chảy) */}
              <path d={d} className="curve-dust" stroke="#e0f2fe" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="1 16" opacity="0.5" />

              {/* Đom đóm dẫn đường + vệt đuôi */}
              <g>
                {trail.map((t, i) => (
                  <circle
                    key={i}
                    cx={t.x}
                    cy={t.y}
                    r={4.5 - i * 1.4}
                    fill="#fde68a"
                    opacity={0.38 - i * 0.14}
                    filter="url(#glow-soft)"
                  />
                ))}
                <circle cx={fly.x} cy={fly.y} r="11" fill="#fbbf24" opacity="0.55" filter="url(#glow-soft)" />
                <circle cx={fly.x} cy={fly.y} r="4.2" fill="#fffbeb" />
                <circle cx={fly.x} cy={fly.y} r="2" fill="#ffffff" />
              </g>
            </svg>

            {/* --- Các thẻ truyện bám sóng --- */}
            {meta.map((m, i) => (
              <div
                key={m.post.id}
                className="absolute snap-center"
                style={{ left: m.left, top: m.top, width: m.w, height: m.h }}
              >
                <Tilt rotate={m.rot}>
                  <StoryCard post={m.post} big={m.big} index={i} />
                </Tilt>
              </div>
            ))}

            {/* --- Thẻ CTA cuối dòng --- */}
            <div className="absolute snap-center" style={{ left: cta.left, top: cta.top, width: CTA_W, height: CTA_H }}>
              <Tilt rotate={1.2}>
                <Link
                  href="/phan-anh"
                  className="group flex h-full flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-white/25 bg-white/[0.04] p-5 text-center backdrop-blur-sm transition-colors hover:border-rose-300/60 hover:bg-white/[0.08]"
                >
                  <span className="text-3xl">✍️</span>
                  <span className="font-serif-display text-base font-bold text-white">
                    Câu chuyện tiếp theo là của bạn
                  </span>
                  <span className="text-[11px] leading-relaxed text-white/60">
                    Gửi một tin tốt, một câu chuyện đẹp về chính đơn vị mình
                  </span>
                  <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-rose-300 to-amber-200 px-3.5 py-1.5 text-[11px] font-bold text-rose-950 shadow transition group-hover:gap-2.5">
                    Gửi ngay <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              </Tilt>
            </div>
          </div>
        </div>

        {/* Hai mép mờ dần */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[#0a0f24] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#0a0f24] to-transparent" />
      </div>

      {/* ===== Điều khiển + Thanh kiếm ánh sáng ===== */}
      <div className="relative mx-auto flex max-w-7xl items-center gap-4 px-4 pb-9 pt-3">
        <button
          type="button"
          onClick={() => nudge(-1)}
          aria-label="Xem câu chuyện trước"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 backdrop-blur transition hover:border-sky-300/50 hover:bg-white/10 hover:text-white"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => nudge(1)}
          aria-label="Xem câu chuyện tiếp theo"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 backdrop-blur transition hover:border-sky-300/50 hover:bg-white/10 hover:text-white"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Lightbar — thanh sáng dài theo % cuộn, chóp đèn nhọn */}
        <div className="relative h-[3px] flex-1 rounded-full bg-white/10">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-300 via-indigo-300 to-fuchsia-300"
            style={{
              width: `${(progress * 100).toFixed(2)}%`,
              boxShadow: "0 0 14px rgba(125,211,252,0.9), 0 0 30px rgba(165,180,252,0.45)",
            }}
          >
            <span
              className="absolute -right-1 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-white"
              style={{ boxShadow: "0 0 10px 2px rgba(255,255,255,0.9)" }}
            />
          </div>
        </div>

        <p className="shrink-0 font-serif-display text-sm font-bold text-white/70">
          {String(current).padStart(2, "0")}
          <span className="text-white/35"> / {String(posts.length).padStart(2, "0")}</span>
        </p>

        <Link
          href="/tin-tuc"
          className="hidden shrink-0 items-center gap-1 text-xs font-medium text-sky-200/80 transition hover:text-white sm:inline-flex"
        >
          Xem tất cả tin tốt <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}
