"use client";

import { NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import { Loader2 } from "lucide-react";

/**
 * Ảnh trong ô soạn thảo: hiện đúng như bài đăng (độ rộng, vị trí), chú thích sửa trực tiếp
 * ngay dưới ảnh. Ảnh đang tải lên (src blob:/data:/link ngoài) có lớp "Đang tải lên…".
 * Độ rộng / vị trí / xoá: thanh nổi khi chọn ảnh (rich-editor.tsx).
 */
export function FigureImageView({ node, updateAttributes, selected, editor }: ReactNodeViewProps) {
  const { src, alt, caption, width, align } = node.attrs as Record<string, string>;
  const uploading = typeof src === "string" && !src.startsWith("/uploads/");
  return (
    <NodeViewWrapper
      as="figure"
      data-width={width}
      data-align={align}
      className={`relative ${selected ? "rounded-xl ring-2 ring-blue-500 ring-offset-2" : ""}`}
    >
      <div data-drag-handle className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt || caption || ""} draggable={false} />
        {uploading ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/60 text-xs font-semibold text-blue-700">
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Đang tải ảnh lên máy chủ…
          </div>
        ) : null}
      </div>
      <input
        type="text"
        value={caption ?? ""}
        onChange={(e) => updateAttributes({ caption: e.target.value })}
        readOnly={!editor.isEditable}
        maxLength={1000}
        placeholder="Nhập chú thích ảnh (không bắt buộc)…"
        aria-label="Chú thích ảnh"
        className="mt-2 w-full bg-transparent text-center text-[13px] italic text-stone-500 outline-none placeholder:text-stone-300 focus:placeholder:text-stone-400"
      />
    </NodeViewWrapper>
  );
}
