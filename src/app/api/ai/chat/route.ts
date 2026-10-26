import { NextResponse } from "next/server";
import { callAI } from "@/lib/ai-client";
import { AI_GLOBAL_LIMIT, guardRequest } from "@/lib/server/require-session";

export const runtime = "nodejs";

/* Widget công khai — khách được hỏi, đếm theo IP thật (header X-Client-Ip do Caddy ghi đè) để một
   người không làm cạn lượt của người khác; thêm một trần chung cho mọi khách cộng lại (chống lạm
   dụng chi phí AI từ nhiều IP, vẫn thấp hơn AI_GLOBAL_LIMIT để chừa chỗ cho cán bộ/đoàn viên).
   Người đã đăng nhập đếm riêng theo tài khoản. */
const CHAT_WINDOW_MS = 10 * 60_000;
const CHAT_PER_ACCOUNT = 20;
const CHAT_GUEST_PER_IP = 10;
const CHAT_GUEST_POOL = 150;
const CHAT_MAX_CHARS = 500;

/* ════════════════════════════════════════════════════════════════════
   AI THẬT CHO "TRỢ LÝ ẢO" (widget chat công khai) — ĐÃ GẮN qua lib/ai-client.ts
   ════════════════════════════════════════════════════════════════════
   Kích hoạt: .env.local thêm key (Gemini free hoặc Claude trả phí) —
   xem hướng dẫn đầy đủ trong src/lib/ai-client.ts.
   Chưa có key → route trả 502 → widget tự fallback ruleReply
   (lib/ai-chat.ts) nên demo không bao giờ gãy.
   ════════════════════════════════════════════════════════════════════ */

const CHAT_SYSTEM_PROMPT =
  "Bạn là trợ lý ảo của Cổng thông tin Thanh niên Trường học (TW Đoàn TNCS Hồ Chí Minh). Trả lời ngắn gọn tiếng Việt (≤ 4 câu), thân thiện. Khi phù hợp, gợi ý đúng 1 đường dẫn trang trên cổng dạng /tin-tuc, /tai-nguyen, /bang-xep-hang, /phan-anh, /tai-nguyen, /hoc-sinh-3-tot, /dang-nhap. Không bịa thông tin ngoài phạm vi cổng.";

async function replyWithAI(message: string): Promise<{ reply: string; model: string }> {
  const { text, model } = await callAI({
    system: CHAT_SYSTEM_PROMPT,
    user: message,
    maxTokens: 600,
    temperature: 0.5,
  });
  return { reply: text, model };
}

/** POST /api/ai/chat — { message } → { ok, reply, model } */
export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as { message?: string } | null;
  const message = typeof payload?.message === "string" ? payload.message.trim() : "";
  if (!message) {
    return NextResponse.json({ ok: false, error: "Thiếu nội dung câu hỏi." }, { status: 400 });
  }
  if (message.length > CHAT_MAX_CHARS) {
    return NextResponse.json(
      { ok: false, error: `Câu hỏi quá dài — tối đa ${CHAT_MAX_CHARS} ký tự.` },
      { status: 413 },
    );
  }
  const gate = await guardRequest(request, {
    access: "guest",
    bucket: "ai-chat",
    windowMs: CHAT_WINDOW_MS,
    perAccount: CHAT_PER_ACCOUNT,
    guestPerIp: CHAT_GUEST_PER_IP,
    guestPool: CHAT_GUEST_POOL,
    global: AI_GLOBAL_LIMIT,
  });
  if (!gate.ok) return gate.response;
  try {
    const { reply, model } = await replyWithAI(message);
    return NextResponse.json({ ok: true, reply, model });
  } catch (err) {
    const message2 = err instanceof Error ? err.message : "AI_FAILED";
    console.warn("[TNTH][AI] Chat thất bại:", message2);
    return NextResponse.json({ ok: false, error: message2 }, { status: 502 });
  }
}
