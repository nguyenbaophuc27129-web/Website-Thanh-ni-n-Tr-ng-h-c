"use client";

import dynamic from "next/dynamic";

/**
 * Trình soạn thảo bài viết — tải động, chỉ chạy trên trình duyệt: thư viện soạn thảo (Tiptap)
 * không nằm trong gói tải của các trang khác.
 */
export const RichEditor = dynamic(() => import("./rich-editor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-400">
      Đang mở trình soạn thảo…
    </div>
  ),
});

export type { RichEditorProps } from "./rich-editor";
