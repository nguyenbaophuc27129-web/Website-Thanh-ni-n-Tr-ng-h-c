import { NextRequest, NextResponse } from "next/server";
import { dbEnabled } from "@/lib/db";
import { errorResponse, jsonError, requestSession } from "@/lib/server/public-actions";
import { lookupFeedback } from "@/lib/server/public-feedback";

export const runtime = "nodejs";

/**
 * GET /api/phan-anh/[code] — tra cứu phản ánh theo mã:
 *   → { ok, feedback, messages, emails }  (không kèm ghi chú nội bộ, access_token, số điện thoại)
 * Mã kiểu cũ (PA-2026-00101) chỉ trả khi đăng nhập đúng tài khoản đã gửi.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  if (!dbEnabled()) return jsonError(503, "DB_UNAVAILABLE");
  const { code } = await params;
  try {
    const session = await requestSession(request);
    const data = await lookupFeedback(code, session);
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    return errorResponse(err, "PHAN-ANH");
  }
}
