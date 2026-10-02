"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

/** Nút lên đầu trang — hiện khi cuộn quá 1 màn hình (học theo cổng HSV) */
export function ScrollTopButton() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 480);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Lên đầu trang"
      className={cn(
        "no-print fixed bottom-6 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-doan-700 text-white shadow-lg shadow-doan-900/30 ring-1 ring-white/30 transition-all duration-300 hover:bg-doan-600",
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      )}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
