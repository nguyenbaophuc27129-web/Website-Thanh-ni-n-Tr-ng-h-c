import { NextRequest, NextResponse } from "next/server";
import { dbEnabled } from "@/lib/db";
import { errorResponse, jsonError, requestSession } from "@/lib/server/public-actions";
import { addCitizenMessage } from "@/lib/server/public-feedback";

export const runtime = "nodejs";

/**
 * POST /api/phan-anh/[code]/tin-nhan { content } — người gửi nhắn thêm vào phản ánh
 * (cùng điều kiện truy cập như tra cứu) → { ok, message, messages }
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  if (!dbEnabled()) return jsonError(503, "DB_UNAVAILABLE");
  const { code } = await params;
  const body = (await request.json().catch(() => null)) as { content?: unknown } | null;
  try {
    const session = await requestSession(request);
    const data = await addCitizenMessage(code, body?.content, session);
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    return errorResponse(err, "PHAN-ANH");
  }
}
