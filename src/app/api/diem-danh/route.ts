import { NextRequest, NextResponse } from "next/server";
import { dbEnabled } from "@/lib/db";
import { errorResponse, jsonError, requestSession } from "@/lib/server/public-actions";
import { addAttendance, attendanceStatus } from "@/lib/server/public-attendance";

export const runtime = "nodejs";

/**
 * Điểm danh hoạt động (trang QR công khai):
 *   GET  /api/diem-danh?activityId=… → { ok, exists, open, count }
 *   POST /api/diem-danh { activityId, memberName, memberClass? } → { ok, attendance, count }
 */
export async function GET(request: NextRequest) {
  if (!dbEnabled()) return jsonError(503, "DB_UNAVAILABLE");
  try {
    const status = await attendanceStatus(Number(request.nextUrl.searchParams.get("activityId")));
    return NextResponse.json({ ok: true, ...status });
  } catch (err) {
    return errorResponse(err, "DIEM-DANH");
  }
}

export async function POST(request: NextRequest) {
  if (!dbEnabled()) return jsonError(503, "DB_UNAVAILABLE");
  const body = (await request.json().catch(() => null)) as
    | { activityId?: unknown; memberName?: unknown; memberClass?: unknown }
    | null;
  if (!body || typeof body !== "object") return jsonError(400, "Dữ liệu gửi lên không hợp lệ.");
  try {
    const session = await requestSession(request);
    const data = await addAttendance(body, session);
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    return errorResponse(err, "DIEM-DANH");
  }
}
