"use client";

import { useEffect, useRef, useState } from "react";
import { uploadFile, type UploadKind } from "@/lib/upload-client";
import { RESOURCE_MAX_FILES, RESOURCE_MAX_FILE_BYTES, nameWithStoredExt } from "@/lib/resource-files";
import type { ResourceAttachment } from "@/types";

/**
 * Hook chọn & tải NHIỀU tệp lên máy chủ (qua /api/uploads), dùng lại cho mọi nơi cần
 * tải nhiều tệp (đóng góp tài nguyên, trang quản trị tài nguyên…):
 *  - mỗi tệp có trạng thái chờ / đang tải / xong / lỗi, xoá hoặc thử lại được;
 *  - tải song song tối đa `concurrency` tệp (mặc định 3), phần còn lại xếp hàng;
 *  - từ chối ngay ở trình duyệt tệp rỗng, quá dung lượng, trùng tên+dung lượng, vượt số tệp;
 *  - `uploading` = còn tệp chờ/đang tải → nơi dùng phải chặn nút gửi.
 * Máy chủ vẫn kiểm lại mọi thứ — kiểm ở đây chỉ để báo lỗi sớm.
 */

export type UploadStatus = "queued" | "uploading" | "done" | "error";

export interface UploadItem {
  id: string;
  /** Tên hiển thị — sau khi tải xong đã khớp đuôi tệp thật trên máy chủ (ảnh → .webp) */
  name: string;
  sizeKb: number;
  status: UploadStatus;
  /** Đường dẫn /uploads/... (khi status = done) */
  url?: string;
  mime?: string;
  error?: string;
}

export interface MultiUploadOptions {
  max?: number;
  maxBytes?: number;
  concurrency?: number;
  /** Gọi khi có tệp bị từ chối ngay ở trình duyệt (thường là hiện toast) */
  onReject?: (message: string) => void;
}

const kbOf = (bytes: number) => Math.max(1, Math.ceil(bytes / 1024));

export function useMultiUpload(kind: UploadKind, options: MultiUploadOptions = {}) {
  const max = options.max ?? RESOURCE_MAX_FILES;
  const maxBytes = options.maxBytes ?? RESOURCE_MAX_FILE_BYTES;
  const concurrency = Math.max(1, options.concurrency ?? 3);

  const [items, setItems] = useState<UploadItem[]>([]);
  // Nguồn sự thật nằm ở ref (đọc đồng bộ khi chọn liên tiếp); state chỉ để render lại
  const itemsRef = useRef<UploadItem[]>([]);
  const filesRef = useRef(new Map<string, File>());
  const queueRef = useRef<string[]>([]);
  const activeRef = useRef(0);
  const controllersRef = useRef(new Map<string, AbortController>());
  const seqRef = useRef(0);
  const onRejectRef = useRef(options.onReject);
  useEffect(() => {
    onRejectRef.current = options.onReject;
  });

  // Các hàm dưới đây chỉ đọc/ghi qua ref nên không cần useCallback; khai báo dạng function để pump gọi lại chính nó
  function commit(next: UploadItem[]) {
    itemsRef.current = next;
    setItems(next);
  }
  function patch(id: string, change: Partial<UploadItem>) {
    if (!itemsRef.current.some((i) => i.id === id)) return; // đã bị xoá
    commit(itemsRef.current.map((i) => (i.id === id ? { ...i, ...change } : i)));
  }

  /** Khởi động thêm lượt tải cho tới khi đủ `concurrency` lượt chạy song song */
  function pump() {
    while (activeRef.current < concurrency && queueRef.current.length > 0) {
      const id = queueRef.current.shift()!;
      const file = filesRef.current.get(id);
      if (!file) continue;
      activeRef.current++;
      const ac = new AbortController();
      controllersRef.current.set(id, ac);
      patch(id, { status: "uploading", error: undefined });
      uploadFile(file, kind, ac.signal)
        .then((res) =>
          patch(id, {
            status: "done",
            url: res.url,
            mime: res.mime,
            name: nameWithStoredExt(file.name, res.url),
            sizeKb: kbOf(res.size || file.size),
          }),
        )
        .catch((err: unknown) => {
          if (ac.signal.aborted) return; // người dùng đã bỏ tệp này
          patch(id, { status: "error", error: err instanceof Error ? err.message : "Không tải được tệp lên máy chủ." });
        })
        .finally(() => {
          activeRef.current--;
          controllersRef.current.delete(id);
          pump();
        });
    }
  }

  function addFiles(list: FileList | File[] | null | undefined): string[] {
    const incoming = Array.from(list ?? []);
    if (incoming.length === 0) return [];
    const rejected: string[] = [];
    const next = [...itemsRef.current];
    let overflow = 0;
    for (const file of incoming) {
      if (next.length >= max) {
        overflow++;
        continue;
      }
      if (file.size === 0) {
        rejected.push(`"${file.name}" là tệp rỗng.`);
        continue;
      }
      if (file.size > maxBytes) {
        rejected.push(`"${file.name}" vượt quá ${Math.round(maxBytes / 1024 / 1024)}MB.`);
        continue;
      }
      if (next.some((i) => i.name === file.name && filesRef.current.get(i.id)?.size === file.size)) {
        rejected.push(`"${file.name}" đã được chọn.`);
        continue;
      }
      const id = `u${++seqRef.current}`;
      filesRef.current.set(id, file);
      queueRef.current.push(id);
      next.push({ id, name: file.name, sizeKb: kbOf(file.size), status: "queued" });
    }
    if (overflow > 0) rejected.push(`Chỉ được chọn tối đa ${max} tệp — ${overflow} tệp bị bỏ qua.`);
    commit(next);
    pump();
    if (rejected.length > 0) onRejectRef.current?.(rejected.join(" "));
    return rejected;
  }

  function remove(id: string) {
    controllersRef.current.get(id)?.abort();
    queueRef.current = queueRef.current.filter((q) => q !== id);
    filesRef.current.delete(id);
    commit(itemsRef.current.filter((i) => i.id !== id));
  }

  function retry(id: string) {
    const item = itemsRef.current.find((i) => i.id === id);
    if (!item || item.status !== "error" || !filesRef.current.has(id)) return;
    queueRef.current.push(id);
    patch(id, { status: "queued", error: undefined });
    pump();
  }

  function reset() {
    controllersRef.current.forEach((c) => c.abort());
    queueRef.current = [];
    filesRef.current.clear();
    commit([]);
  }

  /** Nạp sẵn các tệp đã lưu trên máy chủ (mở sửa tài nguyên): hiện như tệp đã tải xong, thay hết danh sách hiện có */
  function load(files: ResourceAttachment[]) {
    reset();
    commit(
      files.slice(0, max).map((f) => ({
        id: `u${++seqRef.current}`,
        name: f.name,
        sizeKb: f.sizeKb,
        status: "done" as const,
        url: f.url,
        mime: f.mime,
      })),
    );
  }

  // Rời trang / đóng modal: huỷ các lượt tải còn dở
  useEffect(() => {
    const controllers = controllersRef.current;
    return () => controllers.forEach((c) => c.abort());
  }, []);

  return {
    items,
    addFiles,
    remove,
    retry,
    reset,
    load,
    max,
    maxBytes,
    /** Còn tệp chờ hoặc đang tải — chặn gửi biểu mẫu */
    uploading: items.some((i) => i.status === "queued" || i.status === "uploading"),
    hasError: items.some((i) => i.status === "error"),
    /** Các tệp đã tải xong, đúng dạng ResourceAttachment gửi cho API */
    uploaded: items.filter((i) => i.status === "done" && i.url) as (UploadItem & { url: string })[],
    canAdd: items.length < max,
  };
}

export type MultiUpload = ReturnType<typeof useMultiUpload>;
