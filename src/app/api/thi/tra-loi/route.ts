import { NextRequest, NextResponse } from "next/server";
import { dbEnabled } from "@/lib/db";
import { errorResponse, jsonError } from "@/lib/server/public-actions";
import { answerAdaptive } from "@/lib/server/public-quiz";

export const runtime = "nodejs";

/**
 * POST /api/thi/tra-loi { attemptId, accessToken, questionId, answer } — CHỈ đề thích ứng:
 *   → { ok, correct, nextQuestionId, trail }
 * Máy chủ chấm câu vừa làm, ghi lộ trình vào lượt thi và chọn câu kế tiếp
 * (đúng → khó hơn, sai → dễ hơn). nextQuestionId = null → hết câu, nộp bài.
 */
export async function POST(request: NextRequest) {
  if (!dbEnabled()) return jsonError(503, "DB_UNAVAILABLE");
  const body = (await request.json().catch(() => null)) as
    | { attemptId?: unknown; accessToken?: unknown; questionId?: unknown; answer?: unknown }
    | null;
  if (!body || typeof body !== "object") return jsonError(400, "Dữ liệu gửi lên không hợp lệ.");
  try {
    return NextResponse.json({ ok: true, ...(await answerAdaptive(body)) });
  } catch (err) {
    return errorResponse(err, "THI");
  }
}
