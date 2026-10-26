import { NextResponse, type NextRequest } from "next/server";
import { withTransaction } from "@/lib/db";
import { toObj } from "@/lib/server/store-tables";
import { moderateServer } from "@/lib/server/moderation";
import { viewForumRow } from "@/lib/server/forum-view";
import { parseForumMedia, pickFreeAlias } from "@/lib/server/forum-write";
import { fail, json, notifyAdmin, rateLimit, readBody, requireSession, serverError, str } from "@/lib/server/member-write";

export const runtime = "nodejs";

/**
 * POST /api/dien-dan/bai-viet — đăng bài Diễn đàn ẩn danh
 *   { title, content, topic?, media? } → { ok, row, verdict, reason }
 * - Bắt buộc đăng nhập (đoàn viên lẫn cán bộ đều qua đây).
 * - Máy chủ tự kiểm duyệt (AI → luật dự phòng); verdict trình duyệt gửi kèm bị bỏ qua.
 *   Sạch → PUBLISHED; bị gắn cờ → HIDDEN chờ Ban biên tập duyệt + thông báo Quản trị TW.
 * - Bí danh do máy chủ sinh, không trùng bài/bình luận đã có.
 * - `row` đã che theo người xem (hợp đồng 2) — client đưa thẳng vào state.
 */
export async function POST(request: NextRequest) {
  const session = await requireSession(request);
  if (session instanceof NextResponse) return session;
  const body = await readBody(request);
  if (!body) return fail("Dữ liệu gửi lên không hợp lệ.");

  const title = str(body.title);
  const content = str(body.content);
  const topic = str(body.topic);
  if (title.length < 5 || title.length > 150) return fail("Tiêu đề cần từ 5 đến 150 ký tự.");
  if (content.length < 10 || content.length > 2000) return fail("Nội dung cần từ 10 đến 2000 ký tự.");
  if (topic.length > 100) return fail("Chủ đề không hợp lệ.");
  const parsed = parseForumMedia(body.media);
  if ("error" in parsed) return fail(parsed.error);

  const limited = rateLimit(`forum-thread:${session.accountId}`, 10, 10 * 60_000);
  if (limited) return limited;

  const mod = await moderateServer(`${title}\n${content}`);
  try {
    const row = await withTransaction(async (client) => {
      const alias = await pickFreeAlias(client);
      const r = await client.query(
        `INSERT INTO forum_threads (alias, author_account_id, title, content, topic, media, status, ai_verdict, ai_reason, ai_model)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10) RETURNING *`,
        [alias, session.accountId, title, content, topic || null, JSON.stringify(parsed.media),
          mod.verdict === "CLEAN" ? "PUBLISHED" : "HIDDEN", mod.verdict, mod.reason ?? null, mod.model ?? null],
      );
      const t = r.rows[0] as Record<string, unknown>;
      if (mod.verdict === "FLAGGED") {
        await notifyAdmin(client, {
          type: "FORUM_FLAGGED",
          title: "Diễn đàn: bài viết chờ kiểm duyệt",
          message: `Bài "${title}" của ${alias} bị AI gắn cờ: ${mod.reason ?? "nội dung đáng ngờ"}.`,
          refType: "FORUM_THREAD",
          refId: Number(t.id),
          linkUrl: "/quan-tri/dien-dan",
        });
      }
      return t;
    });
    return json({
      ok: true,
      row: viewForumRow(toObj("forumThreads", row), session),
      verdict: mod.verdict,
      reason: mod.reason ?? null,
    });
  } catch (err) {
    return serverError("FORUM", err);
  }
}
