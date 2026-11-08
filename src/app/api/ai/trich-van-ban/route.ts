import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, sessionFromToken } from "@/lib/server/auth";
import { extractTextFromDataUrl } from "@/lib/server/file-text";

export const runtime = "nodejs";

/** Trùng giới hạn 4MB của trang Văn bản (fileDataUrl là base64 → xấp xỉ byte file). */
const MAX_FILE_BYTES = 4 * 1024 * 1024;

/**
 * POST /api/ai/trich-van-ban
 * Body: { fileName: string, fileDataUrl: string } (data URL ≤ 4MB)
 * → { ok, text } — text thô để đổ vào ô phân tích / lưu đính kèm.
 * Đăng nhập bắt buộc (cán bộ quản trị); khách → 401.
 */
export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  let session = null;
  if (token) {
    try {
      session = await sessionFromToken(token);
    } catch {
      session = null;
    }
  }
  if (!session) {
    return NextResponse.json({ ok: false, error: "Bạn cần đăng nhập để dùng chức năng này." }, { status: 401 });
  }
  if (session.role === "DOAN_VIEN") {
    return NextResponse.json({ ok: false, error: "Chức năng dành cho cán bộ quản trị." }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as
    | { fileName?: string; fileDataUrl?: string }
    | null;
  const fileName = payload?.fileName?.trim() ?? "";
  const fileDataUrl = payload?.fileDataUrl ?? "";
  if (!fileName || !fileDataUrl) {
    return NextResponse.json({ ok: false, error: "Thiếu tệp đính kèm." }, { status: 400 });
  }
  if (fileDataUrl.length > (MAX_FILE_BYTES / 3) * 4 + 256) {
    return NextResponse.json({ ok: false, error: "Tệp quá lớn — tối đa 4MB." }, { status: 413 });
  }

  try {
    const text = await extractTextFromDataUrl(fileName, fileDataUrl);
    return NextResponse.json({ ok: true, text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không trích được văn bản từ tệp.";
    console.warn("[TNTH][AI] Trích văn bản thất bại:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 422 });
  }
}
