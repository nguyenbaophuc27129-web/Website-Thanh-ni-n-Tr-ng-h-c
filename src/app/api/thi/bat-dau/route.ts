import { NextRequest, NextResponse } from "next/server";
import { dbEnabled } from "@/lib/db";
import { errorResponse, jsonError, requestSession } from "@/lib/server/public-actions";
import { startAttempt } from "@/lib/server/public-quiz";

export const runtime = "nodejs";

/**
 * POST /api/thi/bat-dau { examId, examineeName, examineeOrgText? }
 *   → { ok, attempt, accessToken, firstQuestionId }
 * Tạo lượt thi ở máy chủ (gắn tài khoản nếu đang đăng nhập). `accessToken` là mã bí mật
 * của lượt — giữ ở trình duyệt để gọi tra-loi / nop; DB chỉ lưu băm SHA-256.
 */
export async function POST(request: NextRequest) {
  if (!dbEnabled()) return jsonError(503, "DB_UNAVAILABLE");
  const body = (await request.json().catch(() => null)) as
    | { examId?: unknown; examineeName?: unknown; examineeOrgText?: unknown }
    | null;
  if (!body || typeof body !== "object") return jsonError(400, "Dữ liệu gửi lên không hợp lệ.");
  try {
    const session = await requestSession(request);
    return NextResponse.json({ ok: true, ...(await startAttempt(body, session)) });
  } catch (err) {
    return errorResponse(err, "THI");
  }
}
