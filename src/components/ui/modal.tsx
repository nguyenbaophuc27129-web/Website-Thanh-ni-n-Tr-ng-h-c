"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-stone-900/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className={cn(
          "animate-modal-in relative flex max-h-[88vh] w-full flex-col rounded-xl bg-white shadow-2xl",
          wide ? "max-w-3xl" : "max-w-lg"
        )}
      >
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-stone-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            aria-label="Đóng"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
        <div className="thin-scrollbar flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>
        {footer ? (
          <div className="flex justify-end gap-2 border-t border-stone-100 px-5 py-3.5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
