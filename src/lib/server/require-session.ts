import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionFromToken, type SessionDto } from "@/lib/server/auth";
import { recordAttempt, retryAfterSeconds } from "@/lib/server/rate-limit";
import { clientIpOf, ipRateKey } from "@/lib/server/client-ip";

/**
 * Chốt chặn đầu route handler: kiểm tra phiên đăng nhập + giới hạn tần suất.
 * Dùng cho các API tốn tài nguyên (AI, tải trang ngoài) để không bị gọi tự do.
 *
 *   const gate = await guardRequest(request, { access: "staff", bucket: "ai-bao-cao", ... });
 *   if (!gate.ok) return gate.response;
 *   gate.session → phiên người gọi (null nếu là khách)
 *
 * - access "guest": khách được dùng; "member": phải đăng nhập (kể cả đoàn viên);
 *   "staff": phải là cán bộ (mọi vai trò khác DOAN_VIEN).
 * - Đếm theo tài khoản. Khách đếm theo IP thật (`guestPerIp`, lấy từ header X-Client-Ip do Caddy
 *   ghi đè — xem client-ip.ts) và còn chịu thêm MỘT trần chung cho mọi khách (`guestPool`) để
 *   chặn lạm dụng chi phí từ nhiều IP. Không rõ IP (chạy không qua Caddy) → mọi khách gộp một khoá.
 * - Mỗi yêu cầu qua được chốt đều bị đếm, kể cả khi bước sau lỗi.
 */

export type AccessLevel = "guest" | "member" | "staff";

export interface GuardOptions {
  access: AccessLevel;
  /** Tên bộ đếm, vd. "ai-chat" */
  bucket: string;
  /** Độ dài cửa sổ đếm (ms) */
  windowMs: number;
  /** Số lượt / tài khoản cán bộ trong cửa sổ */
  perAccount: number;
  /** Số lượt / tài khoản đoàn viên (mặc định = perAccount) */
  perMember?: number;
  /** Trần chung cho TẤT CẢ khách cộng lại trong cửa sổ (access = "guest") — lớn hơn nhiều so với `guestPerIp` */
  guestPool?: number;
  /** Số lượt / IP của khách trong cửa sổ; bỏ trống = chỉ áp trần chung `guestPool` */
  guestPerIp?: number;
  /** Hạn mức chung mọi người dùng cộng lại — vd. tổng lượt gọi AI để giữ hạn mức key */
  global?: { bucket: string; max: number; windowMs: number };
}

/** Trần chung cho mọi lượt gọi AI (mọi route /api/ai/* cộng lại) — giữ hạn mức của key AI */
export const AI_GLOBAL_LIMIT = { bucket: "ai:toan-he-thong", max: 300, windowMs: 10 * 60_000 } as const;

export type GuardResult =
  | { ok: true; session: SessionDto | null }
  | { ok: false; response: NextResponse };

/** Đọc phiên từ cookie của Request thường (không cần NextRequest) */
export async function sessionOfRequest(request: Request): Promise<SessionDto | null> {
  const cookie = request.headers.get("cookie") ?? "";
  const raw = cookie
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  if (!raw) return null;
  let token: string;
  try {
    token = decodeURIComponent(raw);
  } catch {
    return null;
  }
  return sessionFromToken(token).catch(() => null);
}

export const isStaffSession = (s: SessionDto | null): s is SessionDto => !!s && s.role !== "DOAN_VIEN";

const minutesOf = (seconds: number) => Math.max(1, Math.ceil(seconds / 60));

function tooMany(message: string, wait: number): NextResponse {
  return NextResponse.json(
    { ok: false, error: message, retryAfter: wait },
    { status: 429, headers: { "Retry-After": String(wait) } },
  );
}

export async function guardRequest(request: Request, opts: GuardOptions): Promise<GuardResult> {
  const session = await sessionOfRequest(request);

  // Khách chỉ được qua khi route cho phép VÀ có đặt hạn mức chung cho khách
  if (!session && (opts.access !== "guest" || !opts.guestPool)) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Bạn cần đăng nhập để dùng chức năng này." },
        { status: 401 },
      ),
    };
  }
  if (opts.access === "staff" && !isStaffSession(session)) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Chức năng này chỉ dành cho tài khoản cán bộ Đoàn." },
        { status: 403 },
      ),
    };
  }

  // Đã đăng nhập: hạn mức riêng từng tài khoản. Khách: hạn mức theo IP + trần chung mọi khách
  const key = session ? `${opts.bucket}:acc:${session.accountId}` : `${opts.bucket}:guest`;
  const max = session
    ? session.role === "DOAN_VIEN" ? (opts.perMember ?? opts.perAccount) : opts.perAccount
    : (opts.guestPool ?? 0);
  const wait = retryAfterSeconds(key, max);
  if (wait > 0) {
    const message = session
      ? `Bạn đã dùng chức năng này quá nhiều lần. Vui lòng thử lại sau ${minutesOf(wait)} phút.`
      : `Hệ thống đang nhận quá nhiều yêu cầu từ khách. Vui lòng thử lại sau ${minutesOf(wait)} phút hoặc đăng nhập để tiếp tục.`;
    return { ok: false, response: tooMany(message, wait) };
  }
  // Khách: kiểm riêng theo IP trước (một người dùng không làm cạn trần chung của người khác)
  const ipKey = !session && opts.guestPerIp ? `${opts.bucket}:ip:${ipRateKey(clientIpOf(request))}` : null;
  if (ipKey) {
    const ipWait = retryAfterSeconds(ipKey, opts.guestPerIp!);
    if (ipWait > 0) {
      return {
        ok: false,
        response: tooMany(
          `Bạn đã dùng chức năng này quá nhiều lần. Vui lòng thử lại sau ${minutesOf(ipWait)} phút hoặc đăng nhập để tiếp tục.`,
          ipWait,
        ),
      };
    }
  }

  if (opts.global) {
    const globalWait = retryAfterSeconds(opts.global.bucket, opts.global.max);
    if (globalWait > 0) {
      return {
        ok: false,
        response: tooMany(`Hệ thống đang quá tải. Vui lòng thử lại sau ${minutesOf(globalWait)} phút.`, globalWait),
      };
    }
    recordAttempt(opts.global.bucket, opts.global.windowMs);
  }
  if (ipKey) recordAttempt(ipKey, opts.windowMs);
  recordAttempt(key, opts.windowMs);
  return { ok: true, session };
}
