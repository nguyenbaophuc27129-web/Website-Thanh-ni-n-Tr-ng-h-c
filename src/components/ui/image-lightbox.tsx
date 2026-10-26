"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

/** Ảnh cần phóng to — tài nguyên (ResourceAttachment) và ảnh trong bài viết đều khớp kiểu này */
export interface LightboxImage {
  url: string;
  name: string;
}

/** Phóng to ảnh toàn màn hình — chuyển ảnh bằng nút / phím ← →, đóng bằng Esc hoặc bấm nền */
export function ImageLightbox({
  images,
  index,
  onIndex,
  onClose,
}: {
  images: LightboxImage[];
  index: number | null;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const open = index !== null;
  const total = images.length;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") onIndex((index! - 1 + total) % total);
      else if (e.key === "ArrowRight") onIndex((index! + 1) % total);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, index, total, onIndex, onClose]);

  const img = open ? images[index!] : null;
  return (
    <AnimatePresence>
      {img ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[95] flex flex-col items-center justify-center bg-[#050914]/95 p-4 backdrop-blur-md"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Xem ảnh phóng to"
        >
          <button
            type="button"
            aria-label="Đóng"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          {total > 1 && (
            <>
              <button
                type="button"
                aria-label="Ảnh trước"
                onClick={(e) => {
                  e.stopPropagation();
                  onIndex((index! - 1 + total) % total);
                }}
                className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition-colors hover:bg-white/20 sm:left-6"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Ảnh sau"
                onClick={(e) => {
                  e.stopPropagation();
                  onIndex((index! + 1) % total);
                }}
                className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-6"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={img.url}
            src={img.url}
            alt={img.name}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[80vh] w-auto max-w-full rounded-xl border border-white/20 object-contain shadow-2xl"
          />
          <p className="mt-3 max-w-2xl truncate px-6 text-center text-xs text-slate-300">
            {img.name} {total > 1 ? `· ${index! + 1}/${total}` : ""}
          </p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
