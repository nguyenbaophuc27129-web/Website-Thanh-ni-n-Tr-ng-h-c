import { NextResponse, type NextRequest } from "next/server";
import { withTransaction } from "@/lib/db";
import { toObj } from "@/lib/server/store-tables";
import { moderateServer } from "@/lib/server/moderation";
import {
  UPLOAD_EXTS, fail, isUploadPath, json, notifyAdmin, rateLimit, readBody, requireSession, serverError, str,
} from "@/lib/server/member-write";

export const runtime = "nodejs";

/**
 * POST /api/dong-gop — đoàn viên gửi bài đóng góp chuyên mục Tin tức
 *   { categoryTag, title, excerpt?, content, coverDataUrl? } → { ok, row, verdict, reason }
 * - Luôn ở trạng thái PENDING chờ Ban biên tập duyệt đăng (duyệt + cộng điểm
 *   vẫn là thao tác cán bộ).
 * - Máy chủ tự kiểm duyệt AI; bị gắn cờ → thông báo Quản trị TW.
 * - Ảnh bìa chỉ nhận đường dẫn /uploads/dong-gop/... do /api/uploads tạo.
 */
export async function POST(request: NextRequest) {
  const session = await requireSession(request);
  if (session instanceof NextResponse) return session;
  const body = await readBody(request);
  if (!body) return fail("Dữ liệu gửi lên không hợp lệ.");

  const categoryTag = str(body.categoryTag);
  const title = str(body.title);
  const content = str(body.content);
  const excerpt = (str(body.excerpt) || content.slice(0, 150)).slice(0, 500);
  const cover = body.coverDataUrl;
  if (!categoryTag || categoryTag.length > 100) return fail("Chuyên mục không hợp lệ.");
  if (title.length < 8 || title.length > 255) return fail("Tiêu đề cần từ 8 đến 255 ký tự.");
  if (content.length < 40 || content.length > 50_000) return fail("Nội dung cần từ 40 đến 50.000 ký tự.");
  if (cover !== undefined && cover !== null && cover !== "" && !isUploadPath(cover, "dong-gop", UPLOAD_EXTS.image)) {
    return fail("Ảnh bìa phải được tải lên máy chủ qua nút chọn ảnh.");
  }

  const limited = rateLimit(`dong-gop:${session.accountId}`, 10, 10 * 60_000);
  if (limited) return limited;

  const mod = await moderateServer(`${title}\n${content}`);
  try {
    const row = await withTransaction(async (client) => {
      const r = await client.query(
        `INSERT INTO member_contributions (contributor_account_id, category_tag, title, excerpt, content, cover_data_url,
           status, ai_verdict, ai_reason, ai_model)
         VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, $8, $9) RETURNING *`,
        [session.accountId, categoryTag, title, excerpt, content, typeof cover === "string" && cover ? cover : null,
          mod.verdict, mod.reason ?? null, mod.model ?? null],
      );
      const c = r.rows[0] as Record<string, unknown>;
      if (mod.verdict === "FLAGGED") {
        await notifyAdmin(client, {
          type: "FORUM_FLAGGED",
          title: "Bài đóng góp chờ kiểm duyệt",
          message: `Bài "${title}" bị AI gắn cờ: ${mod.reason ?? "nội dung đáng ngờ"}.`,
          refType: "MEMBER_CONTRIBUTION",
          refId: Number(c.id),
          linkUrl: "/quan-tri/dong-gop",
        });
      }
      return c;
    });
    return json({ ok: true, row: toObj("memberContributions", row), verdict: mod.verdict, reason: mod.reason ?? null });
  } catch (err) {
    return serverError("DONG-GOP", err);
  }
}
