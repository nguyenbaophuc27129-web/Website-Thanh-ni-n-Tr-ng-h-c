/**
 * Ảnh bìa bài viết kèm vị trí căn khung, KHÔNG thêm cột DB:
 * vị trí được ghi vào đuôi đường dẫn ảnh dưới dạng fragment, ví dụ
 *   /uploads/bai-viet/2026/10/ab12cd.jpg#focus=50,30
 * (x, y là phần trăm 0–100 — đúng giá trị CSS object-position: 50% 30%).
 * Trình duyệt không gửi fragment lên máy chủ nên tệp vẫn phục vụ bình thường.
 * Dùng được cả client lẫn server — không import gì từ server.
 */

export type CoverFocus = { x: number; y: number };

const FOCUS_RE = /#focus=(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)$/;

const clamp = (n: number) => Math.min(100, Math.max(0, n));

/** Tách chuỗi ảnh bìa thô thành đường dẫn sạch + vị trí (nếu có) */
export function parseCover(raw?: string | null): { src: string; focus: CoverFocus | null } {
  if (!raw) return { src: "", focus: null };
  const m = FOCUS_RE.exec(raw);
  if (!m) return { src: raw, focus: null };
  const x = parseFloat(m[1]);
  const y = parseFloat(m[2]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return { src: raw, focus: null };
  return { src: raw.slice(0, m.index), focus: { x: clamp(x), y: clamp(y) } };
}

/** Ghép vị trí vào đường dẫn; focus null hoặc đúng giữa (50,50) → đường dẫn sạch */
export function withCoverFocus(raw: string, focus: CoverFocus | null): string {
  const { src } = parseCover(raw);
  if (!src || !focus) return src;
  const x = Math.round(clamp(focus.x));
  const y = Math.round(clamp(focus.y));
  if (x === 50 && y === 50) return src;
  return `${src}#focus=${x},${y}`;
}

/** Giá trị CSS object-position, hoặc undefined khi không có vị trí */
export function coverPosition(focus: CoverFocus | null | undefined): string | undefined {
  return focus ? `${focus.x}% ${focus.y}%` : undefined;
}

/** Chuỗi ảnh bìa thô của bài (cover_data_url ưu tiên, bài cũ chỉ có cover_url) */
export function postCoverRaw(post: { coverDataUrl?: string; coverUrl?: string }): string {
  return post.coverDataUrl || post.coverUrl || "";
}
