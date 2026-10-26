"use client";

import { useState } from "react";
import { AlertCircle, Check, Loader2, RotateCcw, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMeta, formatSizeKb } from "@/lib/resource-files";
import type { MultiUpload } from "@/lib/use-multi-upload";

/**
 * Ô chọn nhiều tệp (bấm chọn hoặc kéo thả) + danh sách tệp kèm trạng thái.
 * Điều khiển bởi hook useMultiUpload (src/lib/use-multi-upload.ts).
 */
export function MultiUploadField({
  upload,
  accept,
  disabled,
}: {
  upload: MultiUpload;
  accept?: string;
  disabled?: boolean;
}) {
  const [over, setOver] = useState(false);
  const full = !upload.canAdd;
  const blocked = disabled || full;

  return (
    <div className="space-y-2">
      <label
        onDragOver={(e) => {
          if (blocked) return;
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (!blocked) upload.addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-3 py-4 text-center text-sm transition-colors",
          blocked
            ? "cursor-not-allowed border-stone-200 bg-stone-50 text-stone-400"
            : over
              ? "cursor-pointer border-cyan-500 bg-cyan-50 text-cyan-700"
              : "cursor-pointer border-stone-300 text-stone-500 hover:border-doan-400 hover:text-doan-600",
        )}
      >
        <span className="inline-flex items-center gap-2 font-medium">
          <Upload className="h-4 w-4" />
          {full ? `Đã đủ ${upload.max} tệp` : "Chọn tệp từ máy hoặc kéo thả vào đây"}
        </span>
        <span className="text-[11px] text-stone-400">
          Tối đa {upload.max} tệp, mỗi tệp ≤ {Math.round(upload.maxBytes / 1024 / 1024)}MB · đã chọn {upload.items.length}/{upload.max}
        </span>
        <input
          type="file"
          multiple
          accept={accept}
          disabled={blocked}
          className="hidden"
          data-testid="multi-upload-input"
          onChange={(e) => {
            upload.addFiles(e.target.files);
            e.target.value = ""; // cho phép chọn lại đúng tệp vừa xoá
          }}
        />
      </label>

      {upload.items.length > 0 && (
        <ul className="space-y-1.5" aria-live="polite">
          {upload.items.map((it) => {
            const fm = formatMeta(it.name);
            const Icon = fm.icon;
            return (
              <li
                key={it.id}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm",
                  it.status === "error"
                    ? "border-rose-200 bg-rose-50"
                    : it.status === "done"
                      ? "border-emerald-200 bg-emerald-50/60"
                      : "border-stone-200 bg-white",
                )}
              >
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", fm.tint)}>
                  <Icon className="h-4 w-4" strokeWidth={1.5} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-stone-800" title={it.name}>{it.name}</p>
                  <p className={cn("text-[11px]", it.status === "error" ? "text-rose-600" : "text-stone-500")}>
                    {formatSizeKb(it.sizeKb)}
                    {it.status === "queued" && " · Đang chờ…"}
                    {it.status === "uploading" && " · Đang tải lên…"}
                    {it.status === "done" && " · Đã tải lên"}
                    {it.status === "error" && ` · ${it.error ?? "Tải thất bại"}`}
                  </p>
                </div>
                {it.status === "uploading" || it.status === "queued" ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-cyan-600" aria-label="Đang tải" />
                ) : it.status === "done" ? (
                  <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-label="Đã xong" />
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" aria-label="Lỗi" />
                    <button
                      type="button"
                      onClick={() => upload.retry(it.id)}
                      className="rounded-md p-1 text-rose-600 hover:bg-rose-100"
                      aria-label={`Thử lại ${it.name}`}
                      title="Thử lại"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => upload.remove(it.id)}
                  className="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                  aria-label={`Xoá ${it.name}`}
                  title="Xoá"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
