import { type NextRequest } from "next/server";
import { dbEnabled } from "@/lib/db";
import { fail, json, rateLimit, readBody } from "@/lib/server/member-write";
import { parseResourceId } from "@/lib/server/resource-download";
import { cleanReferrer, countPostView, visitorHash } from "@/lib/server/post-view";

export const runtime = "nodejs";

/**
 * POST /api/tin-tuc/[id]/luot-xem — ghi nhận 1 lượt xem bài viết
 *   body (tuỳ chọn) { referrer } → { ok, counted, viewCount }
 * Không cần đăng nhập; chỉ bài đã xuất bản. Cùng người xem + cùng bài chỉ tính 1 lần / 30 phút
 * (counted = false khi trùng) — xem src/lib/server/post-view.ts. Số lượt do máy chủ giữ,
 * cột view_count không còn ghi qua /api/store.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = parseResourceId((await params).id);
  if (id === null) return fail("Mã bài viết không hợp lệ.");
  if (!dbEnabled()) return fail("Cơ sở dữ liệu chưa sẵn sàng.", 503);

  const limited = rateLimit(`luot-xem:${visitorHash(request)}`, 120, 10 * 60_000);
  if (limited) return limited;

  try {
    const body = await readBody(request);
    const result = await countPostView(request, id, cleanReferrer(body?.referrer));
    if (!result) return fail("Không tìm thấy bài viết.", 404);
    return json({ ok: true, counted: result.counted, viewCount: result.viewCount });
  } catch (err) {
    console.warn("[TNTH][LUOT-XEM] Lỗi:", err instanceof Error ? err.message : err);
    return fail("Máy chủ chưa ghi nhận được lượt xem.", 500);
  }
}
