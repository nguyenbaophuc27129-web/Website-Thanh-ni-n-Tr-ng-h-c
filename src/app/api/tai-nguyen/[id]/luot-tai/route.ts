import { type NextRequest } from "next/server";
import { dbEnabled } from "@/lib/db";
import { fail, json, rateLimit } from "@/lib/server/member-write";
import { countResourceDownload, parseResourceId, viewerFingerprint } from "@/lib/server/resource-download";

export const runtime = "nodejs";

/**
 * POST /api/tai-nguyen/[id]/luot-tai — ghi nhận 1 lượt tải (hoặc xem clip YouTube)
 *   → { ok, counted, downloadCount }
 * Không cần đăng nhập; chỉ tài nguyên đã duyệt + công khai. Cùng người xem + cùng tài nguyên
 * chỉ tính 1 lần / 30 phút (counted = false khi trùng) — xem src/lib/server/resource-download.ts.
 * Số lượt do máy chủ giữ, không còn ghi qua /api/store.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = parseResourceId((await params).id);
  if (id === null) return fail("Mã tài nguyên không hợp lệ.");
  if (!dbEnabled()) return fail("Cơ sở dữ liệu chưa sẵn sàng.", 503);

  const limited = rateLimit(`luot-tai:${viewerFingerprint(request)}`, 60, 10 * 60_000);
  if (limited) return limited;

  try {
    const result = await countResourceDownload(request, id);
    if (!result) return fail("Không tìm thấy tài nguyên.", 404);
    return json({ ok: true, counted: result.counted, downloadCount: result.downloadCount });
  } catch (err) {
    console.warn("[TNTH][LUOT-TAI] Lỗi:", err instanceof Error ? err.message : err);
    return fail("Máy chủ chưa ghi nhận được lượt tải.", 500);
  }
}
