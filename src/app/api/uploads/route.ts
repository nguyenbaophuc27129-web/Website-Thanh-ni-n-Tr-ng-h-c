import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, sessionFromToken } from "@/lib/server/auth";
import { recordAttempt, retryAfterSeconds } from "@/lib/server/rate-limit";
import {
  KIND_RULES,
  MediaError,
  isMediaKind,
  storeMedia,
  storeMediaFromUrl,
  type StoredMedia,
} from "@/lib/server/media";

export const runtime = "nodejs";

/**
 * Tải tệp lên máy chủ — lưu ở ổ đĩa (/uploads/...), KHÔNG nhét base64 vào DB.
 *   POST multipart/form-data { kind, file }   → tệp từ máy người dùng
 *   POST application/json    { kind, url }    → máy chủ tự tải tệp từ URL về
 *   → { ok, file: { url, mime, size, width?, height?, name? } }
 * Bắt buộc đăng nhập. Phân hệ bài viết / văn bản chỉ dành cho cán bộ quản trị.
 */

const MAX_BODY_BYTES = 30 * 1024 * 1024;
const UPLOAD_WINDOW_MS = 10 * 60_000;
const STAFF_UPLOADS_PER_WINDOW = 300;
const MEMBER_UPLOADS_PER_WINDOW = 40;

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await sessionFromToken(token).catch(() => null) : null;
  if (!session) {
    return NextResponse.json({ ok: false, error: "Bạn cần đăng nhập để tải tệp lên." }, { status: 401 });
  }
  if (Number(request.headers.get("content-length") ?? "0") > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "Tệp quá lớn (tối đa 25MB)." }, { status: 413 });
  }

  const isMember = session.role === "DOAN_VIEN";
  const limitKey = `upload:${session.accountId}`;
  const wait = retryAfterSeconds(limitKey, isMember ? MEMBER_UPLOADS_PER_WINDOW : STAFF_UPLOADS_PER_WINDOW);
  if (wait > 0) {
    return NextResponse.json(
      { ok: false, error: `Bạn tải lên quá nhiều tệp. Vui lòng thử lại sau ${Math.ceil(wait / 60)} phút.` },
      { status: 429, headers: { "Retry-After": String(wait) } },
    );
  }

  try {
    let kind: unknown;
    let stored: StoredMedia;
    const isJson = (request.headers.get("content-type") ?? "").includes("application/json");

    if (isJson) {
      const body = (await request.json().catch(() => null)) as { kind?: unknown; url?: unknown } | null;
      kind = body?.kind;
      if (!isMediaKind(kind)) throw new MediaError("Phân hệ tải lên không hợp lệ.");
      if (KIND_RULES[kind].staffOnly && isMember) throw new MediaError("Bạn không có quyền tải tệp vào mục này.", 403);
      if (typeof body?.url !== "string" || !body.url.trim()) throw new MediaError("Thiếu đường dẫn tệp.");
      recordAttempt(limitKey, UPLOAD_WINDOW_MS);
      stored = await storeMediaFromUrl(body.url.trim(), kind, session.accountId);
    } else {
      const form = await request.formData().catch(() => null);
      kind = form?.get("kind");
      const file = form?.get("file");
      if (!isMediaKind(kind)) throw new MediaError("Phân hệ tải lên không hợp lệ.");
      if (KIND_RULES[kind].staffOnly && isMember) throw new MediaError("Bạn không có quyền tải tệp vào mục này.", 403);
      if (!(file instanceof File)) throw new MediaError("Chưa chọn tệp.");
      recordAttempt(limitKey, UPLOAD_WINDOW_MS);
      stored = await storeMedia({
        buffer: Buffer.from(await file.arrayBuffer()),
        kind,
        originalName: file.name,
        accountId: session.accountId,
      });
    }
    return NextResponse.json({ ok: true, file: stored });
  } catch (err) {
    if (err instanceof MediaError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    console.warn("[TNTH][UPLOAD] Lỗi lưu tệp:", err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, error: "Máy chủ không lưu được tệp. Vui lòng thử lại." }, { status: 500 });
  }
}
