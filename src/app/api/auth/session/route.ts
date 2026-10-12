import { NextRequest, NextResponse } from "next/server";
import { dbEnabled } from "@/lib/db";
import { SESSION_COOKIE, sessionFromToken } from "@/lib/server/auth";

export const runtime = "nodejs";

/** GET /api/auth/session — đọc cookie phiên → { ok, session } hoặc 401. */
export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ ok: false, error: "NO_SESSION" }, { status: 401 });
  }
  if (!dbEnabled()) {
    return NextResponse.json({ ok: false, error: "DB_UNAVAILABLE" }, { status: 503 });
  }
  try {
    const session = await sessionFromToken(token);
    if (!session) {
      return NextResponse.json({ ok: false, error: "NO_SESSION" }, { status: 401 });
    }
    return NextResponse.json({ ok: true, session });
  } catch (err) {
    const message = err instanceof Error ? err.message : "SESSION_FAILED";
    if (message === "DB_UNAVAILABLE") {
      return NextResponse.json({ ok: false, error: message }, { status: 503 });
    }
    console.warn("[TNTH][AUTH] Lỗi kiểm tra phiên:", message);
    return NextResponse.json({ ok: false, error: "SESSION_FAILED" }, { status: 500 });
  }
}
