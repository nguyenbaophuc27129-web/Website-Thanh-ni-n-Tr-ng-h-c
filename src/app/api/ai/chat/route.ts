import { NextResponse } from "next/server";
import { ruleReply } from "@/lib/ai-chat";

export const runtime = "nodejs";

/* ════════════════════════════════════════════════════════════════════
   ⭐ NỐI AI THẬT CHO "TRỢ LÝ ẢO" (widget chat công khai) — 1 HÀM DƯỚI ĐÂY
   ════════════════════════════════════════════════════════════════════
   Cách nối:
   1. .env.local thêm: AI_API_KEY / AI_BASE_URL / AI_MODEL (xem route
      phan-tich-cong-van để biết chi tiết).
   2. Trong hàm replyWithAI: XOÁ return ruleReply(message) và BỎ COMMENT
      mẫu A (OpenAI-compatible) hoặc mẫu B (Anthropic).
   3. Client nhận { ok, reply, model } — reply là TEXT thường; widget tự
      render link gợi ý bằng cách nhận diện đường dẫn "/abc-xyz" trong
      câu trả lời nếu muốn (không bắt buộc).
   ════════════════════════════════════════════════════════════════════ */

async function replyWithAI(message: string): Promise<{ reply: string; model: string }> {
  // ---- MẶC ĐỊNH (demo): bộ quy tắc theo từ khoá ----
  return { reply: ruleReply(message).text, model: "tnth-chat-v1 (mô phỏng quy tắc)" };

  /* ---- MẪU A: API tương thích OpenAI ----
  const res = await fetch(`${process.env.AI_BASE_URL ?? "https://api.openai.com/v1"}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL ?? "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Bạn là trợ lý ảo của Cổng thông tin Thanh niên Trường học (TW Đoàn TNCS Hồ Chí Minh). Trả lời ngắn gọn tiếng Việt (≤ 4 câu), thân thiện. Khi phù hợp, gợi ý đúng 1 đường dẫn trang trên cổng dạng /tin-tuc, /van-ban, /bang-xep-hang, /phan-anh, /tai-nguyen, /chung-nhan/tra-cuu, /dang-nhap. Không bịa thông tin ngoài phạm vi cổng.",
        },
        { role: "user", content: message },
      ],
      temperature: 0.5,
      max_tokens: 300,
    }),
  });
  if (!res.ok) throw new Error(`AI HTTP ${res.status}`);
  const data = await res.json();
  const reply = (data.choices?.[0]?.message?.content ?? "").trim();
  return { reply, model: process.env.AI_MODEL ?? "gpt-4o-mini" };
  ---------------------------------------------------------------- */
}

/** POST /api/ai/chat — { message } → { ok, reply, model } */
export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as { message?: string } | null;
  const message = payload?.message?.trim() ?? "";
  if (!message) {
    return NextResponse.json({ ok: false, error: "Thiếu nội dung câu hỏi." }, { status: 400 });
  }
  try {
    const { reply, model } = await replyWithAI(message);
    return NextResponse.json({ ok: true, reply, model });
  } catch (err) {
    const message2 = err instanceof Error ? err.message : "AI_FAILED";
    console.warn("[TNTH][AI] Chat thất bại:", message2);
    return NextResponse.json({ ok: false, error: message2 }, { status: 502 });
  }
}
