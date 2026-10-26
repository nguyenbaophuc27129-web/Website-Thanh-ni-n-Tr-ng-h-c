import { KIND_RULES, MIME_BY_EXT, UPLOAD_URL_PREFIX, type MediaKind } from "./media.ts";

/**
 * Kiểm đường dẫn tệp tải lên (/uploads/<phân hệ>/<năm>/<tháng>/<băm>.<đuôi>) — dùng chung cho
 * các API ghi của đoàn viên (member-write.ts) và luật ghi của cán bộ (store-write-policy.ts).
 */

/** Nhóm đuôi tệp theo loại — khớp cách media.ts lưu tệp (ảnh luôn chuyển WebP) */
const IMAGE_EXTS = ["webp"];
const VIDEO_EXTS = ["mp4", "mov", "webm"];
const DOCUMENT_EXTS = Object.keys(MIME_BY_EXT).filter((e) => !IMAGE_EXTS.includes(e) && !VIDEO_EXTS.includes(e));

export const UPLOAD_EXTS = { image: IMAGE_EXTS, video: VIDEO_EXTS, document: DOCUMENT_EXTS } as const;

/** Đuôi hợp lệ theo từng phân hệ — suy từ KIND_RULES để không lệch với media.ts */
export function extsForKind(kind: MediaKind): string[] {
  return KIND_RULES[kind].classes.flatMap((c) => [...UPLOAD_EXTS[c]]);
}

/** Kho tài nguyên nhận văn bản, ảnh (đã chuyển WebP) và video — như KIND_RULES["tai-nguyen"] */
export const RESOURCE_EXTS = extsForKind("tai-nguyen");
/** Văn bản ban hành nhận văn bản + ảnh — như KIND_RULES["van-ban"] */
export const VAN_BAN_EXTS = extsForKind("van-ban");

/**
 * Đường dẫn tệp hợp lệ của phân hệ `kind`: /uploads/<kind>/<năm>/<tháng>/<băm>.<đuôi>
 * đúng như storeMedia sinh ra — không nhận URL ngoài, data:, hay "../".
 */
export function isUploadPath(value: unknown, kind: MediaKind, exts: readonly string[]): value is string {
  if (typeof value !== "string" || value.length > 300) return false;
  const m = value.match(/^\/uploads\/([a-z-]+)\/(\d{4})\/(\d{2})\/([a-f0-9]{16,64})\.([a-z0-9]{1,5})$/);
  return !!m && value.startsWith(UPLOAD_URL_PREFIX) && m[1] === kind && exts.includes(m[5]);
}
