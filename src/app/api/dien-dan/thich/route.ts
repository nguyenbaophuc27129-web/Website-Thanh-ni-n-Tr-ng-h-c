import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import { toObj } from "@/lib/server/store-tables";
import { viewForumRow } from "@/lib/server/forum-view";
import { fail, json, rateLimit, readBody, requireSession, serverError } from "@/lib/server/member-write";

export const runtime = "nodejs";

/**
 * POST /api/dien-dan/thich — bật/tắt "thích" bài viết hoặc bình luận
 *   { kind: "THREAD" | "COMMENT", id } → { ok, liked, likeCount, row }
 * - Đổi NGUYÊN TỬ trong 1 câu UPDATE (thêm/bớt đúng id người dùng trong
 *   liked_account_ids) → bấm cùng lúc từ nhiều máy không mất lượt thích.
 * - Chỉ thích được nội dung đang công khai hoặc của chính mình (cán bộ: mọi nội dung).
 */
export async function POST(request: NextRequest) {
  const session = await requireSession(request);
  if (session instanceof NextResponse) return session;
  const body = await readBody(request);
  const kind = body?.kind;
  const id = Number(body?.id);
  if ((kind !== "THREAD" && kind !== "COMMENT") || !Number.isSafeInteger(id) || id <= 0) {
    return fail("Dữ liệu gửi lên không hợp lệ.");
  }

  const limited = rateLimit(`forum-like:${session.accountId}`, 200, 10 * 60_000);
  if (limited) return limited;

  const entity = kind === "THREAD" ? "forumThreads" : "forumComments";
  const table = kind === "THREAD" ? "forum_threads" : "forum_comments";
  try {
    const rows = await query<Record<string, unknown>>(
      `UPDATE ${table}
          SET liked_account_ids = CASE WHEN $2::bigint = ANY(liked_account_ids)
                                       THEN array_remove(liked_account_ids, $2::bigint)
                                       ELSE array_append(liked_account_ids, $2::bigint) END
        WHERE id = $1 AND (status = 'PUBLISHED' OR author_account_id = $2 OR $3::boolean)
        RETURNING *`,
      [id, session.accountId, session.role !== "DOAN_VIEN"],
    );
    if (!rows[0]) return fail("Không tìm thấy nội dung hoặc nội dung đã bị ẩn.", 404);
    const obj = toObj(entity, rows[0]);
    const likedIds = (obj.likedByAccountIds as number[] | null) ?? [];
    return json({
      ok: true,
      liked: likedIds.includes(session.accountId),
      likeCount: likedIds.length,
      row: viewForumRow(obj, session),
    });
  } catch (err) {
    return serverError("FORUM", err);
  }
}
