import { NextRequest, NextResponse } from "next/server";
import { dbEnabled } from "@/lib/db";
import {
  SESSION_COOKIE,
  createSession,
  loginAccount,
  sessionCookieOptions,
} from "@/lib/server/auth";
import { clientIpOf } from "@/lib/server/client-ip";
import { clearAttempts, recordAttempt, retryAfterSeconds } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

/** Chặn dò mật khẩu mà không khoá tài khoản: sai 10 lần / 15 phút thì phải chờ hết cửa sổ */
const MAX_FAILED_LOGINS = 10;
const FAILED_LOGIN_WINDOW_MS = 15 * 60_000;

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
  const limitKey = `login:${username.toLowerCase()}`;
  const wait = retryAfterSeconds(limitKey, MAX_FAILED_LOGINS);
  if (wait > 0) {
    return NextResponse.json(
      { ok: false, error: `Nhập sai quá nhiều lần. Vui lòng thử lại sau ${Math.ceil(wait / 60)} phút.` },
      { status: 429, headers: { "Retry-After": String(wait) } },
    );
  }
  try {
    const result = await loginAccount(username, password);
    if (!result.ok) {
      if (result.status === 401) recordAttempt(limitKey, FAILED_LOGIN_WINDOW_MS);
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: result.status },
      );
    }
    clearAttempts(limitKey);
    // IP thật do Caddy ghi (X-Client-Ip) — X-Forwarded-For chỉ là IP máy chủ OneShield
    const token = await createSession(
      result.accountId,
      request.headers.get("user-agent"),
      clientIpOf(request),
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
