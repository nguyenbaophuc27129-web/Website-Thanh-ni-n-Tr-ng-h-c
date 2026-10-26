import { NextResponse } from "next/server";
import { moderateWithAI } from "@/lib/server/moderation";
import { AI_GLOBAL_LIMIT, guardRequest } from "@/lib/server/require-session";

export const runtime = "nodejs";

/* ════════════════════════════════════════════════════════════════════
   AI THẬT CHO "KIỂM DUYỆT DIỄN ĐÀN" — ĐÃ GẮN qua lib/ai-client.ts
   ════════════════════════════════════════════════════════════════════
   Kích hoạt: .env.local thêm key (Gemini free hoặc Claude trả phí) —
   xem hướng dẫn đầy đủ trong src/lib/ai-client.ts.
   Chưa có key → route trả 502. Lời nhắc AI + phân tích kết quả dùng chung
   với các API ghi của đoàn viên (lib/server/moderation.ts) — các API đó
   tự rơi về luật dự phòng ruleModerate khi AI lỗi.
   ════════════════════════════════════════════════════════════════════ */

/** POST /api/ai/kiem-duyet — { text } → { ok, verdict, reason, model } */
export async function POST(request: Request) {
  // Bắt buộc đăng nhập (đoàn viên trở lên) + giới hạn lượt theo tài khoản
  const gate = await guardRequest(request, {
    access: "member",
    bucket: "ai-kiem-duyet",
    windowMs: 10 * 60_000,
    perAccount: 120,
    perMember: 30,
    global: AI_GLOBAL_LIMIT,
  });
  if (!gate.ok) return gate.response;

  const payload = (await request.json().catch(() => null)) as { text?: string } | null;
  const text = payload?.text?.trim() ?? "";
  if (text.length < 2) {
    return NextResponse.json({ ok: false, error: "Nội dung quá ngắn để kiểm duyệt." }, { status: 400 });
  }
  try {
    const { verdict, reason, model } = await moderateWithAI(text);
    return NextResponse.json({ ok: true, verdict, reason, model });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI_FAILED";
    console.warn("[TNTH][AI] Kiểm duyệt thất bại:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
