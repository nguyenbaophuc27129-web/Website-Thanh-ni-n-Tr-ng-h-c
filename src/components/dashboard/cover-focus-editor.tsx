"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { Move } from "lucide-react";
import { coverPosition, parseCover, withCoverFocus } from "@/lib/cover";

type Pt = { x: number; y: number };

const clamp = (n: number) => Math.min(100, Math.max(0, n));

/* Tỉ lệ khung cố định 470:250 — ảnh lệch tỉ lệ này mới tràn khung và kéo được */
const FRAME_RATIO = 470 / 250;

/**
 * Khung ảnh bìa 470:250 — kéo ảnh để chỉnh vị trí căn khung (object-position).
 * `value` là chuỗi ảnh thô (có thể kèm #focus=x,y), `onChange` trả lại chuỗi thô mới khi thả tay / bấm phím.
 * Chỉ kéo được khi ảnh thật sự tràn khung (tỉ lệ khác 470:250).
 * Ngay dưới khung có một hàng gợi ý + nút "Về giữa"; sau đó là 3 khung xem trước nhỏ
 * cho các tỉ lệ thẻ thực tế trên trang chủ (`compact` thì ẩn các khung này và dòng ghi chú).
 * `children` hiện đè trong khung (vd. nút bỏ ảnh) — bấm vào nút không bắt đầu kéo.
 */
export function CoverFocusEditor({
  value,
  onChange,
  children,
  compact = false,
}: {
  value: string;
  onChange: (raw: string) => void;
  children?: ReactNode;
  compact?: boolean;
}) {
  const { src, focus } = parseCover(value);
  const frameRef = useRef<HTMLDivElement>(null);
  /* Kích thước thật của ảnh (gắn với src để tự bỏ khi đổi ảnh) */
  const [nat, setNat] = useState<{ src: string; w: number; h: number } | null>(null);
  /* Vị trí đang kéo (cục bộ, mượt) — null khi không kéo */
  const [drag, setDrag] = useState<Pt | null>(null);
  const dragRef = useRef<{ id: number; sx: number; sy: number; x0: number; y0: number; ox: number; oy: number } | null>(
    null
  );

  const cur: Pt = drag ?? focus ?? { x: 50, y: 50 };
  const pos = coverPosition(cur);
  const natOk = nat && nat.src === src ? nat : null;
  const canDrag = !!natOk && Math.abs(natOk.w / natOk.h - FRAME_RATIO) > 0.01;
  const isOff = Math.round(cur.x) !== 50 || Math.round(cur.y) !== 50;

  /* Phần ảnh tràn ra ngoài khung (px) theo từng trục — ảnh phủ kín khung (object-cover) */
  const overflow = () => {
    const el = frameRef.current;
    if (!el || !natOk) return null;
    const cw = el.clientWidth;
    const ch = el.clientHeight;
    const scale = Math.max(cw / natOk.w, ch / natOk.h);
    return { ox: natOk.w * scale - cw, oy: natOk.h * scale - ch };
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!canDrag || (e.target as HTMLElement).closest("button")) return;
    const o = overflow();
    if (!o) return;
    dragRef.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, x0: cur.x, y0: cur.y, ox: o.ox, oy: o.oy };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag(cur);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    /* Kéo ảnh sang phải dx px → x giảm; trục tràn < 1px thì khoá */
    const x = d.ox >= 1 ? clamp(d.x0 - ((e.clientX - d.sx) / d.ox) * 100) : d.x0;
    const y = d.oy >= 1 ? clamp(d.y0 - ((e.clientY - d.sy) / d.oy) * 100) : d.y0;
    setDrag({ x, y });
  };

  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (drag) onChange(withCoverFocus(src, drag));
    setDrag(null);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!canDrag || e.target !== e.currentTarget) return; // phím trên nút con (Về giữa, Bỏ ảnh) không dịch ảnh
    const step = e.shiftKey ? 10 : 2;
    let dx = 0;
    let dy = 0;
    if (e.key === "ArrowLeft") dx = -step;
    else if (e.key === "ArrowRight") dx = step;
    else if (e.key === "ArrowUp") dy = -step;
    else if (e.key === "ArrowDown") dy = step;
    else return;
    e.preventDefault();
    const o = overflow();
    const x = !o || o.ox >= 1 ? clamp(cur.x + dx) : cur.x;
    const y = !o || o.oy >= 1 ? clamp(cur.y + dy) : cur.y;
    onChange(withCoverFocus(src, { x, y }));
  };

  return (
    <div className="space-y-2.5">
      <div
        ref={frameRef}
        role="group"
        tabIndex={canDrag ? 0 : undefined}
        aria-label={canDrag ? "Kéo để chỉnh vị trí ảnh" : "Ảnh đại diện bài viết"}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        style={{ touchAction: "none" }}
        className={`relative aspect-[470/250] w-full select-none overflow-hidden rounded-xl border border-slate-200 bg-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
          !canDrag ? "cursor-default" : drag ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Ảnh đại diện bài viết"
          draggable={false}
          onLoad={(e) =>
            setNat({ src, w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
          }
          className="pointer-events-none h-full w-full object-cover"
          style={{ objectPosition: pos }}
        />
        {children}
      </div>

      {/* Hàng gợi ý + Về giữa (chỉ hiện khi đã biết kích thước ảnh) */}
      {natOk ? (
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          {canDrag ? (
            <p className="inline-flex items-center gap-1 text-[11px] text-slate-500">
              <Move className="h-3 w-3 shrink-0" /> Kéo ảnh (hoặc dùng phím mũi tên) để chỉnh vị trí
            </p>
          ) : (
            <p className="text-[11px] text-slate-500">Ảnh vừa khít khung, không cần chỉnh</p>
          )}
          {canDrag && isOff && !drag ? (
            <button
              type="button"
              onClick={() => onChange(withCoverFocus(src, null))}
              className="text-[11px] font-medium text-blue-600 hover:underline"
            >
              Về giữa
            </button>
          ) : null}
        </div>
      ) : null}

      {compact ? null : (
        <>
          {/* Xem trước các tỉ lệ khung thực tế */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Thẻ tin 16:10", ratio: "aspect-[16/10]" },
              { label: "Tin phụ 16:9", ratio: "aspect-video" },
              { label: "Danh sách 4:3", ratio: "aspect-[4/3]" },
            ].map((t) => (
              <div key={t.label}>
                <div className={`${t.ratio} w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" style={{ objectPosition: pos }} />
                </div>
                <p className="mt-1 text-center text-[10px] font-medium text-slate-500">{t.label}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-400">Trong trang bài viết, ảnh hiện đầy đủ không cắt.</p>
        </>
      )}
    </div>
  );
}
