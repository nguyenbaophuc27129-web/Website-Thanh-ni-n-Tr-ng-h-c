import { aliasCandidates, fallbackAlias } from "@/lib/forum-alias";
import { FORUM_MEDIA_MAX_ITEMS } from "@/lib/forum-media";
import { UPLOAD_EXTS, isUploadPath } from "@/lib/server/member-write";
import type { ForumMedia } from "@/types";

/** Kiểm tra danh sách ảnh/video đính kèm bài/bình luận diễn đàn do trình duyệt gửi */
export function parseForumMedia(raw: unknown): { media: ForumMedia[] } | { error: string } {
  if (raw === undefined || raw === null) return { media: [] };
  if (!Array.isArray(raw)) return { error: "Danh sách tệp đính kèm không hợp lệ." };
  if (raw.length > FORUM_MEDIA_MAX_ITEMS) return { error: `Tối đa ${FORUM_MEDIA_MAX_ITEMS} tệp đính kèm mỗi bài.` };
  const media: ForumMedia[] = [];
  for (const item of raw as Record<string, unknown>[]) {
    const kind = item?.kind;
    if (kind !== "image" && kind !== "video") return { error: "Tệp đính kèm phải là ảnh hoặc video." };
    if (!isUploadPath(item.dataUrl, "dien-dan", kind === "image" ? UPLOAD_EXTS.image : UPLOAD_EXTS.video)) {
      return { error: "Tệp đính kèm phải được tải lên máy chủ qua mục Ảnh / video." };
    }
    const name = typeof item.name === "string" ? item.name.trim().slice(0, 255) : "";
    media.push({ kind, dataUrl: item.dataUrl, ...(name ? { name } : {}) });
  }
  if (media.filter((m) => m.kind === "video").length > 1) return { error: "Mỗi bài chỉ đính kèm tối đa 1 video." };
  return { media };
}

interface Queryable {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
}

/** Chọn bí danh ẩn danh chưa dùng ở cả bài viết lẫn bình luận (tra DB một lượt) */
export async function pickFreeAlias(client: Queryable): Promise<string> {
  const candidates = aliasCandidates();
  const r = await client.query(
    `SELECT alias FROM forum_threads WHERE alias = ANY($1::text[])
     UNION SELECT alias FROM forum_comments WHERE alias = ANY($1::text[])`,
    [candidates],
  );
  const used = new Set(r.rows.map((row) => String(row.alias)));
  return candidates.find((a) => !used.has(a)) ?? fallbackAlias();
}
