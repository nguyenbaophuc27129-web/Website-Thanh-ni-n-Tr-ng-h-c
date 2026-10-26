import { NextResponse, type NextRequest } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { toObj } from "@/lib/server/store-tables";
import { moderateServer } from "@/lib/server/moderation";
import { viewForumRow } from "@/lib/server/forum-view";
import { canModerateForum, forumViewerOf, parseForumMedia, pickFreeAlias } from "@/lib/server/forum-write";
import { fail, json, notifyAdmin, rateLimit, readBody, requireSession, serverError, str } from "@/lib/server/member-write";

export const runtime = "nodejs";

/**
 * POST /api/dien-dan/binh-luan — bình luận ẩn danh vào 1 bài Diễn đàn
 *   { threadId, content, media? } → { ok, row, verdict, reason }
 * - Chỉ bình luận được bài đang công khai hoặc bài của chính mình
 *   (cán bộ được bình luận cả bài đang ẩn — như giao diện kiểm duyệt cũ).
 * - Máy chủ tự kiểm duyệt: sạch → PUBLISHED; bị gắn cờ → PENDING_REVIEW + thông báo Quản trị TW.
 */
export async function POST(request: NextRequest) {
  const session = await requireSession(request);
  if (session instanceof NextResponse) return session;
  const body = await readBody(request);
  if (!body) return fail("Dữ liệu gửi lên không hợp lệ.");

  const threadId = Number(body.threadId);
  const content = str(body.content);
  if (!Number.isSafeInteger(threadId) || threadId <= 0) return fail("Bài viết không hợp lệ.");
  if (content.length < 2 || content.length > 1000) return fail("Bình luận cần từ 2 đến 1000 ký tự.");
  const parsed = parseForumMedia(body.media);
  if ("error" in parsed) return fail(parsed.error);

  const thread = (
    await query<{ status: string; author_account_id: string }>(
      "SELECT status, author_account_id FROM forum_threads WHERE id = $1",
      [threadId],
    )
  )[0];
  // Bài đang ẩn: chỉ tác giả và cán bộ có quyền kiểm duyệt diễn đàn được bình luận (khớp luật đọc snapshot)
  const isStaff = canModerateForum(session);
  if (!thread || (thread.status !== "PUBLISHED" && Number(thread.author_account_id) !== session.accountId && !isStaff)) {
    return fail("Không tìm thấy bài viết hoặc bài đã bị ẩn.", 404);
  }

  const limited = rateLimit(`forum-comment:${session.accountId}`, 30, 10 * 60_000);
  if (limited) return limited;

  const mod = await moderateServer(content);
  try {
    const row = await withTransaction(async (client) => {
      const alias = await pickFreeAlias(client);
      const r = await client.query(
        `INSERT INTO forum_comments (thread_id, alias, author_account_id, content, media, status, ai_verdict, ai_reason, ai_model)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9) RETURNING *`,
        [threadId, alias, session.accountId, content, JSON.stringify(parsed.media),
          mod.verdict === "CLEAN" ? "PUBLISHED" : "PENDING_REVIEW", mod.verdict, mod.reason ?? null, mod.model ?? null],
      );
      const c = r.rows[0] as Record<string, unknown>;
      if (mod.verdict === "FLAGGED") {
        await notifyAdmin(client, {
          type: "FORUM_FLAGGED",
          title: "Diễn đàn: bình luận chờ kiểm duyệt",
          message: `Bình luận của ${alias} trong bài #${threadId} bị AI gắn cờ: ${mod.reason ?? "nội dung đáng ngờ"}.`,
          refType: "FORUM_COMMENT",
          refId: Number(c.id),
          linkUrl: "/quan-tri/dien-dan",
        });
      }
      return c;
    });
    return json({
      ok: true,
      row: viewForumRow(toObj("forumComments", row), forumViewerOf(session)),
      verdict: mod.verdict,
      reason: mod.reason ?? null,
    });
  } catch (err) {
    return serverError("FORUM", err);
  }
}
