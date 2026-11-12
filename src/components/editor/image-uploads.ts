import type { Editor } from "@tiptap/core";
import { isSafeFileUrl } from "@/lib/safe-urls";
import { uploadFile, uploadFromUrl, type UploadKind } from "@/lib/upload-client";

/**
 * Ảnh trong ô soạn thảo luôn được lưu trên máy chủ (/uploads/<kind>/…):
 * - Chọn/dán/kéo thả tệp: chèn NGAY bằng bản xem tạm (blob:) rồi tải lên, xong thay đường dẫn.
 * - Ảnh dán kèm nội dung (link ngoài, data:image) hoặc bài cũ còn link ngoài: tự lấy về máy chủ.
 * Lỗi thì gỡ ảnh khỏi bài và báo. Khi còn ảnh đang tải, trang soạn bài khoá nút lưu.
 */

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export interface ImageUploaderOptions {
  kind: UploadKind;
  onPendingChange?: (n: number) => void;
  onError?: (message: string) => void;
}

/** Ảnh cần lấy về máy chủ (không phải tệp /uploads, không phải bản xem tạm đang tải) */
const needsLocalize = (src: unknown): src is string =>
  typeof src === "string" && !isSafeFileUrl(src) && /^(https?:|data:image\/)/i.test(src);

/** Bộ tải ảnh của từng ô soạn thảo — để các extension (dán/kéo thả tệp) tìm đúng bộ tải theo editor */
const uploaders = new WeakMap<Editor, ImageUploader>();
export const uploaderOf = (editor: Editor) => uploaders.get(editor);

export class ImageUploader {
  private pending = new Set<string>();
  private failedOnce = new Set<string>();

  constructor(
    private editor: Editor,
    private opts: ImageUploaderOptions,
  ) {
    uploaders.set(editor, this);
  }

  dispose() {
    if (uploaders.get(this.editor) === this) uploaders.delete(this.editor);
  }

  get pendingCount() {
    return this.pending.size;
  }

  private setPending(src: string, on: boolean) {
    if (on) this.pending.add(src);
    else this.pending.delete(src);
    this.opts.onPendingChange?.(this.pending.size);
  }

  /** Đổi src (to = null: gỡ ảnh) cho mọi ảnh đang trỏ `from`, không ghi vào lịch sử hoàn tác */
  private replaceSrc(from: string, to: string | null) {
    if (this.editor.isDestroyed) return;
    const { state } = this.editor;
    const tr = state.tr;
    const hits: { pos: number; size: number; attrs: Record<string, unknown> }[] = [];
    state.doc.descendants((node, pos) => {
      if (node.type.name === "figureImage" && node.attrs.src === from) hits.push({ pos, size: node.nodeSize, attrs: node.attrs });
    });
    if (!hits.length) return;
    for (const h of hits.reverse()) {
      if (to) tr.setNodeMarkup(h.pos, undefined, { ...h.attrs, src: to });
      else tr.delete(h.pos, h.pos + h.size);
    }
    tr.setMeta("addToHistory", false);
    this.editor.view.dispatch(tr);
  }

  private async run(src: string, job: () => Promise<{ url: string }>, failMessage: string) {
    this.setPending(src, true);
    try {
      const { url } = await job();
      this.replaceSrc(src, url);
    } catch (e) {
      this.replaceSrc(src, null);
      if (!this.failedOnce.has(src)) {
        this.failedOnce.add(src);
        this.opts.onError?.(e instanceof Error && e.message ? `${failMessage} (${e.message})` : failMessage);
      }
    } finally {
      this.setPending(src, false);
      if (src.startsWith("blob:")) URL.revokeObjectURL(src);
    }
  }

  /** Chèn các tệp ảnh tại vị trí `pos` (mặc định: con trỏ) và tải lên */
  insertFiles(files: File[], pos?: number) {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (images.length < files.length) this.opts.onError?.("Chỉ chèn được tệp hình ảnh (PNG, JPG, WebP, GIF).");
    let at = pos;
    for (const file of images) {
      if (file.size > MAX_IMAGE_BYTES) {
        this.opts.onError?.(`Ảnh "${file.name}" vượt 10MB — đã bỏ qua.`);
        continue;
      }
      const blob = URL.createObjectURL(file);
      const node = { type: "figureImage", attrs: { src: blob, alt: "", caption: "", width: "100", align: "center" } };
      const chain = this.editor.chain().focus();
      if (at === undefined) chain.insertContent(node).run();
      else {
        chain.insertContentAt(at, node).run();
        at = this.editor.state.selection.to;
      }
      void this.run(blob, () => uploadFile(file, this.opts.kind), `Không tải được ảnh "${file.name}" lên máy chủ`);
    }
  }

  /** Lấy ảnh từ link ngoài về máy chủ rồi chèn */
  insertFromUrl(url: string) {
    const node = { type: "figureImage", attrs: { src: url, alt: "", caption: "", width: "100", align: "center" } };
    this.editor.chain().focus().insertContent(node).run();
    // localizeAll() (gọi sau mỗi lần sửa) sẽ tải ảnh này về
  }

  /** Quét bài: ảnh còn link ngoài / data:image → lấy về máy chủ (chỉ một lần mỗi đường dẫn) */
  localizeAll() {
    if (this.editor.isDestroyed) return;
    const found = new Set<string>();
    this.editor.state.doc.descendants((node) => {
      if (node.type.name === "figureImage" && needsLocalize(node.attrs.src)) found.add(node.attrs.src);
    });
    for (const src of found) {
      if (this.pending.has(src)) continue;
      if (src.startsWith("data:")) {
        void this.run(
          src,
          async () => {
            const blob = await (await fetch(src)).blob();
            if (blob.size > MAX_IMAGE_BYTES) throw new Error("ảnh vượt 10MB");
            return uploadFile(new File([blob], "anh-dan.png", { type: blob.type || "image/png" }), this.opts.kind);
          },
          "Không lưu được ảnh dán vào bài",
        );
      } else {
        void this.run(src, () => uploadFromUrl(src, this.opts.kind), "Không lấy được ảnh từ link ngoài về máy chủ");
      }
    }
  }
}
