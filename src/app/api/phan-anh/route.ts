import { NextRequest, NextResponse } from "next/server";
import { dbEnabled } from "@/lib/db";
import { errorResponse, jsonError, requestSession } from "@/lib/server/public-actions";
import { createFeedback, listMyFeedbacks, type FeedbackInput } from "@/lib/server/public-feedback";

export const runtime = "nodejs";

/**
 * Phản ánh – kiến nghị (không cần đăng nhập):
 *   POST /api/phan-anh { senderName, senderEmail, senderPhone?, senderOrgText?, senderCommuneUnion?,
 *                        senderProvinceUnion?, feedbackTopicId, title, content, evidenceNames? }
 *        → { ok, trackingCode, feedback, messages }  (mã tra cứu do máy chủ sinh ngẫu nhiên)
 *   GET  /api/phan-anh → { ok, feedbacks }  phản ánh của tài khoản đang đăng nhập
 */
export async function POST(request: NextRequest) {
  if (!dbEnabled()) return jsonError(503, "DB_UNAVAILABLE");
  const body = (await request.json().catch(() => null)) as FeedbackInput | null;
  if (!body || typeof body !== "object") return jsonError(400, "Dữ liệu gửi lên không hợp lệ.");
  try {
    const session = await requestSession(request);
    const { feedback, messages } = await createFeedback(body, session, request.headers.get("user-agent"));
    return NextResponse.json({ ok: true, trackingCode: feedback.trackingCode, feedback, messages });
  } catch (err) {
    return errorResponse(err, "PHAN-ANH");
  }
}

export async function GET(request: NextRequest) {
  if (!dbEnabled()) return jsonError(503, "DB_UNAVAILABLE");
  try {
    const session = await requestSession(request);
    if (!session) return jsonError(401, "Bạn cần đăng nhập để xem phản ánh của mình.");
    return NextResponse.json({ ok: true, feedbacks: await listMyFeedbacks(session) });
  } catch (err) {
    return errorResponse(err, "PHAN-ANH");
  }
}
