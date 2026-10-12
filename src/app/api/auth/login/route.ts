import { NextRequest, NextResponse } from "next/server";
import { dbEnabled } from "@/lib/db";
import {
  SESSION_COOKIE,
  createSession,
  loginAccount,
  sessionCookieOptions,
} from "@/lib/server/auth";

export const runtime = "nodejs";

/** POST /api/auth/login — { username, password } → { ok, session } + cookie phiên. */
export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as
    | { username?: string; password?: string }
    | null;
  const username = String(payload?.username ?? "").trim();
  const password = String(payload?.password ?? "");
  if (!username || !password) {
    return NextResponse.json(
      { ok: false, error: "Thiếu tên đăng nhập hoặc mật khẩu." },
      { status: 400 },
    );
  }
  if (!dbEnabled()) {
    // Client sẽ fallback chế độ localStorage (tài khoản demo) khi gặp 503.
    return NextResponse.json(
      { ok: false, error: "DB_UNAVAILABLE" },
      { status: 503 },
    );
  }
  try {
    const result = await loginAccount(username, password);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: result.status },
      );
    }
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const ipOk = ip && /^[0-9a-fA-F:.]+$/.test(ip) ? ip : null;
    const token = await createSession(
      result.accountId,
      request.headers.get("user-agent"),
      ipOk,
    );
    const res = NextResponse.json({ ok: true, session: result.session });
    const viaHttps =
      request.headers.get("x-forwarded-proto")?.includes("https") ??
      new URL(request.url).protocol === "https:";
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(viaHttps));
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "LOGIN_FAILED";
    if (message === "DB_UNAVAILABLE") {
      return NextResponse.json({ ok: false, error: message }, { status: 503 });
    }
    console.warn("[TNTH][AUTH] Lỗi đăng nhập:", message);
    return NextResponse.json({ ok: false, error: "LOGIN_FAILED" }, { status: 500 });
  }
}
