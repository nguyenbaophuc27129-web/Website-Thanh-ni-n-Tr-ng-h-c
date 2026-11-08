import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, sessionFromToken } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REMOVEBG_ENDPOINT = "https://api.remove.bg/v1.0/removebg";
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024; // remove.bg giới hạn ảnh vào tối đa 12MB

/**
 * POST /api/cat-nen — proxy cắt nền remove.bg (https://www.remove.bg/api).
 * API key CHỈ nằm ở BE (env REMOVEBG_API_KEY) — client không bao giờ thấy key.
 * Body: { imageDataUrl (data:image/jpeg|png|webp;base64,… ≤12MB), size? ("full" | "auto") }
 * Tài khoản free: 50 lượt/tháng, chỉ nhận preview (0.25MP) — gọi "full" sẽ bị
 * 400 size_not_allowed → tự tụt về "auto". Nạp credit thì "full" trả ảnh gốc.
 */
export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await sessionFromToken(token) : null;
  if (!session) {
    return NextResponse.json({ ok: false, error: "Vui lòng đăng nhập để dùng xưởng ảnh." }, { status: 401 });
  }

  const apiKey = process.env.REMOVEBG_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "SERVER_CHUA_CO_KEY" },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => null)) as { imageDataUrl?: string; size?: string } | null;
  const dataUrl = body?.imageDataUrl;
  if (!dataUrl || !/^data:image\/(jpeg|png|webp);base64,/.test(dataUrl)) {
    return NextResponse.json({ ok: false, error: "Ảnh không hợp lệ." }, { status: 400 });
  }
  const bytes = Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
  if (!bytes.length || bytes.length > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ ok: false, error: "Ảnh vượt 12MB — chọn ảnh nhỏ hơn." }, { status: 413 });
  }

  const preferred = process.env.REMOVEBG_SIZE?.trim() || body?.size?.trim() || "full";

  const callRemoveBg = async (
    size: string
  ): Promise<{ payload: Buffer | null; status: number; errCode?: string; errDetail?: string; credits?: string }> => {
    const form = new FormData();
    form.append("image_file", new Blob([new Uint8Array(bytes)], { type: "image/jpeg" }), "photo.jpg");
    form.append("size", size);
    form.append("type", "person");
    form.append("format", "png");
    const res = await fetch(REMOVEBG_ENDPOINT, {
      method: "POST",
      headers: { "X-Api-Key": apiKey },
      body: form,
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      let code = "";
      let detail = "";
      try {
        const j = (await res.json()) as { errors?: { title?: string; detail?: string; code?: string }[] };
        code = j.errors?.[0]?.code ?? "";
        detail = j.errors?.[0]?.title || j.errors?.[0]?.detail || "";
      } catch {
        // body lỗi không phải JSON — bỏ qua
      }
      return { payload: null, status: res.status, errCode: code, errDetail: detail };
    }
    return {
      payload: Buffer.from(await res.arrayBuffer()),
      status: 200,
      credits: res.headers.get("X-Credits-Charged") ?? undefined,
    };
  };

  try {
    let out = await callRemoveBg(preferred);
    // Free account không gọi được size full/hd → tụt về preview "auto" (miễn phí)
    if (out.status === 400 && preferred !== "auto" && (out.errCode === "size_not_allowed" || /size/i.test(out.errDetail ?? ""))) {
      out = await callRemoveBg("auto");
    }
    if (!out.payload) {
      const messages: Record<number, string> = {
        400: out.errCode === "size_not_allowed"
          ? "Tài khoản remove.bg không hỗ trợ kích thước ảnh này."
          : `remove.bg từ chối ảnh (${out.errDetail || "yêu cầu không hợp lệ"}).`,
        401: "API key remove.bg không hợp lệ — kiểm tra biến REMOVEBG_API_KEY trên server.",
        402: "remove.bg đã hết lượt miễn phí / credit — nạp thêm tại remove.bg/pricing hoặc thử lại tháng sau.",
        403: "remove.bg từ chối xử lý ảnh này.",
        429: "Gọi AI cắt nền quá nhanh — đợi chút rồi thử lại.",
      };
      return NextResponse.json(
        { ok: false, error: messages[out.status] ?? `remove.bg lỗi ${out.status}: ${out.errDetail || "không rõ"}` },
        { status: 502 }
      );
    }
    return NextResponse.json({
      ok: true,
      imageDataUrl: `data:image/png;base64,${out.payload.toString("base64")}`,
      creditsCharged: out.credits ?? undefined,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "CONNECT_FAILED";
    console.warn("[TNTH][CAT-NEN] remove.bg lỗi:", msg);
    return NextResponse.json({ ok: false, error: "Không kết nối được remove.bg — kiểm tra mạng rồi thử lại." }, { status: 502 });
  }
}
