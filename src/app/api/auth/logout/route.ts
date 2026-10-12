import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, revokeSession, sessionCookieOptions } from "@/lib/server/auth";

export const runtime = "nodejs";

/** POST /api/auth/logout — thu hồi phiên trong DB + xoá cookie. */
export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      await revokeSession(token);
    } catch (err) {
      // Không chặn việc đăng xuất nếu DB lỗi — cookie vẫn bị xoá.
      console.warn("[TNTH][AUTH] Không thu hồi được phiên:", err instanceof Error ? err.message : err);
    }
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return res;
}
