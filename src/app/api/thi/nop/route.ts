import { NextRequest, NextResponse } from "next/server";
import { dbEnabled } from "@/lib/db";
import { errorResponse, jsonError } from "@/lib/server/public-actions";
import { submitAttempt } from "@/lib/server/public-quiz";

export const runtime = "nodejs";

/**
 * POST /api/thi/nop { attemptId, accessToken, answers } → { ok, attempt, perQuestion, late }
 * Máy chủ chấm điểm bằng đáp án trong DB. Điểm (autoScore/maxScore) hay lộ trình
 * trình duyệt gửi kèm đều bị bỏ qua; đề thích ứng lấy lộ trình đã ghi qua tra-loi.
 */
export async function POST(request: NextRequest) {
  if (!dbEnabled()) return jsonError(503, "DB_UNAVAILABLE");
  const body = (await request.json().catch(() => null)) as
    | { attemptId?: unknown; accessToken?: unknown; answers?: unknown }
    | null;
  if (!body || typeof body !== "object") return jsonError(400, "Dữ liệu gửi lên không hợp lệ.");
  try {
    return NextResponse.json({ ok: true, ...(await submitAttempt(body)) });
  } catch (err) {
    return errorResponse(err, "THI");
  }
}
